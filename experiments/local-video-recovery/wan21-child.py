"""One local Wan2.1 sample. Invoked only by the gated B supervisor, no HTTP service."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import traceback
from runlog import append, snapshot


def main():
    request=json.loads(Path(sys.argv[1]).read_text());out=Path(request['out']);cfg=request['profile'];rid=request['runId'];started=time.monotonic()
    def report(stage,**values):
        r={'runId':rid,'stage':stage,'elapsedSeconds':time.monotonic()-started,**values};append(out/'model-stages.jsonl',r);print(json.dumps(r),flush=True)
    report('bootstrap_started')
    source=Path(request['comfySource'])
    assert subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()==cfg['comfyCommit']
    # No network, downloads or custom nodes during execution.
    os.environ.pop('PYTORCH_CUDA_ALLOC_CONF',None)
    os.environ.update(HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',HF_HUB_DISABLE_TELEMETRY='1',COMFYUI_DISABLE_PRODUCT_TIPS='1',PYTHONDONTWRITEBYTECODE='1',PYTORCH_ALLOC_CONF='backend:native',OMP_NUM_THREADS='8',MKL_NUM_THREADS='8')
    sys.path.insert(0,str(source));sys.argv=['wan21-single']+cfg['comfyArgs']+['--base-directory',str(out/'comfy-runtime')]
    import comfy.options
    comfy.options.enable_args_parsing()
    import torch
    torch.set_num_threads(8);torch.backends.cudnn.benchmark=False;torch.backends.cuda.matmul.allow_tf32=False
    import comfy_kitchen as ck
    import comfy.sd as sd
    import comfy.utils as utils
    import comfy.sample as sample
    import comfy.model_management as mm
    import comfy.ops as ops
    import comfy.ldm.modules.attention as attention
    import comfy.ldm.wan.model as wan
    import comfy.text_encoders.t5 as t5
    from attention_policy import MathAttentionPolicy
    report('attention_policy_before_apply',state={'math':torch.backends.cuda.math_sdp_enabled(),'flash':torch.backends.cuda.flash_sdp_enabled(),'memoryEfficient':torch.backends.cuda.mem_efficient_sdp_enabled(),'cudnn':torch.backends.cuda.cudnn_sdp_enabled()})
    policy=MathAttentionPolicy(torch,ck,ops,attention,wan,t5)
    assert not mm.args.enable_triton_backend and mm.args.disable_async_offload and mm.args.disable_pinned_memory and mm.args.disable_dynamic_vram and mm.args.disable_cuda_graphs and mm.args.disable_comfy_compiler
    assert torch.backends.cuda.math_sdp_enabled() and not torch.backends.cuda.flash_sdp_enabled() and not torch.backends.cuda.mem_efficient_sdp_enabled() and not torch.backends.cuda.cudnn_sdp_enabled()
    assert all(not ck.registry.is_available(x) for x in ck.list_backends() if x!='eager')
    report('attention_policy_checked',state=policy.assert_intact(),scope='after Comfy initialization, before any model weights')
    torch.cuda.reset_peak_memory_stats()
    report('bootstrap_completed',torch=torch.__version__,cudaBuild=torch.version.cuda,backends=ck.list_backends(),attentionState=policy.assert_intact(),comfyArgs=cfg['comfyArgs'])
    with torch.inference_mode():
        cpu=torch.device('cpu')
        report('text_model_load_started')
        policy.assert_intact()
        clip=sd.load_clip([request['textEncoder']],clip_type=sd.CLIPType.WAN,model_options={'load_device':cpu,'offload_device':cpu,'initial_device':cpu},disable_dynamic=True)
        assert clip.patcher.load_device.type=='cpu' and clip.patcher.offload_device.type=='cpu'
        report('text_model_load_completed',device=str(clip.patcher.load_device),weightDtypes=[str(d) for d in clip.cond_stage_model.dtypes])
        report('positive_text_encoding_started')
        policy.assert_intact()
        positive=clip.encode_from_tokens_scheduled(clip.tokenize(cfg['prompt']))
        report('positive_text_encoding_completed')
        report('negative_text_encoding_started')
        policy.assert_intact()
        negative=clip.encode_from_tokens_scheduled(clip.tokenize(cfg['negativePrompt']))
        report('negative_text_encoding_completed')
        for conditioning in (positive,negative):
            assert torch.isfinite(conditioning[0][0]).all(), 'Non-finite text conditioning'
        del clip;mm.unload_all_models()
        report('diffusion_model_load_started')
        policy.assert_intact()
        model=sd.load_diffusion_model(request['diffusion'],model_options={'dtype':torch.bfloat16},disable_dynamic=True)
        assert model.model.model_config.unet_config['dim']==1536 and model.model.model_config.unet_config['image_model']=='wan2.1'
        assert model.model.model_config.sampling_settings['shift']==cfg['shift']
        report('diffusion_model_load_completed',dtype=str(model.model.get_dtype()))
        latent=torch.zeros([1,16,(cfg['frames']-1)//4+1,cfg['height']//8,cfg['width']//8],device='cpu',dtype=torch.float32)
        noise=sample.prepare_noise(latent,cfg['seed'])
        report('sampling_started',steps=cfg['steps'],seed=cfg['seed'],latentShape=list(latent.shape))
        policy.assert_intact()
        def progress(i,x0,x,total):
            policy.assert_intact();report('sampling_progress',step=i+1,totalSteps=total)
        latent=sample.sample(model,noise,cfg['steps'],cfg['cfg'],cfg['sampler'],cfg['scheduler'],positive,negative,latent,callback=progress,disable_pbar=True,seed=cfg['seed'])
        torch.cuda.synchronize();assert torch.isfinite(latent).all(),'Non-finite sampled latent'
        with (out/'sampled-latent.pt').open('xb') as f:torch.save(latent.cpu(),f);f.flush();os.fsync(f.fileno())
        report('sampling_completed',peakAllocatedBytes=torch.cuda.max_memory_allocated(),peakReservedBytes=torch.cuda.max_memory_reserved())
        del model,noise,positive,negative;mm.unload_all_models();torch.cuda.synchronize()
        report('vae_load_started')
        vae=sd.VAE(sd=utils.load_torch_file(request['vae'],safe_load=True),device=cpu,dtype=torch.float32)
        assert vae.latent_channels==16 and vae.device.type=='cpu'
        report('vae_load_completed',device=str(vae.device),dtype=str(vae.vae_dtype))
        report('vae_decode_started')
        # Reuse the existing VAE core once, bypassing sd.VAE.decode's automatic OOM->tiling retry.
        vae.prepare_decode(latent.shape)
        images=vae.first_stage_model.decode(latent.to(device=cpu,dtype=vae.vae_dtype))
        # Passive CPU observations before the original in-place normalization.
        # No decoder, precision, color transform or sampling setting changes.
        def distribution(t):
            t=t.detach().float().reshape(-1);finite=t[t.isfinite()]
            return {'count':t.numel(),'nanCount':int(t.isnan().sum()),
                    'positiveInfCount':int(t.isposinf().sum()),'negativeInfCount':int(t.isneginf().sum()),
                    'finiteMin':finite.min().item() if finite.numel() else None,
                    'finiteMax':finite.max().item() if finite.numel() else None,
                    'finiteMean':finite.mean().item() if finite.numel() else None,
                    'finiteStd':finite.std().item() if finite.numel() else None,
                    'finiteQuantiles':dict(zip(['0','.01','.05','.5','.95','.99','1'],
                       finite.quantile(finite.new_tensor([0,.01,.05,.5,.95,.99,1])).tolist())) if finite.numel() else None,
                    'belowMinusOneFraction':(t < -1).float().mean().item(),
                    'abovePlusOneFraction':(t > 1).float().mean().item()}
        snapshot(out/'pre-clamp-statistics.json',{'layout':'BCTHW','shape':list(images.shape),
                 'dtype':str(images.dtype),'device':str(images.device),'all':distribution(images),
                 'channels':[distribution(images[:,i]) for i in range(3)]})
        with (out/'pre-clamp-vae-output.pt').open('xb') as f:
            torch.save(images,f);f.flush();os.fsync(f.fileno())
        report('pre_clamp_observations_saved')
        assert torch.isfinite(images).all(),'Non-finite raw VAE output; stop before clamp'
        images=vae.process_output(images).movedim(1,-1)
        images=images.reshape(-1,images.shape[-3],images.shape[-2],images.shape[-1])
        assert list(images.shape)==[cfg['frames'],cfg['height'],cfg['width'],3] and torch.isfinite(images).all()
        report('vae_decode_completed',shape=list(images.shape),pixelMin=images.min().item(),pixelMax=images.max().item(),pixelStd=images.std().item())
        pixels=(images*255).round().clamp(0,255).to(torch.uint8).contiguous().cpu().numpy()
        from PIL import Image
        import hashlib
        frame_dir=out/'preencode-frames';frame_dir.mkdir()
        frame_manifest=[]
        for index,rgb in enumerate(pixels):
            path=frame_dir/f'{index:03d}.png';Image.fromarray(rgb).save(path)
            frame_manifest.append({'frame':index,'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
        snapshot(out/'preencode-frames.json',frame_manifest)
        report('preencode_frames_saved',count=len(frame_manifest),pixelFormat='rgb24',range='full0..255')
        report('video_encoding_started')
        cmd=['ffmpeg','-nostdin','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s',f"{cfg['width']}x{cfg['height']}",'-r',str(cfg['fps']),'-i','pipe:0','-an','-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-threads','2',str(out/'sample.mp4')]
        with os.fdopen(os.open(out/'ffmpeg-stdout.log',os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_DSYNC,0o600),'wb',buffering=0) as fo, os.fdopen(os.open(out/'ffmpeg-stderr.log',os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_DSYNC,0o600),'wb',buffering=0) as fe:
            r=subprocess.run(cmd,input=pixels.tobytes(),stdout=fo,stderr=fe,timeout=cfg['stageTimeoutSeconds']['video_encoding_started'])
        assert r.returncode==0,(out/'ffmpeg-stderr.log').read_text(errors='replace')
        report('video_encoding_completed',path=str(out/'sample.mp4'))
        snapshot(out/'model-result.json',{'runId':rid,'status':'SAMPLE_ENCODED_NOT_YET_VALIDATED','elapsedSeconds':time.monotonic()-started,'peakAllocatedBytes':torch.cuda.max_memory_allocated(),'peakReservedBytes':torch.cuda.max_memory_reserved(),'configuration':cfg,'samplingAttempts':1})
    report('child_completed')


if __name__=='__main__':
    try:main()
    except BaseException:
        traceback.print_exc();sys.exit(1)
