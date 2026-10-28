"""Full-duration continuation of VP007's +3 dB audition mix. Originals untouched."""
import json,pathlib,subprocess,hashlib,math,re,numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[3];OUT=ROOT/'orchestrator/output/day9-vp009'
voice=ROOT/'local-assets/voice/experiments/day9-g4/day9-preview.wav';music=ROOT/'local-assets/music/bgm/AI科技新时代1.mp3'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def run(args,**kw):return subprocess.run(args,capture_output=True,check=True,**kw)
def raw(path,filters=None):
 args=['ffmpeg','-v','error','-i',str(path)]
 if filters:args+=['-af',filters]
 b=run(args+['-ar','48000','-ac','2','-f','f32le','-']).stdout
 return np.frombuffer(b,np.float32).reshape(-1,2).copy()
def loud(path):
 s=run(['ffmpeg','-hide_banner','-i',str(path),'-af','ebur128=peak=true','-f','null','-']).stderr.decode();(OUT/(path.name+'.loudness.log')).write_text(s)
 return {'integratedLufs':float(re.findall(r'Integrated loudness:\s+I:\s+([-\d.]+)',s)[-1]),'truePeakDbfs':float(re.findall(r'True peak:\s+Peak:\s+([-\d.]+)',s)[-1])}
source=json.load(open(ROOT/'orchestrator/output/day9-vp005a/timeline.json'));duration=source['audio']['durationSeconds'];sr=48000;count=round(duration*sr)
original=raw(music);overlap=round(1.0*sr);copies=1;loop=original.copy();joins=[]
while len(loop)<count:
 at=len(loop)-overlap;t=np.linspace(0,1,overlap,endpoint=True,dtype=np.float64);left=np.cos(t*np.pi/2)[:,None];right=np.sin(t*np.pi/2)[:,None]
 cross=(loop[-overlap:]*left+original[:overlap]*right).astype(np.float32);loop=np.concatenate([loop[:-overlap],cross,original[overlap:]]);copies+=1;joins.append({'startSample':at,'endSample':at+overlap,'startSeconds':at/sr,'endSeconds':(at+overlap)/sr})
loop=loop[:count]
run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(sr),'-ac','2','-i','-','-c:a','pcm_s24le',str(OUT/'bgm-looped.wav')],input=loop.tobytes())
baseline=json.load(open(ROOT/'orchestrator/output/day9-vp007/bgm-config.json'));boost=3;gain=baseline['baselineMusicGainDb']+boost;master=baseline['masterGainDb']
run(['ffmpeg','-v','error','-y','-i',str(OUT/'bgm-looped.wav'),'-af',f'volume={gain}dB,afade=t=in:st=0:d=0.5,afade=t=out:st={duration-1}:d=1','-c:a','pcm_s24le',str(OUT/'bgm-stem.wav')])
# Explicit fltp stereo retains the same mono->stereo matrix in both mix and reference.
voice_filter=f'aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume={master}dB'
run(['ffmpeg','-v','error','-y','-i',str(voice),'-af',voice_filter,'-c:a','pcm_s24le',str(OUT/'voice-component.wav')])
run(['ffmpeg','-v','error','-y','-i',str(voice),'-i',str(OUT/'bgm-stem.wav'),'-filter_complex',f'[0:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[v];[v][1:a]amix=inputs=2:duration=first:normalize=0,volume={master}dB[m]','-map','[m]','-ar','48000','-ac','2','-c:a','pcm_s24le',str(OUT/'day9-mixed-audio.wav')])
run(['ffmpeg','-v','error','-y','-i',str(OUT/'day9-mixed-audio.wav'),'-c:a','aac','-b:a','192k',str(OUT/'mixed-audio.m4a')])
v=raw(OUT/'voice-component.wav');bg=raw(OUT/'bgm-stem.wav')*10**(master/20);mix=raw(OUT/'day9-mixed-audio.wav');n=min(len(v),len(bg),len(mix));err=float(np.max(np.abs(mix[:n]-bg[:n]-v[:n])))
def rms(a):return 20*math.log10(max(1e-12,float(np.sqrt(np.mean(a.astype(float)**2)))))
margins=[]
for i in range(0,n-3*sr+1,sr):
 vr=rms(v[i:i+3*sr]);br=rms(bg[i:i+3*sr]);
 if vr>-45:margins.append({'startSeconds':i/sr,'voiceRmsDbfs':vr,'musicRmsDbfs':br,'marginDb':vr-br})
for j in joins:
 for which in ['start','end']:
  i=j[which+'Sample'];j[which+'AdjacentStepMax']=float(np.max(np.abs(loop[i]-loop[i-1])))
  j[which+'RmsChangeDb']=rms(loop[i:i+4800])-rms(loop[i-4800:i])
 j['method']='Equal-power1s crossfade; continuous endpoints; not a claimed beat alignment'
voiceLevel=loud(voice);musicLevel=loud(OUT/'bgm-looped.wav');mixLevel=loud(OUT/'day9-mixed-audio.wav');aacLevel=loud(OUT/'mixed-audio.m4a')
config={'source':str(music.relative_to(ROOT)),'sourceSha256':sha(music),'sourceOrigin':'剪映历史常用音乐，持有人提供','licenseStatus':'pending_verification','scope':'private local review only','selectedBoostDb':3,'holderAccepted':False,'selectionReason':'VP009 instruction defaults to +3dB audition when no explicit accepted gain exists','baselineMusicGainDb':baseline['baselineMusicGainDb'],'masterGainDb':master,'voiceLevel':voiceLevel,'musicLevel':musicLevel,'decodedSourceSeconds':len(original)/sr,'requiredSeconds':duration,'loopCopies':copies,'crossfadeSeconds':1,'fadeInSeconds':.5,'fadeOutSeconds':1,'variants':[{'boostDb':3,'gainDb':gain,'mixedLevel':aacLevel,'margins':{'minThreeSecondRmsMarginDb':min(x['marginDb'] for x in margins),'meanMarginDb':float(np.mean([x['marginDb'] for x in margins])),'windows':len(margins)},'mixFile':'day9-mixed-audio.wav'}],'stemChecks':{'voiceComponentSameWithinPcmQuantization':err<2e-6,'maxAbsolutePcmError':err,'voiceSourceSha256':sha(voice),'method':'Subtract independently retained music stem*master from full mix and compare to unchanged source resampling/matrix/master reference'},'mixWavLevel':mixLevel,'encodedAudioLevel':aacLevel,'joins':joins,'speechWindows':margins,'subjectiveIntelligibility':'NOT_EVALUATED','loopListening':'NOT_EVALUATED'}
(OUT/'bgm-config.json').write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n');(OUT/'loop-validation.json').write_text(json.dumps({'crossfadeSeconds':1,'joins':joins,'noSampleDiscontinuityAtExactJoins':all(j['startAdjacentStepMax']<.1 and j['endAdjacentStepMax']<.1 for j in joins),'clipping':aacLevel['truePeakDbfs']>=0,'musicalSeamQuality':'NOT_EVALUATED','note':'Numerical seam continuity does not establish rhythm/melody continuity'},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'copies':copies,'gainDb':gain,'masterDb':master,'wavLevel':mixLevel,'aacLevel':aacLevel,'voiceError':err,'minimumSpeechMarginDb':config['variants'][0]['margins']['minThreeSecondRmsMarginDb']}))
if aacLevel['truePeakDbfs']>=0 or err>=2e-6:raise RuntimeError('Audio technical validation failed; no silent automatic gain changes')
