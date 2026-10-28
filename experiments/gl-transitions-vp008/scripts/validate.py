"""Decode every exported effect; endpoint/progress metrics, not an aesthetic classifier."""
import json, subprocess, pathlib, hashlib, numpy as np
root=pathlib.Path(__file__).resolve().parents[3];out=root/'orchestrator/output/day9-vp008';(out/'validation').mkdir(exist_ok=True)
def frames(p):
 r=subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True,check=True)
 return np.frombuffer(r.stdout,np.uint8).reshape(-1,640,360,3)
reference=frames(out/'previews/Fade.mp4')
for meta in sorted((out/'previews').glob('*.json')):
 r=json.loads(meta.read_text()); name=r['name']; result={'transitionId':'glt:'+name,'checkedAt':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),'scope':'Default params; 18 frame transition; 360x640 9:16; 30fps; labelled 30-frame MP4; deterministic input geometry and procedural textures','manualEvaluation':'NOT_EVALUATED'}
 try:
  if r['status']!='EXPORTED':raise RuntimeError(r.get('error','No export'))
  p=root/r['previewPath'];probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,nb_read_frames,duration','-of','json',str(p)]))['streams'][0]
  f=frames(p);a=f[:,55:].astype(np.float32);ref=reference[:,55:].astype(np.float32)
  endpoint=[float(np.abs(a[k]-ref[0 if k<7 else 29]).mean()) for k in [0,6,23,29]]
  # Independent expected field colours confirm A first, B last (not just equality to another shader).
  colour=[np.median(f[k,75:115,145:180],axis=(0,1)).tolist() for k in [0,29]]
  expected=[[33,72,119],[211,138,64]];colour_error=[float(np.abs(np.array(x)-y).max()) for x,y in zip(colour,expected)]
  delta=np.abs(a[1:]-a[:-1]).mean(axis=(1,2,3)); middle=a[7:23]
  progressDifference=float(np.minimum(np.abs(middle-ref[0]).mean(axis=(1,2,3)),np.abs(middle-ref[-1]).mean(axis=(1,2,3))).max())
  black=(f.max(axis=3)<10).mean(axis=(1,2));border=float((f[0,:,0].max(axis=1)<10).mean())
  failures=[]
  if (probe['width'],probe['height'],probe['r_frame_rate'],int(probe['nb_read_frames']))!=(360,640,'30/1',30):failures.append('Container geometry/fps/frame count mismatch')
  if max(endpoint)>3:failures.append('Endpoint mismatches control')
  if max(colour_error)>6:failures.append('Endpoint direction/colour mismatch')
  if progressDifference<1:failures.append('No measurable intermediate transition')
  result.update(status='FAILED' if failures else 'VERIFIED',failures=failures,media=probe,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),endpointMad=endpoint,transitionEndpointGuardMad=[float(np.abs(a[k]-ref[0 if k==6 else 29]).mean()) for k in [6,23]],endpointColourError=colour_error,intermediateDifferenceFromBothEndpoints=progressDifference,maxAdjacentFrameMad=float(delta.max()),middleBlackFractionMax=float(black[6:24].max()),unexpectedEndpointBlackBorder=border,extraTextureLoad='EXPORTED_WITH_REQUIRED_TEXTURES' if r['extraTextures'] else 'NOT_REQUIRED',warnings=['Middle dark/flash, internal transparency, border warps and flicker are effect-dependent: not automatically failed or aesthetically approved.'],manualChecks=['Naturalness at normal speed','Intentional vs unintended dark/flash/transparency','9:16 perceptual balance and possible local flicker'],reproducibility={'params':r['params'],'randomness':'Fixed shader defaults / deterministic UV hash; no varying seed or wall clock provided','textureHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (root/'experiments/gl-transitions-vp008/public').glob('*.png')}})
 except Exception as e:result.update(status='FAILED',failures=[str(e)[:3000]])
 (out/'validation'/f'{name}.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(name,result['status'],flush=True)
