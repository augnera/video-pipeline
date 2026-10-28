"""Bounded delivery checks for VP-006; never starts models or rewrites frozen inputs."""
from pathlib import Path
import hashlib,json,re,subprocess,wave
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'orchestrator/output/day9-vp006-poc'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_entries','format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels,duration,nb_read_frames','-of','json',str(p)]))
def run(args):return subprocess.run(args,capture_output=True,text=True,check=True)
def loud(p):
 txt=run(['ffmpeg','-hide_banner','-i',str(p),'-map','0:a:0','-af','ebur128=peak=true','-f','null','-']).stderr
 return {'integratedLufs':float(re.search(r'Integrated loudness:\s+I:\s+([-\d.]+)',txt).group(1)),'truePeakDbfs':float(re.search(r'True peak:\s+Peak:\s+([-\d.]+)',txt).group(1))}
def frames(p):
 txt=run(['ffmpeg','-v','error','-i',str(p),'-map','0:v:0','-f','framemd5','-']).stdout
 return [s for s in txt.splitlines() if s and not s.startswith('#')]
timeline=json.loads((OUT/'sample-timeline.json').read_text());start=timeline['globalStartSeconds']
protected=json.loads((OUT/'protected-inputs.before.json').read_text())
preserve={p:{'beforeSha256':h,'afterSha256':sha(ROOT/p) if (ROOT/p).exists() else None,'unchanged':h==sha(ROOT/p) if (ROOT/p).exists() else False} for p,h in protected.items()}
assert all(x['unchanged'] for x in preserve.values())
with wave.open(str(ROOT/'local-assets/voice/experiments/day9-g4/day9-preview.wav'),'rb') as a,wave.open(str(OUT/'sample-voice.wav'),'rb') as b:
 a.setpos(round(start*a.getframerate()));exactVoice=a.readframes(b.getnframes())==b.readframes(b.getnframes());assert exactVoice
# Preserve text and offset-only subtitle timing.
srt=(ROOT/'orchestrator/output/day9-vp005a/subtitles.srt').read_text()
original=[]
def sec(t):
 h,m,s=t.replace(',','.').split(':');return int(h)*3600+int(m)*60+float(s)
for block in srt.strip().split('\n\n'):
 lines=block.splitlines();a,b=lines[1].split(' --> ');original.append({'id':int(lines[0]),'start':sec(a),'end':sec(b),'text':'\n'.join(lines[2:])})
selected=[c for c in original if c['start']>=start-.001 and c['end']<=timeline['globalEndSeconds']+.001]
assert [c['text'] for c in selected]==[c['text'] for c in timeline['captions']]
def fmt(t):
 ms=round(t*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000);return f'{h:02}:{m:02}:{s:02},{ms:03}'
(OUT/'sample-subtitles.srt').write_text('\n\n'.join(f"{i+1}\n{fmt(max(0,c['start']-start))} --> {fmt(c['end']-start)}\n{c['text']}" for i,c in enumerate(selected))+'\n')
metadata={}
for name in ['sample-with-bgm.mp4','sample-no-bgm.mp4']:
 p=OUT/name;run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'])
 black=run(['ffmpeg','-hide_banner','-i',str(p),'-an','-vf','blackdetect=d=0.05:pix_th=0.01:pic_th=0.98','-f','null','-']).stderr
 metadata[name]={'sha256':sha(p),'probe':probe(p),'fullDecode':True,'loudness':loud(p),'blackIntervalsDetected':bool(re.search(r'black_start:',black))}
for name in ['mixkit-39839.mp4','mixkit-39854.mp4']:
 run(['ffmpeg','-v','error','-i',str(OUT/'assets'/name),'-f','null','-'])
videoEqual=frames(OUT/'sample-with-bgm.mp4')==frames(OUT/'sample-no-bgm.mp4');assert videoEqual
silence=run(['ffmpeg','-hide_banner','-i',str(OUT/'sample-mixed.wav'),'-af','silencedetect=noise=-60dB:d=0.5','-f','null','-']).stderr
silences=re.findall(r'silence_(?:start|end):[^\r\n]+',silence)
report={'status':'technical-checks-passed; holder-review-pending','sampleDurationSeconds':timeline['durationSeconds'],'protectedInputs':preserve,'voiceSliceByteExact':exactVoice,'subtitleCueCount':len(selected),'subtitleTextMatchesOriginal':True,'subtitleTiming':'original phrase timing; only global sample offset applied; no forced alignment claim','videoStreamsEqualBetweenVariants':videoEqual,'outputs':metadata,'mixWav':{'probe':probe(OUT/'sample-mixed.wav'),'sha256':sha(OUT/'sample-mixed.wav'),'loudness':loud(OUT/'sample-mixed.wav')},'silenceAtMinus60DbForHalfSecond':silences,'assetVideoFullDecode':True,'contractTests':'12 passed; see contract-tests.log','typecheck':'PoC TS compile passed with noUnusedLocals disabled; strict project has pre-existing unused Day9FullClean import in Vp005aRoot.tsx','sourceScope':'2 web-stock candidates; 1 selected, existing AI image reused, original Remotion card catalogued for shot5 only; user camera/screen video absent','humanQualityReview':'pending; not self-certified better than VP-005A','gpuModelsStarted':False,'published':False}
(OUT/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'voiceExact':exactVoice,'subtitles':len(selected),'sameVideo':videoEqual,'mix':report['mixWav']['loudness'],'outputs':{k:v['probe'] for k,v in metadata.items()},'silence':silences},ensure_ascii=False,indent=2))
