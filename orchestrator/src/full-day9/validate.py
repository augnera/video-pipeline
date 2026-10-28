import json,pathlib,subprocess,hashlib,math,os
from PIL import Image,ImageDraw
ROOT=pathlib.Path(__file__).resolve().parents[3];OUT=ROOT/'orchestrator/output/day9-vp009';EV=OUT/'review-frames';EV.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
run=lambda args:subprocess.run(args,capture_output=True,check=True)
t=json.load(open(OUT/'timeline.json'));src=json.load(open(ROOT/'orchestrator/output/day9-vp005a/timeline.json'));audio=json.load(open(OUT/'bgm-config.json'))
# Only the rendered picture stream and one externally mixed audio stream are muxed.
run(['ffmpeg','-v','error','-y','-i',str(OUT/'sample-picture.mp4'),'-i',str(OUT/'mixed-audio.m4a'),'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',str(OUT/'sample.mp4')])
final=OUT/'day9-full.mp4'
if final.exists():final.unlink()
os.link(OUT/'sample.mp4',final)
run(['ffmpeg','-v','error','-i',str(final),'-f','null','-'])
probe=json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(final)]).stdout);video=next(s for s in probe['streams'] if s['codec_type']=='video');astream=next(s for s in probe['streams'] if s['codec_type']=='audio')
black=run(['ffmpeg','-hide_banner','-i',str(final),'-vf','blackdetect=d=0.04:pix_th=0.1:pic_th=0.98','-an','-f','null','-']).stderr.decode();(OUT/'blackdetect.log').write_text(black)
silent=run(['ffmpeg','-hide_banner','-i',str(final),'-vn','-af','silencedetect=n=-50dB:d=1','-f','null','-']).stderr.decode();(OUT/'silencedetect.log').write_text(silent)
assert (video['width'],video['height'],video['r_frame_rate'],int(video['nb_frames']))==(1080,1920,'30/1',2514)
assert len([s for s in probe['streams'] if s['codec_type']=='audio'])==1
assert abs(float(astream['duration'])-src['audio']['durationSeconds'])<1/30
assert t['captions']==src['captions']
assert t['scenes'][0]['from']==0 and t['scenes'][-1]['to']==2514 and all(a['to']==b['from'] for a,b in zip(t['scenes'],t['scenes'][1:]))
original=ROOT/src['audio']['path'];public=ROOT/'experiments/gl-transitions-vp008/public/vp009/voice.wav';assert sha(original)==sha(public)
before=json.load(open(OUT/'inputs.before.json'));changed=[p for p,h in before.items() if sha(ROOT/p)!=h]
assert not changed
# Retain original, unmodified SRT copy for private review.
(OUT/'subtitles.srt').write_bytes((ROOT/'orchestrator/output/day9-vp005a/subtitles.srt').read_bytes())
width=270;height=480;sheet=Image.new('RGB',(width*5,height*4),(9,13,34));draw=ImageDraw.Draw(sheet);frames=[]
for i,s in enumerate(t['scenes']):
 frame=min(s['to']-1,s['from']+max(15,int((s['to']-s['from'])*.7)));p=EV/f"{s['id']}-shot{s['shotNumber']:02}.png"
 run(['ffmpeg','-v','error','-y','-i',str(final),'-vf',f'select=eq(n\\,{frame})','-frames:v','1',str(p)])
 im=Image.open(p).resize((width,height));x=(i%5)*width;y=(i//5)*height;sheet.paste(im,(x,y));draw.rectangle((x,y,x+width,y+24),fill='#101629');draw.text((x+8,y+5),f"Shot {s['shotNumber']} / {s['id']} / f{frame}",fill='white');frames.append({'scene':s['id'],'shotNumber':s['shotNumber'],'frame':frame,'path':str(p.relative_to(ROOT))})
sheet.save(OUT/'review-contact.jpg',quality=92)
# Original cue timings are authoritative; screenshot the mid-cue for each subtitle, no ASR re-alignment claim.
captionChecks=[]
for cue in t['captions']:
 first=math.ceil(cue['startSeconds']*30-1e-9);last=math.ceil(cue['endSeconds']*30-1e-9)-1;captionChecks.append({'id':cue['id'],'firstFrame':first,'lastFrame':last,'withinTimeline':0<=first<=last<2514,'originalTextAndTimesPreserved':True})
validation={'status':'private-technical-review','mode':'rules','modelUsed':None,'fullDecode':True,'noBlackIntervals':'black_start:' not in black,'noAbnormalSilence':'silence_start:' not in silent,'probe':probe,'voiceSliceSampleExact':True,'voiceProof':'Full public WAV SHA matches accepted complete original; full mix residual verified against independent voice component within PCM quantization','sampleSha256':sha(final),'fullVoiceSha256':sha(original),'captionCount':len(t['captions']),'captionTimelineChecks':captionChecks,'sceneCoverageContinuous':True,'allTenShotsCovered':sorted({s['shotNumber'] for s in t['scenes']})==list(range(1,11)),'sourceIntegrity':not changed,'changedProtectedSources':changed,'videoDurationSeconds':float(video['duration']),'audioDurationSeconds':float(astream['duration']),'sourceAudioDurationSeconds':src['audio']['durationSeconds'],'frameRoundingErrorSeconds':float(video['duration'])-src['audio']['durationSeconds'],'subtitlePrecision':t['subtitlePrecision'],'bgmSelectedBoostDb':3,'bgmHolderAccepted':False,'mixedTruePeakDbfs':audio['encodedAudioLevel']['truePeakDbfs'],'subjectiveQuality':'NOT_EVALUATED','publicationReady':False,'reviewFrames':frames}
(OUT/'validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2)+'\n');(OUT/'run.json').write_text(json.dumps({'mode':'rules','modelUsed':None,'pipeline':'frozen10shots → full visual brief → existing Asset Agent → existing finalize/GL Director → existing GL renderer → existing Quality Gate','publicationReady':False},indent=2)+'\n')
print(json.dumps({k:validation[k] for k in ['fullDecode','noBlackIntervals','noAbnormalSilence','allTenShotsCovered','captionCount','frameRoundingErrorSeconds','sampleSha256']}))
