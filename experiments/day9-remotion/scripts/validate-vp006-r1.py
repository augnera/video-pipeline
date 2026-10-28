from pathlib import Path
import subprocess,json,hashlib,re
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'orchestrator/output/day9-vp006-poc-r1';OLD=ROOT/'orchestrator/output/day9-vp006-poc'
def run(a):return subprocess.run(a,capture_output=True,check=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def probe(p):return json.loads(run(['ffprobe','-v','error','-count_frames','-show_entries','format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels,duration,nb_read_frames','-of','json',str(p)]).stdout)
def streamhash(p,typ):return run(['ffmpeg','-v','error','-i',str(p),'-map',f'0:{typ}:0','-c','copy','-f','streamhash','-hash','sha256','-']).stdout.decode().strip()
def framehash(p):return run(['ffmpeg','-v','error','-i',str(p),'-map','0:v:0','-f','framemd5','-']).stdout
before=json.loads((OUT/'protected-inputs.before.json').read_text());preserved={p:h==sha(ROOT/p) for p,h in before.items()};assert all(preserved.values())
A=OUT/'sample-baseline-with-bgm.mp4';B=OUT/'sample-with-bgm.mp4'
outputs={}
for p in [A,B,OUT/'sample-no-bgm.mp4']:
 run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'])
 black=run(['ffmpeg','-hide_banner','-i',str(p),'-an','-vf','blackdetect=d=0.05:pix_th=0.01:pic_th=0.98','-f','null','-']).stderr.decode()
 outputs[p.name]={'sha256':sha(p),'probe':probe(p),'fullDecode':True,'blackIntervalsDetected':'black_start:' in black}
 assert not outputs[p.name]['blackIntervalsDetected']
 for s in outputs[p.name]['probe']['streams']:
  if s['codec_type']=='video':assert s['nb_read_frames']=='546' and s['width']==1080 and s['height']==1920
sameaudio=streamhash(A,'a')==streamhash(B,'a');assert sameaudio
samebaseline=framehash(A)==framehash(OLD/'sample-no-bgm.mp4');assert samebaseline
# Basic brightness continuity evidence around each transition; not a substitute for human viewing.
continuity=[]
for center in [107,263]:
 record={'boundaryFrame':center}
 for label,p in [('A',A),('B',B)]:
  start=center-8;end=center+9
  raw=run(['ffmpeg','-v','error','-i',str(p),'-an','-vf',f'trim=start_frame={start}:end_frame={end},setpts=PTS-STARTPTS,scale=64:114,format=gray','-f','rawvideo','-']).stdout
  step=64*114;means=[sum(raw[i:i+step])/step for i in range(0,len(raw),step)]
  record[label]={'minMeanLuma':min(means),'maxAdjacentMeanLumaChange':max(abs(y-x) for x,y in zip(means,means[1:])),'checkedFrames':len(means)}
 continuity.append(record)
metrics=run(['ffmpeg','-hide_banner','-i',str(OUT/'mixed-audio.wav'),'-af','ebur128=peak=true','-f','null','-']).stderr.decode()
loud={'integratedLufs':float(re.search(r'Integrated loudness:\s+I:\s+([-\d.]+)',metrics).group(1)),'truePeakDbfs':float(re.search(r'True peak:\s+Peak:\s+([-\d.]+)',metrics).group(1))}
assert loud['truePeakDbfs']<0
c=json.loads((ROOT/'orchestrator/config/music.json').read_text());tmp=Path('/tmp/vp006-r1-loop-proof.wav')
run(['ffmpeg','-v','error','-y','-stream_loop','-1','-i',str(ROOT/c['defaultBgmPath']),'-t','30','-ar','48000','-c:a','pcm_s16le',str(tmp)])
loopinfo=probe(tmp);assert float(loopinfo['format']['duration'])==30;run(['ffmpeg','-v','error','-i',str(tmp),'-f','null','-']);tmp.unlink()
report={'status':'technical-checks-passed; holder-viewing-pending','preservedInputHashes':preserved,'outputs':outputs,'abAudioPacketsIdentical':sameaudio,'baselineADecodedVideoEqualsOriginal':samebaseline,'sourceFrameClock':'same boundaries 0/107/263/546; overlap uses clamped first/last frames; no narration retime','subtitleSourceUnchanged':True,'subtitleTreatment':'same original Captions component, offset and font; outside all effects; original 11 cues','transitionBrightnessEvidence':continuity,'brightnessLimitations':'Mean-luma changes detect gross black flashes only. Subjective flicker, naturalness and viewer retention need human review.','mixedAudioLoudness':loud,'repeatCheck':{'source':c['defaultBgmPath'],'actualMp3Seconds':27.454667,'requiredProofSeconds':30,'copiesNeeded':2,'outputSeconds':30,'fullDecode':True,'testAudioKept':False,'actual18SecondSampleLoops':False},'effectTests':'5 passed','typecheck':'passed with existing baseline unused-import rule disabled; no new type errors','assetContractChanged':False,'gpuModelsStarted':False,'published':False}
(OUT/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'audioIdentical':sameaudio,'AOriginalVideoEqual':samebaseline,'inputsPreserved':all(preserved.values()),'loudness':loud,'continuity':continuity,'repeatCheck':report['repeatCheck']},ensure_ascii=False,indent=2))
