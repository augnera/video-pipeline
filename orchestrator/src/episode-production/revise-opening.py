"""Replace opening narration only; stream-copy the exact accepted video and retain originals."""
import pathlib,json,subprocess,hashlib,wave,math,re,numpy as np
R=pathlib.Path(__file__).resolve().parents[3];O=R/'orchestrator/output/microsoft-veo-skills-20261028-vp010';D=O/'opening-audio-revision';sr=22050
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def run(a,**kw):return subprocess.run(a,capture_output=True,check=True,**kw)
def readwave(p):
 with wave.open(str(p)) as w:
  assert (w.getframerate(),w.getnchannels(),w.getsampwidth())==(sr,1,2);return np.frombuffer(w.readframes(w.getnframes()),np.int16).copy()
def writewave(p,a):
 with wave.open(str(p),'wb') as w:w.setparams((1,2,sr,len(a),'NONE','not compressed'));w.writeframes(a.astype(np.int16).tobytes())
original=readwave(O/'voice/full-raw.wav');new=readwave(D/'opening-generated.wav');sourceEnd=len(new)/sr;join=158441
# Split only at the observed low-energy sentence boundary; never crop through a consonant.
specs=[dict(start=.15,end=2.77,targetSeconds=3.65,placeSeconds=0),dict(start=2.77,end=sourceEnd,targetSeconds=2.9,placeSeconds=4.0)]
parts=[]
for i,s in enumerate(specs):
 tempo=(s['end']-s['start'])/s['targetSeconds'];s['atempo']=tempo;s['preservesPitch']=True
 p=D/f'phrase-{i+1}-fit.wav';run(['ffmpeg','-v','error','-y','-i',str(D/'opening-generated.wav'),'-af',f"atrim=start={s['start']}:end={s['end']},asetpts=PTS-STARTPTS,atempo={tempo}",'-ar',str(sr),'-ac','1','-c:a','pcm_s16le',str(p)])
 a=readwave(p);parts.append(a);s['actualSamples']=len(a)
opening=np.zeros(join,np.float64)
for a,s in zip(parts,specs):
 start=round(s['placeSeconds']*sr);assert start+len(a)<=join;opening[start:start+len(a)]=a
# Match active-frame level to the old opening so the untouched remainder does not jump.
def active_rms(a):
 n=round(.02*sr);frames=np.pad(a.astype(float)/32768,(0,(-len(a))%n)).reshape(-1,n);r=np.sqrt(np.mean(frames*frames,axis=1));return float(np.sqrt(np.mean(frames[r>10**(-40/20)]**2)))
gainDb=20*math.log10(active_rms(original[:join])/active_rms(opening));assert abs(gainDb)<=3,(gainDb,'Requires review beyond bounded3dB matching')
opening*=10**(gainDb/20);assert abs(opening).max()<32767
revised=original.copy();revised[:join]=np.rint(opening).astype(np.int16);writewave(D/'voice-revised.wav',revised)
assert np.array_equal(revised[join:],original[join:])
# No VAD/word timing claim: measured whole-phrase activity used only for synchronization checks.
bounds=[]
for a,s in zip(parts,specs):
 ids=np.flatnonzero(abs(a.astype(float)/32768)>10**(-40/20));bounds.append(dict(startSeconds=s['placeSeconds']+ids[0]/sr,endSeconds=s['placeSeconds']+ids[-1]/sr))
assert abs(bounds[0]['startSeconds']-.225079365)<.25 and abs(bounds[1]['startSeconds']-4.191020408)<.25,bounds
bg=json.load(open(O/'bgm-config.json'));master=bg['masterGainDb'];duration=json.load(open(O/'timeline.json'))['durationInFrames']/30
vf=f'apad=whole_dur={duration},atrim=duration={duration},aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume={master}dB'
run(['ffmpeg','-v','error','-y','-i',str(D/'voice-revised.wav'),'-af',vf,'-c:a','pcm_s24le',str(D/'voice-component.wav')])
run(['ffmpeg','-v','error','-y','-i',str(D/'voice-revised.wav'),'-i',str(O/'bgm-stem.wav'),'-filter_complex',f'[0:a]apad=whole_dur={duration},atrim=duration={duration},aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[v];[v][1:a]amix=inputs=2:duration=first:normalize=0,volume={master}dB[m]','-map','[m]','-ar','48000','-ac','2','-c:a','pcm_s24le',str(D/'mixed-audio.wav')])
run(['ffmpeg','-v','error','-y','-i',str(D/'mixed-audio.wav'),'-c:a','aac','-b:a','192k',str(D/'mixed-audio.m4a')])
final=D/'microsoft-skills-audio-revised.mp4'
run(['ffmpeg','-v','error','-y','-i',str(O/'microsoft-skills-review.mp4'),'-i',str(D/'mixed-audio.m4a'),'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',str(final)])
run(['ffmpeg','-v','error','-y','-i',str(final),'-t','8','-c','copy',str(D/'opening-revised-8s.mp4')])
def video_hash(p):return hashlib.sha256(run(['ffmpeg','-v','error','-i',str(p),'-map','0:v:0','-c','copy','-f','h264','-']).stdout).hexdigest()
oldHash,newHash=video_hash(O/'microsoft-skills-review.mp4'),video_hash(final);assert oldHash==newHash
run(['ffmpeg','-v','error','-i',str(final),'-f','null','-'])
probe=json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(final)]).stdout);v=next(s for s in probe['streams'] if s['codec_type']=='video');assert int(v['nb_frames'])==4049
log=run(['ffmpeg','-hide_banner','-i',str(D/'mixed-audio.m4a'),'-af','ebur128=peak=true','-f','null','-']).stderr.decode();(D/'loudness.log').write_text(log);peak=float(re.findall(r'True peak:\s+Peak:\s+([-\d.]+)',log)[-1]);assert peak<0
before=json.load(open(D/'inputs.before.json'));assert all(sha(O/p)==h for p,h in before.items())
def pcm(p):return np.frombuffer(run(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ar','48000','-ac','2','-']).stdout,np.float32).reshape(-1,2)
oldMix,newMix=pcm(O/'mixed-audio.wav'),pcm(D/'mixed-audio.wav');start=round(7.25*48000);tailError=float(np.max(np.abs(oldMix[start:]-newMix[start:])));assert tailError<2e-6,tailError
result=dict(status='PRIVATE_REVIEW',changedRangeSeconds=[0,join/sr],newText='微软向6万人发出离职邀约。你的技能，还能保值多久？',generation='same approved IndexTTS2 voice/emotion/seed; one continuous25-character model chunk rather than separate first2 chunks',timeFit=specs,timeFitNote='Pitch-preserving slowing to fit unchanged picture/subtitle windows; no speech speedup, no text changes',activeLevelMatchingDb=gainDb,activityBounds=bounds,wordTimingPrecision='Not word forced alignment; ASR estimates and waveform activity evidence only',videoBitstreamUnchanged=True,videoH264Sha256=newHash,sourceVoiceTailSampleExact=True,unchangedVoiceFromSample=join,unchangedMixedPcmFromSeconds=7.25,mixedTailMaximumError=tailError,bgmStemUnchanged=True,subtitlesUnchanged=True,sourceFilesUnchanged=True,videoDurationSeconds=float(v['duration']),frameCount=int(v['nb_frames']),aacTruePeakDbfs=peak,fullDecode=True,originalFullVideo=str((O/'microsoft-skills-review.mp4').relative_to(R)),revisedFullVideo=str(final.relative_to(R)),subjectiveListening='NOT_EVALUATED',publicationReady=False)
(D/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False,indent=2))
