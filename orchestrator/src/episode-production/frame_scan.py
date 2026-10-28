"""Whole-video deterministic visibility proxies. No OCR/aesthetic certification."""
import json,pathlib,subprocess,sys,numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[3]
REQUEST=json.load(open(sys.argv[sys.argv.index('--request')+1])) if '--request' in sys.argv else None
OUT=pathlib.Path(REQUEST['out']) if REQUEST else ROOT/'orchestrator/output/microsoft-veo-skills-20261028-vp010'
t=REQUEST['timeline'] if REQUEST else json.load(open(OUT/'timeline.json'))
VIDEO=pathlib.Path(REQUEST['video']) if REQUEST else OUT/'microsoft-skills-review.mp4'
b=subprocess.check_output(['ffmpeg','-v','error','-i',str(VIDEO),'-vf','scale=108:192','-pix_fmt','rgb24','-f','rawvideo','-'])
f=np.frombuffer(b,np.uint8).reshape(-1,192,108,3);assert len(f)==t['durationInFrames']
black=f.max(axis=3)<4
blankFrames=np.flatnonzero(f.std(axis=(1,2,3))<1).tolist()
blackFrames=np.flatnonzero(black.mean(axis=(1,2))>.99).tolist()
# Treat tiny codec edge ringing and the intentional navy window surround separately from solid black bars.
edges={'left':black[:,:,:2].mean(axis=(1,2)),'right':black[:,:,-2:].mean(axis=(1,2)),'top':black[:,:2,:].mean(axis=(1,2)),'bottom':black[:,-2:,:].mean(axis=(1,2))}
edgeFrames={k:np.flatnonzero(v>.99).tolist() for k,v in edges.items()}
checks=[]
for c in t['captions']:
 frame=min(len(f)-1,int(((c['startSeconds']+c['endSeconds'])/2)*30));white=(f[frame,162:181,8:100].min(axis=2)>190).sum();checks.append({'id':c['id'],'frame':frame,'brightCaptionPixelsAt108x192':int(white),'glyphPresenceProxy':bool(white>2),'textAndTimingAuthority':'frozen original SRT and timeline; this is not OCR'})
rect=REQUEST.get('captionRect',{'x':76,'y':1628,'width':904,'height':200}) if REQUEST else {'x':76,'y':1628,'width':904,'height':200}
# Validate glyph presence at native resolution: downscaling51px Chinese glyphs to5px loses bright strokes.
selected=[c['frame'] for c in checks];expr='+'.join(f'eq(n\\,{i})' for i in selected)
native=subprocess.check_output(['ffmpeg','-v','error','-i',str(VIDEO),'-vf',f"select={expr},crop={rect['width']}:{rect['height']}:{rect['x']}:{rect['y']}",'-vsync','0','-pix_fmt','rgb24','-f','rawvideo','-'])
captionImages=np.frombuffer(native,np.uint8).reshape(len(checks),rect['height'],rect['width'],3)
for c,im in zip(checks,captionImages):
 c['nativeBrightGlyphPixels']=int((im.min(axis=2)>220).sum());c['glyphPresenceProxy']=c['nativeBrightGlyphPixels']>20;c['note']='Native caption box tested; tiny108px whole-frame thumbnail is not used as a legibility threshold.'
# Native23.976fps stock may repeat one frame at30fps; only long runs would be suspicious.
mad=np.abs(f[1:].astype(np.int16)-f[:-1].astype(np.int16)).mean(axis=(1,2,3));run=best=0
for n in mad:run=run+1 if n==0 else 0;best=max(best,run)
r={'decodedFrames':len(f),'blankFrames':blankFrames,'nearBlackFrames':blackFrames,'solidBlackEdgeFrames':edgeFrames,'captionChecks':checks,'allCuesHaveVisibleGlyphProxy':all(x['glyphPresenceProxy'] for x in checks),'maximumIdenticalFrameRun':best+1,'maxAdjacentFrameMadAt108x192':float(mad.max()),'flickerAesthetics':'NOT_EVALUATED','blackEdgeLimit':'Only solid nearly-zero two-column/row bands detected; intentional blue window margins are not classified as black bars. This does not classify every local dark area.','modelUsed':None}
(OUT/'frame-scan.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k not in ['captionChecks']}))
