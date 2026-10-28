"""Full-episode checks using the VP009 FFmpeg/scan method and current authoritative timeline."""
import json,pathlib,subprocess,hashlib,math,os,numpy as np
from PIL import Image,ImageDraw
R=pathlib.Path(__file__).resolve().parents[3];O=R/'orchestrator/output/microsoft-veo-skills-20261028-vp010';(O/'review-frames').mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
run=lambda a:subprocess.run(a,capture_output=True,check=True)
t=json.load(open(O/'timeline.json'));a=json.load(open(O/'bgm-config.json'));F=t['durationInFrames'];duration=F/30
run(['ffmpeg','-v','error','-y','-i',str(O/'sample-picture.mp4'),'-i',str(O/'mixed-audio.m4a'),'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',str(O/'sample.mp4')])
final=O/'microsoft-skills-review.mp4'
if final.exists():final.unlink()
os.link(O/'sample.mp4',final)
run(['ffmpeg','-v','error','-i',str(final),'-f','null','-'])
p=json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(final)]).stdout);v=next(s for s in p['streams'] if s['codec_type']=='video');av=next(s for s in p['streams'] if s['codec_type']=='audio')
assert (v['width'],v['height'],v['r_frame_rate'],int(v['nb_frames']))==(1080,1920,'30/1',F)
assert len([s for s in p['streams'] if s['codec_type']=='audio'])==1 and abs(float(av['duration'])-duration)<1/30
assert t['scenes'][0]['from']==0 and t['scenes'][-1]['to']==F and all(s['to']==n['from'] for s,n in zip(t['scenes'],t['scenes'][1:]))
before=json.load(open(O/'inputs.before.json'));changed=[p for p,h in before.items() if sha(R/p)!=h];assert not changed
script=json.load(open(O/'script.normalized.json'));assert ''.join(s['narration'] for s in script['shots'])==''.join(c['text'] for c in t['captions'])
black=run(['ffmpeg','-hide_banner','-i',str(final),'-vf','blackdetect=d=0.04:pix_th=0.1:pic_th=0.98','-an','-f','null','-']).stderr.decode();(O/'blackdetect.log').write_text(black)
silent=run(['ffmpeg','-hide_banner','-i',str(final),'-vn','-af','silencedetect=n=-50dB:d=1','-f','null','-']).stderr.decode();(O/'silencedetect.log').write_text(silent)
frames=[];sheet=Image.new('RGB',(270*5,480*math.ceil(len(t['scenes'])/5)),(9,13,34))
# Sparse key frames are decoded once. -vsync0 prevents duplicate outputs across sparse selections.
selected=[min(s['to']-1,s['from']+max(1,int((s['to']-s['from'])*.65))) for s in t['scenes']]
expr='+'.join(f'eq(n\\,{i})' for i in selected)
raw=run(['ffmpeg','-v','error','-i',str(final),'-vf',f'select={expr},scale=270:480','-vsync','0','-pix_fmt','rgb24','-f','rawvideo','-']).stdout
ims=np.frombuffer(raw,np.uint8).reshape(len(selected),480,270,3)
for i,(s,f,im) in enumerate(zip(t['scenes'],selected,ims)):
 path=O/f"review-frames/{s['id']}.jpg";image=Image.fromarray(im);image.save(path);sheet.paste(image,((i%5)*270,(i//5)*480));frames.append(dict(scene=s['id'],frame=f,path=str(path.relative_to(R))))
sheet.save(O/'review-contact.jpg',quality=92)
sourceVoice=O/'voice/full-raw.wav';public=R/'experiments/gl-transitions-vp008/public/vp010/full-raw.wav';assert sha(sourceVoice)==sha(public)
voiceDur=float(json.loads(run(['ffprobe','-v','error','-show_format','-of','json',str(sourceVoice)]).stdout)['format']['duration'])
validation=dict(status='private-technical-review',mode='rules',modelUsed=None,fullDecode=True,noBlackIntervals='black_start:' not in black,noAbnormalSilence='silence_start:' not in silent,probe=p,voiceSliceSampleExact=a['stemChecks']['voiceComponentSameWithinPcmQuantization'],voiceProof='Full WAV hash matches public narration; independently retained voice component residual is within PCM quantization; unchanged 25-shot text',sampleSha256=sha(final),fullVoiceSha256=sha(sourceVoice),captionCount=len(t['captions']),sceneCoverageContinuous=True,all25ShotsCovered=sorted(set(s['shotNumber'] for s in t['scenes']))==list(range(1,26)),sourceIntegrity=not changed,changedProtectedSources=changed,videoDurationSeconds=float(v['duration']),audioDurationSeconds=float(av['duration']),sourceAudioDurationSeconds=voiceDur,closingHoldFrames=24,frameRoundingErrorSeconds=duration-voiceDur-.8,subtitlePrecision='Sentence-level synthesis chunk provenance + measured audio activity; not word forced alignment. ASR cross-check has uncertainties.',bgmSelectedBoostDb=3,bgmHolderAccepted=False,mixedTruePeakDbfs=a['encodedAudioLevel']['truePeakDbfs'],subjectiveQuality='NOT_EVALUATED',publicationReady=False,reviewFrames=frames)
(O/'validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2)+'\n');(O/'run.json').write_text(json.dumps(dict(mode='rules',modelUsed=None,pipeline='25 frozen shots → intent brief → inspected assets → second arrangement / verified GL selector → existing Remotion → existing Quality Gate',publicationReady=False),indent=2))
print(json.dumps({k:validation[k] for k in ['fullDecode','all25ShotsCovered','noBlackIntervals','noAbnormalSilence','videoDurationSeconds','frameRoundingErrorSeconds']}))
