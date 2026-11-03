"""CANCELLED experiment; retained for failure audit and CPU import regression.

The parent preserves STOP/evidence, limits its own child's RSS/runtime and logs
every stage. The actual fixed Comfy VAE.decode is used; its exception handler
is made fail-closed so that OOM cannot trigger a tiled second attempt.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import traceback

from runlog import append, snapshot, metadata, now

ROOT = Path(__file__).resolve().parents[2]
CONTROL = ROOT / 'local-assets/experiments/video-recovery-20261029'


def install_cuda_guard(torch, attempts):
    # Dynamo indexes these APIs by object identity with different rule types.
    # Keep each refusal callable distinct; do not edit Dynamo or its rule map.
    def make_denial(name):
        def deny(*args, **kwargs):
            attempts.append({'utc': now(), 'api': name})
            raise RuntimeError('CUDA initialization/use prohibited: ' + name)
        return deny
    for name in ('init', '_lazy_init', 'current_device', 'set_device'):
        setattr(torch.cuda, name, make_denial(name))


def sha(path):
    with Path(path).open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def mem_available():
    return int(next(s.split()[1] for s in Path('/proc/meminfo').read_text().splitlines()
                    if s.startswith('MemAvailable:'))) * 1024


def child(a):
    out = a.out
    started = time.monotonic()
    def report(stage, **kw):
        record = dict(runId=out.name, stage=stage,
                      elapsedSeconds=time.monotonic()-started, **kw)
        append(out/'stages.jsonl', record)
        print(json.dumps(record), flush=True)

    report('cpu_bootstrap_started')
    import torch
    attempts = []
    install_cuda_guard(torch, attempts)
    assert not torch.cuda.is_initialized() and not torch.cuda.is_available()
    torch.set_num_threads(8)
    request = json.loads(a.request.read_text())
    source = Path(request['comfySource'])
    assert subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip() == request['profile']['comfyCommit']
    sys.path.insert(0, str(source))
    sys.argv = ['cpu-reference', '--cpu', '--cpu-vae', '--fp32-vae',
                '--disable-async-offload', '--disable-dynamic-vram',
                '--disable-pinned-memory', '--disable-fast-disk',
                '--disable-cuda-malloc', '--disable-comfy-compiler',
                '--disable-cuda-graphs', '--disable-triton-backend',
                '--disable-xformers', '--disable-all-custom-nodes', '--offline',
                '--base-directory', str(out/'comfy-runtime')]
    import comfy.options
    comfy.options.enable_args_parsing()
    import comfy_kitchen as ck
    for backend in ck.list_backends():
        if backend != 'eager': ck.registry.disable(backend)
    ck.registry.set_priority(['eager'])
    import comfy.sd as sd
    import comfy.utils as utils
    import comfy.model_management as mm
    import inspect
    assert mm.get_torch_device().type == 'cpu'
    assert not torch.cuda.is_initialized()
    reference = inspect.getsource(sd.VAE.decode)
    (out/'reference-decode-source.py.txt').write_text(reference)
    report('cpu_bootstrap_completed', torch=torch.__version__, device=str(mm.get_torch_device()),
           cudaInitialized=torch.cuda.is_initialized(), threads=torch.get_num_threads(),
           referenceSourceSha256=hashlib.sha256(reference.encode()).hexdigest())
    latent_path = Path(request['out'])/'sampled-latent.pt'
    latent = torch.load(latent_path, map_location='cpu', weights_only=True)
    assert list(latent.shape) == [1, 16, 5, 56, 32]
    assert latent.dtype == torch.float32 and torch.isfinite(latent).all()
    report('latent_checked', sha256=sha(latent_path), shape=list(latent.shape), dtype=str(latent.dtype))
    def persist_tensor(path, tensor):
        with path.open('xb') as f:
            torch.save(tensor, f); f.flush(); os.fsync(f.fileno())
    def stats(t):
        t = t.detach().float().reshape(-1)
        finite = t[torch.isfinite(t)]
        return {'count': t.numel(), 'nanCount': int(torch.isnan(t).sum()),
                'positiveInfCount': int(torch.isposinf(t).sum()),
                'negativeInfCount': int(torch.isneginf(t).sum()),
                'finiteMin': finite.min().item() if finite.numel() else None,
                'finiteMax': finite.max().item() if finite.numel() else None,
                'finiteMean': finite.mean().item() if finite.numel() else None,
                'finiteStd': finite.std().item() if finite.numel() else None,
                'finiteQuantiles': dict(zip(['0','0.01','0.05','0.5','0.95','0.99','1'],
                    torch.quantile(finite, torch.tensor([0.,.01,.05,.5,.95,.99,1.])).tolist())) if finite.numel() else None,
                'belowMinusOneFraction': (t < -1).float().mean().item(),
                'abovePlusOneFraction': (t > 1).float().mean().item()}
    with torch.inference_mode():
        report('vae_load_started', path=request['vae'], sha256=sha(request['vae']))
        vae = sd.VAE(sd=utils.load_torch_file(request['vae'], safe_load=True),
                     device=torch.device('cpu'), dtype=torch.float32)
        assert vae.latent_channels == 16 and vae.device.type == 'cpu'
        assert vae.output_device.type == 'cpu'
        estimate = int(vae.memory_used_decode(latent.shape, vae.vae_dtype))
        assert mem_available() > max(16*1024**3, estimate + 8*1024**3)
        report('vae_load_completed', decodeEstimateBytes=estimate,
               availableBytes=mem_available(), dtype=str(vae.vae_dtype),
               decoderClass=type(vae.first_stage_model).__name__)
        # Keep the real reference success path unchanged. Any caught exception
        # is re-raised at its first handler, before its OOM retry branch.
        def abort_any_exception(exc):
            raise exc
        mm.raise_non_oom = abort_any_exception
        original_core = vae.first_stage_model.decode
        original_output = vae.process_output
        calls = {'coreDecode': 0, 'processOutput': 0}
        def core(*args, **kwargs):
            calls['coreDecode'] += 1
            assert calls['coreDecode'] == 1, 'Second decode prohibited'
            return original_core(*args, **kwargs)
        vae.first_stage_model.decode = core
        def capture(raw):
            calls['processOutput'] += 1
            assert calls['processOutput'] == 1
            # Capture before the reference mutates it with add_/div_/clamp_.
            persist_tensor(out/'raw-vae-output.pt', raw.detach().clone())
            result = {'layout':'BCTHW', 'shape':list(raw.shape), 'dtype':str(raw.dtype),
                      'all': stats(raw), 'channels':[stats(raw[:,i]) for i in range(3)]}
            snapshot(out/'raw-output-statistics.json', result)
            report('raw_output_saved', statisticsPath=str(out/'raw-output-statistics.json'))
            assert torch.isfinite(raw).all(), 'Non-finite raw VAE output; stop before clamp/encode'
            return original_output(raw)
        vae.process_output = capture
        report('reference_vae_decode_started')
        images = vae.decode(latent)
        assert calls == {'coreDecode':1, 'processOutput':1}
        assert list(images.shape) == [1,17,448,256,3] and torch.isfinite(images).all()
        report('reference_vae_decode_completed', calls=calls)
        images = images.reshape(17,448,256,3)
        persist_tensor(out/'preencode-rgb-float.pt', images)
        pixels = (images*255).round().clamp(0,255).to(torch.uint8).contiguous().numpy()
        from PIL import Image
        frames = out/'preencode-frames'; frames.mkdir()
        manifest = []
        for i, rgb in enumerate(pixels):
            path = frames/f'{i:03d}.png'; Image.fromarray(rgb).save(path)
            manifest.append({'frame':i, 'path':str(path), 'sha256':sha(path)})
        snapshot(out/'preencode-frames.json', manifest)
        report('preencode_frames_saved', count=17, pixelFormat='rgb24', range='full 0..255')
        command = ['ffmpeg','-nostdin','-v','error','-f','rawvideo','-pix_fmt','rgb24',
                   '-s','256x448','-r','16','-i','pipe:0','-an',
                   '-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709',
                   '-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-threads','2',
                   '-color_range','tv','-colorspace','bt709','-color_primaries','bt709',
                   '-color_trc','bt709',str(out/'cpu-reference.mp4')]
        snapshot(out/'encoding-command.json', {'argv':command,
                 'note':'Explicit full RGB -> limited YUV BT.709; original MP4 had unspecified color tags. Not color grading.'})
        report('video_encoding_started')
        with (out/'ffmpeg-stdout.log').open('xb',buffering=0) as fo, (out/'ffmpeg-stderr.log').open('xb',buffering=0) as fe:
            p = subprocess.run(command, input=pixels.tobytes(), stdout=fo, stderr=fe, timeout=30)
        assert p.returncode == 0, 'FFmpeg failed, no retry'
        assert not torch.cuda.is_initialized() and not attempts
        snapshot(out/'decode-result.json', {'runId':out.name, 'result':'CPU_REFERENCE_DECODE_ENCODE_COMPLETED',
                 'elapsedSeconds':time.monotonic()-started, 'cudaInitialized':False,
                 'cudaAttemptCount':len(attempts), 'modelSamplingCount':0,
                 'coreVaeDecodeCount':calls['coreDecode'], 'precision':'CPU FP32',
                 'originalDecodePrecision':'CPU FP32 (original sampling was GPU BF16)',
                 'video':str(out/'cpu-reference.mp4'), 'humanReview':'NOT_EVALUATED'})
        report('child_completed')


def parent(a):
    a.out.mkdir(parents=True, exist_ok=False)
    state = metadata(a.out.name, a)
    state.update(workload='one_cpu_reference_vae_decode_no_sampling',
                 limits={'timeoutSeconds':180,'maxChildRssBytes':12*1024**3,
                         'minimumAvailableBeforeBytes':16*1024**3,'minimumAvailableDuringBytes':8*1024**3})
    state['stagesAvailable'] = {'vae_decode':True,'video_encode':True,'cuda_probe':False,'sampling':False}
    snapshot(a.out/'run.json', state)
    req = json.loads(a.request.read_text()); old = Path(req['out']).parent
    files = [p for p in old.rglob('*') if p.is_file()]
    files += [CONTROL/'STOP.json', CONTROL/'cuda-attempts.jsonl']
    preserved = {str(p):sha(p) for p in files}
    snapshot(a.out/'preservation-before.json', preserved)
    try:
        assert mem_available() >= 16*1024**3, 'Insufficient CPU memory headroom'
        reference = json.loads((old/'archive-source-manifest.json').read_text())
        latent = Path(req['out'])/'sampled-latent.pt'
        assert sha(latent) == reference['wsl-run/sample/sampled-latent.pt']
        assert sha(req['vae']) == '2fc39d31359a4b0a64f55876d8ff7fa8d780956ae2cb13463b0223e15148976b'
        snapshot(a.out/'preflight.json', {'utc':now(),'availableBytes':mem_available(),
                 'latentPath':str(latent),'latentSha256':sha(latent),'vaePath':req['vae'],
                 'vaeSha256':sha(req['vae']),'sourceCommit':req['profile']['comfyCommit'],
                 'stopSha256':sha(CONTROL/'STOP.json'),'productionWanStop':True})
        command = [str(CONTROL/'venv/bin/python'),'-u','-B',str(Path(__file__).resolve()),
                   '--child','--request',str(a.request.resolve()),'--out',str(a.out.resolve())]
        env = {**os.environ, 'CUDA_VISIBLE_DEVICES':'-1', 'PYTHONDONTWRITEBYTECODE':'1',
               'OMP_NUM_THREADS':'8','MKL_NUM_THREADS':'8','HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1'}
        snapshot(a.out/'execution-command.json', {'argv':command,
                 'environmentOverrides':{k:env[k] for k in ['CUDA_VISIBLE_DEVICES','PYTHONDONTWRITEBYTECODE','OMP_NUM_THREADS','MKL_NUM_THREADS','HF_HUB_OFFLINE','TRANSFORMERS_OFFLINE']}})
        with os.fdopen(os.open(a.out/'stdout.log',os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_DSYNC,0o600),'wb',buffering=0) as fo, os.fdopen(os.open(a.out/'stderr.log',os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_DSYNC,0o600),'wb',buffering=0) as fe:
            p = subprocess.Popen(command, stdout=fo, stderr=fe, env=env,
                                 start_new_session=True, preexec_fn=lambda:os.nice(10))
            state.update(childPid=p.pid);snapshot(a.out/'run.json',state)
            start = time.monotonic(); peak = 0
            try:
                while p.poll() is None:
                    status = Path(f'/proc/{p.pid}/status')
                    rss = int(next((s.split()[1] for s in status.read_text().splitlines() if s.startswith('VmRSS:')), '0'))*1024 if status.exists() else 0
                    peak = max(peak,rss)
                    available = mem_available()
                    append(a.out/'cpu-memory.jsonl', {'runId':a.out.name,'childRssBytes':rss,'availableBytes':available})
                    assert rss <= 12*1024**3 and available >= 8*1024**3, 'CPU memory safety limit'
                    assert time.monotonic()-start < 180, 'CPU trial deadline; no retry'
                    time.sleep(1)
                assert p.returncode == 0, 'CPU child failed; no retry; inspect stderr/stages'
                state.update(status='CPU_DECODE_COMPLETED_PENDING_COMPARISON',childExitCode=p.returncode,
                             peakSampledChildRssBytes=peak)
            finally:
                if p.poll() is None:
                    os.killpg(p.pid,signal.SIGTERM)
                    try:p.wait(timeout=3)
                    except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
    except BaseException as exc:
        state.update(status='STOP_INCOMPLETE',error=str(exc))
        snapshot(a.out/'STOP.json', {'runId':a.out.name,'utc':now(),'reason':str(exc),'automaticRetry':False})
        raise
    finally:
        after = {p:sha(p) for p in preserved}
        changed = [p for p in preserved if after[p] != preserved[p]]
        snapshot(a.out/'preservation-after.json', {'files':after,'changedFiles':changed})
        state.update(endedAt=now(), originalEvidenceUnchanged=not changed)
        snapshot(a.out/'run.json',state)
    print(json.dumps({'runId':a.out.name,'status':state['status'],'originalEvidenceUnchanged':not changed}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--child',action='store_true',help=argparse.SUPPRESS)
    args = parser.parse_args()
    parser.error('Reference re-decode experiment cancelled: no effective decoding difference. '
                 'Use check-cpu-import.py only for the no-weights import regression.')
    try:
        if args.child: child(args)
        else: parent(args)
    except BaseException:
        traceback.print_exc();sys.exit(1)
