"""One-shot CPU-only sd.cpp experiment. No production integration or retries."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import threading
import time

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE.parent / 'local-video-recovery'))
from runlog import append, snapshot, now, new_id


def sha(p):
    h = hashlib.sha256()
    with Path(p).open('rb') as f:
        for b in iter(lambda: f.read(1024 * 1024), b''):
            h.update(b)
    return h.hexdigest()


def resources(pgid=None):
    mem = {}
    for line in Path('/proc/meminfo').read_text().splitlines():
        k, v = line.split(':', 1)
        mem[k] = int(v.strip().split()[0]) * 1024
    procs = []
    for p in Path('/proc').iterdir():
        if not p.name.isdigit():
            continue
        try:
            stat = (p / 'stat').read_text().rsplit(')', 1)[1].split()
            if pgid is not None and int(stat[2]) == pgid:
                status = dict(x.split(':', 1) for x in (p / 'status').read_text().splitlines() if ':' in x)
                procs.append({'pid': int(p.name), 'rssBytes': int(status.get('VmRSS', '0 kB').split()[0]) * 1024,
                              'cpuTicks': int(stat[11]) + int(stat[12])})
        except (OSError, ValueError, IndexError):
            pass
    return {'utc': now(), 'availableBytes': mem['MemAvailable'], 'swapUsedBytes': mem['SwapTotal'] - mem['SwapFree'],
            'loadAverage': list(os.getloadavg()), 'processes': procs, 'processTreeRssBytes': sum(p['rssBytes'] for p in procs)}


def stop_group(pid):
    try:
        os.killpg(pid, signal.SIGTERM)
    except ProcessLookupError:
        return
    time.sleep(2)
    try:
        os.killpg(pid, signal.SIGKILL)
    except ProcessLookupError:
        pass


def main():
    a = argparse.ArgumentParser()
    a.add_argument('--prompt', required=True)
    a.add_argument('--negativePrompt', default='people, text, letters, logos, illustration, cartoon, anime, painting, blurry, distorted objects, watermark')
    a.add_argument('--seed', type=int, default=20261103)
    a.add_argument('--width', type=int, default=256)
    a.add_argument('--height', type=int, default=448)
    a.add_argument('--frames', type=int, default=17)
    a.add_argument('--fps', type=int, default=16)
    a.add_argument('--outputDir', required=True)
    a.add_argument('--timeout', type=int, default=1800)
    a.add_argument('--threads', type=int, default=16)
    a.add_argument('--label', choices=['A', 'B'], default='A')
    args = a.parse_args()
    if args.width % 16 or args.height % 16 or args.frames % 4 != 1 or args.frames < 1 or args.fps <= 0:
        a.error('Wan experiment requires dimensions divisible by16, frames=4n+1, positive fps')
    if not 1 <= args.threads <= 16 or not 0 < args.timeout <= (1800 if args.label == 'A' else 3600):
        a.error('Thread or deadline exceeds authorized experiment budget')
    cfg = json.loads((HERE / 'components.local.json').read_text())
    binary = HERE / 'build-cpu/bin/sd-cli'
    evidence = json.loads((HERE / 'evidence/build-proof.json').read_text())
    if sha(binary) != evidence['binarySha256'] or not evidence['cpuOnlyBuild']:
        raise RuntimeError('CPU binary proof missing or changed')
    for c in cfg['components']:
        if sha(c['path']) != c['sha256']:
            raise RuntimeError('Component hash mismatch: ' + c['role'])
    baseline = resources()
    if baseline['availableBytes'] < 48 * 1024**3 or baseline['swapUsedBytes'] > 1024**3:
        raise RuntimeError('Insufficient host memory or existing swap pressure; no inference launched')
    out = Path(args.outputDir).resolve() / new_id()
    out.mkdir(parents=True, exist_ok=False)
    # Single-use opportunities survive a crash; never delete or clear automatically.
    latch = HERE / 'runs' / ('sample-' + args.label + '.attempt.json')
    latch.parent.mkdir(parents=True, exist_ok=True)
    with latch.open('x') as f:
        json.dump({'runId': out.name, 'outputDir': str(out), 'utc': now(), 'automaticRetry': False}, f)
        f.flush(); os.fsync(f.fileno())
    comps = {c['role']: c['path'] for c in cfg['components']}
    cmd = [str(binary), '-M', 'vid_gen', '--diffusion-model', comps['diffusion'], '--vae', comps['vae'],
           '--t5xxl', comps['text_encoder'], '--backend', 'cpu', '--params-backend', 'cpu', '--auto-fit', 'off',
           '-t', str(args.threads), '-p', args.prompt, '-n', args.negativePrompt, '--seed', str(args.seed),
           '-W', str(args.width), '-H', str(args.height), '--video-frames', str(args.frames), '--fps', str(args.fps),
           '--steps', '30', '--cfg-scale', '6', '--sampling-method', 'euler', '--scheduler', 'discrete',
           '--flow-shift', '3', '-v', '-o', str(out / 'frame_%03d.png')]
    # Native unbuffered/line-buffered output, no framework imports or GPU discovery.
    cmd = ['stdbuf', '-oL', '-eL'] + cmd
    meta = {'runId': out.name, 'status': 'RUNNING', 'startedAt': now(), 'endedAt': None, 'launcherPid': os.getpid(),
            'engineCommit': evidence['engineCommit'], 'engineSha256': evidence['binarySha256'], 'model': cfg,
            'params': vars(args), 'command': cmd, 'softwareEncoding': 'ffmpeg libx264 yuv420p',
            'temperature': {'status': 'NOT_RECORDED', 'reason': 'No validated CPU temperature sensor'},
            'unsupportedDiagnostics': ['Final latent export', 'VAE pre-clamp NaN/Inf statistics'],
            'wrapperSha256': sha(__file__), 'gpuStopFiles': evidence['stopFiles'], 'automaticRetry': False}
    snapshot(out / 'result.json', meta)
    stages = out / 'stages.jsonl'
    append(stages, {'runId': out.name, 'stage': 'launcher_started', 'command': cmd})
    started = time.monotonic()
    env = dict(os.environ, OMP_NUM_THREADS=str(args.threads), OPENBLAS_NUM_THREADS=str(args.threads), CUDA_VISIBLE_DEVICES='')
    child = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True, env=env)
    meta['pid'] = child.pid
    snapshot(out / 'process.json', {'pid': child.pid, 'pgid': child.pid, 'startedAt': now(), 'runId': out.name})
    reason = None
    log_errors = []
    seen = set()
    state_lock = threading.Lock()
    def pump(pipe, name):
        try:
            with (out / name).open('xb', buffering=0) as f:
                while True:
                    b = os.read(pipe.fileno(), 4096)
                    if not b: break
                    f.write(b); os.fsync(f.fileno())
                    s = b.decode(errors='replace')
                    with state_lock:
                        append(stages, {'runId': out.name, 'stage': 'engine_output', 'stream': name, 'text': s})
                        if re.search(r'(?:using|on|backend[: =]+)\s*(?:CUDA|Vulkan|SYCL|OpenCL|Metal)\d*\b', s, re.I):
                            seen.add('GPU_BACKEND_DETECTED')
        except Exception as e:
            log_errors.append(str(e))
        finally:
            pipe.close()
    pumps = [threading.Thread(target=pump, args=(child.stdout, 'stdout.log')), threading.Thread(target=pump, args=(child.stderr, 'stderr.log'))]
    for t in pumps: t.start()
    peak = 0; bad = 0; max_swap = baseline['swapUsedBytes']; minimum = baseline['availableBytes']
    def interrupt(sig, frame):
        nonlocal reason
        reason = 'CONTROLLED_STOP'
    old = {s: signal.signal(s, interrupt) for s in (signal.SIGTERM, signal.SIGINT)}
    try:
        while child.poll() is None:
            r = resources(child.pid); append(out / 'resources.jsonl', r)
            peak = max(peak, r['processTreeRssBytes']); max_swap = max(max_swap, r['swapUsedBytes']); minimum = min(minimum, r['availableBytes'])
            unhealthy = r['availableBytes'] < 16 * 1024**3 or r['processTreeRssBytes'] > 64 * 1024**3 or r['swapUsedBytes'] - baseline['swapUsedBytes'] > 2 * 1024**3
            bad = bad + 1 if unhealthy else 0
            if time.monotonic() - started >= args.timeout: reason = 'TIMEOUT'
            if bad >= 3: reason = 'RESOURCE_STOP'
            if 'GPU_BACKEND_DETECTED' in seen: reason = 'GPU_BACKEND_DETECTED'
            if log_errors: reason = 'LOG_ERROR'
            if reason:
                append(stages, {'runId': out.name, 'stage': 'stop_requested', 'reason': reason}); stop_group(child.pid); break
            time.sleep(2)
        child.wait()
        for t in pumps: t.join()
        meta.update(returnCode=child.returncode, elapsedSeconds=time.monotonic()-started, peakProcessTreeRssBytes=peak,
                    minimumAvailableBytes=minimum, maxSwapUsedBytes=max_swap, stopReason=reason, logErrors=log_errors)
        if child.returncode or reason: raise RuntimeError(reason or 'Engine exited nonzero')
        images = sorted(out.glob('frame_*.png'))
        if len(images) != args.frames: raise RuntimeError('Unexpected output frame count: ' + str(len(images)))
        append(stages, {'stage': 'software_encoding_started', 'frames': len(images)})
        # Image sequence numbering is probed, not assumed zero-based.
        first = int(images[0].stem.rsplit('_', 1)[1])
        enc = ['ffmpeg', '-v', 'error', '-hwaccel', 'none', '-framerate', str(args.fps), '-start_number', str(first),
               '-i', str(out / 'frame_%03d.png'), '-frames:v', str(args.frames), '-c:v', 'libx264', '-threads', '4',
               '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', str(out / 'sample.mp4')]
        remaining = max(.1, args.timeout-(time.monotonic()-started))
        with (out/'encoding.stdout.log').open('xb') as so, (out/'encoding.stderr.log').open('xb') as se:
            encoder = subprocess.Popen(enc, stdout=so, stderr=se, start_new_session=True)
            meta['encodingCommand'] = enc
            while encoder.poll() is None:
                if reason or time.monotonic()-started >= args.timeout:
                    reason = reason or 'TIMEOUT'
                    stop_group(encoder.pid); encoder.wait(); raise RuntimeError(reason + ' during encoding')
                time.sleep(.1)
            if encoder.returncode: raise RuntimeError('Software encoding failed')
        probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', str(out/'sample.mp4')]))
        snapshot(out/'ffprobe.json', probe)
        stream = next(s for s in probe['streams'] if s['codec_type']=='video')
        if int(stream['nb_read_frames']) != args.frames or (stream['width'], stream['height']) != (args.width,args.height):
            raise RuntimeError('Encoded dimensions or frame count mismatch')
        subprocess.run(['ffmpeg','-v','error','-hwaccel','none','-i',str(out/'sample.mp4'),'-f','null','-'],check=True,timeout=30)
        meta.update(status='SUCCESS', videoPath=str(out/'sample.mp4'), videoSha256=sha(out/'sample.mp4'),
                    losslessFrames=[{'path':str(images[i]),'sha256':sha(images[i])}for i in [0,len(images)//2,len(images)-1]],
                    inferenceSeconds=meta['elapsedSeconds'], elapsedSeconds=time.monotonic()-started,
                    qualityHuman='NOT_EVALUATED', repeatedReliability='NOT_EVALUATED', productionSuitability='NOT_EVALUATED')
    except BaseException as e:
        if child.poll() is None: stop_group(child.pid); child.wait()
        for t in pumps: t.join(timeout=5)
        meta.update(status='TIMEOUT' if reason=='TIMEOUT' or 'TIMEOUT' in str(e) else 'FAILED', error=repr(e), returnCode=child.returncode,
                    elapsedSeconds=time.monotonic()-started, peakProcessTreeRssBytes=peak, stopReason=reason)
        snapshot(out/'STOP.json', {'runId':out.name,'reason':str(e),'utc':now(),'automaticRetry':False})
    finally:
        for s,f in old.items(): signal.signal(s,f)
        meta.update(endedAt=now(), logPath=str(out), sourceStopFilesUnchanged=all(sha(x['path'])==x['sha256']for x in evidence['stopFiles']))
        snapshot(out/'result.json', meta); append(stages, {'runId':out.name,'stage':'launcher_finished','status':meta['status']})
    print(json.dumps({'runId':out.name,'status':meta['status'],'result':str(out/'result.json')},ensure_ascii=False),flush=True)
    return 0 if meta['status']=='SUCCESS' else 1


if __name__ == '__main__':
    sys.exit(main())
