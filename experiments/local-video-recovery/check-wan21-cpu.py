"""Check fixed Comfy APIs, CLI and an existing FP8 slice; never initializes CUDA."""
import inspect
import json
from pathlib import Path
import struct
import sys
from runlog import snapshot

root=Path(__file__).resolve().parents[2]
out=Path(json.loads((root/'orchestrator/output/local-video-recovery-20261029/stage-b/current-run.json').read_text())['out'])
cfg=json.loads(Path(__file__).with_name('wan21-profile.json').read_text())
sys.path.insert(0,'/home/chen/ai-models/ComfyUI')
sys.argv=['cpu-interface-check']+cfg['comfyArgs']+['--base-directory',str(out/'cpu-check-runtime')]
import comfy.options
comfy.options.enable_args_parsing()
from comfy.cli_args import args
assert args.lowvram and args.disable_async_offload and args.disable_pinned_memory and args.disable_dynamic_vram and args.disable_cuda_malloc
# Validate the real profile first, then override only this CPU-check process's device mode.
args.lowvram=False;args.cpu=True
import torch
import comfy_kitchen as ck
for k in ck.list_backends():
    if k!='eager':ck.registry.disable(k)
ck.registry.set_priority(['eager'])
import comfy.sd as sd
import comfy.sample as sample
import comfy.model_management as mm
assert not torch.cuda.is_initialized()
assert all(not ck.registry.is_available(k) for k in ck.list_backends() if k!='eager')
p=Path('/home/chen/ai-models-data/wan/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors')
with p.open('rb') as f:
    n=struct.unpack('<Q',f.read(8))[0];h=json.loads(f.read(n));key=next(k for k,v in h.items() if v.get('dtype')=='F8_E4M3');lo,hi=h[key]['data_offsets'];f.seek(8+n+lo);data=bytearray(f.read(min(4096,hi-lo)))
x=torch.frombuffer(data,dtype=torch.float8_e4m3fn)
from comfy_kitchen.backends.eager.quantization import dequantize_per_tensor_fp8
y=dequantize_per_tensor_fp8(x,torch.tensor(1.0),output_type=torch.float32)
assert torch.isfinite(y).all()
latent=torch.zeros([1,16,(cfg['frames']-1)//4+1,cfg['height']//8,cfg['width']//8],device='cpu')
noise=sample.prepare_noise(latent,cfg['seed']);assert noise.shape==latent.shape
assets=json.loads((out/'assets.json').read_text())
diff=next(a for a in assets if 'diffusion_models' in a['file'])
with Path(diff['path']).open('rb') as f:
    n=struct.unpack('<Q',f.read(8))[0];header=json.loads(f.read(n))
meta={k:torch.empty(v['shape'],device='meta',dtype=torch.bfloat16) for k,v in header.items() if k!='__metadata__'}
import comfy.model_detection as detection
import comfy.utils as utils
prefix=detection.unet_prefix_from_state_dict(meta)
meta=utils.state_dict_prefix_replace(meta,{prefix:''},filter_keys=True)
detected=detection.model_config_from_unet(meta,'')
assert detected.unet_config['dim']==1536 and detected.unet_config['image_model']=='wan2.1'
result={'cpuOnly':True,'cudaInitialized':torch.cuda.is_initialized(),'torch':torch.__version__,'profileArgumentsParsedBeforeCpuOverride':True,'cpuOverride':{'lowvram':False,'cpu':True},'asyncOffloadDisabled':args.disable_async_offload,'pinnedMemoryDisabled':args.disable_pinned_memory,'dynamicVramDisabled':args.disable_dynamic_vram,'cudaMallocAsyncDisabled':args.disable_cuda_malloc,'backends':ck.list_backends(),'fp8CpuDequantizationFinite':True,'testedElements':x.numel(),'latentShape':list(latent.shape),'sampleSignature':str(inspect.signature(sample.sample)),'vaePrepareDecodeSignature':str(inspect.signature(sd.VAE.prepare_decode)),'modelSampling':'NOT_RUN','fullTextEncoding':'NOT_RUN'}
snapshot(out/'cpu-interface-check.json',result)
result.update(modelHeaderDetection=type(detected).__name__,modelDimension=detected.unet_config['dim'],headerDetectionDevice='meta (no model data loaded)',cudaGraphsDisabled=args.disable_cuda_graphs,comfyCompilerDisabled=args.disable_comfy_compiler)
snapshot(out/'cpu-interface-check.json',result)
print(json.dumps(result,default=str,indent=2))
