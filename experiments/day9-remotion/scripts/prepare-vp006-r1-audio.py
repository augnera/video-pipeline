"""Prepare a single shared A/B audio stream from the designated default BGM."""
import json,subprocess,hashlib,math,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'orchestrator/output/day9-vp006-poc-r1';OLD=ROOT/'orchestrator/output/day9-vp006-poc'
def run(args):return subprocess.run(args,capture_output=True,text=True,check=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def loud(p):
 s=run(['ffmpeg','-hide_banner','-i',str(p),'-af','ebur128=peak=true','-f','null','-']).stderr
 return float(re.search(r'Integrated loudness:\s+I:\s+([-\d.]+)',s).group(1))
c=json.loads((ROOT/'orchestrator/config/music.json').read_text());bgm=ROOT/c['defaultBgmPath'];duration=json.loads((OLD/'sample-timeline.json').read_text())['durationSeconds'];voice=OLD/'sample-voice.wav'
probe=json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(bgm)]).stdout)
run(['ffmpeg','-v','error','-i',str(bgm),'-f','null','-'])
# -stream_loop repeats only if required; never changes original MP3.
run(['ffmpeg','-v','error','-y','-stream_loop','-1','-i',str(bgm),'-t',str(duration),'-ar','48000','-ac','2','-c:a','pcm_s24le',str(OUT/'bgm-selected.wav')])
v=loud(voice);m=loud(OUT/'bgm-selected.wav');gain=round(v-18-m,1)
run(['ffmpeg','-v','error','-y','-i',str(OUT/'bgm-selected.wav'),'-af',f'volume={gain}dB,afade=t=in:st=0:d=0.5,afade=t=out:st={duration-1}:d=1','-c:a','pcm_s24le',str(OUT/'bgm-stem.wav')])
run(['ffmpeg','-v','error','-y','-i',str(voice),'-i',str(OUT/'bgm-stem.wav'),'-filter_complex','[0:a]aresample=48000[v];[v][1:a]amix=inputs=2:duration=first:normalize=0,volume=-1.5dB[m]','-map','[m]','-ar','48000','-ac','2','-c:a','pcm_s24le',str(OUT/'mixed-audio.wav')])
run(['ffmpeg','-v','error','-y','-i',str(OUT/'mixed-audio.wav'),'-c:a','aac','-b:a','192k',str(OUT/'shared-ab-audio.m4a')])
config={'source':str(bgm.relative_to(ROOT)),'sourceSha256':sha(bgm),'probe':probe,'sourceOrigin':'剪映历史音乐，持有人指定默认','licenseStatus':'pending_verification','scope':'private local audition only','startSeconds':0,'requiredSeconds':duration,'repeatPolicy':'ffmpeg stream_loop -1 then trim to required duration','copiesNeeded':math.ceil(duration/float(probe['format']['duration'])),'loopActuallyNeeded':duration>float(probe['format']['duration']),'voiceSource':str(voice.relative_to(ROOT)),'voiceSourceSha256':sha(voice),'voiceLufs':v,'musicSegmentLufs':m,'targetMusicBelowVoiceLu':18,'musicGainDb':gain,'masterGainDb':-1.5,'fadeInSeconds':.5,'fadeOutSeconds':1,'abPolicy':'Encode AAC once; copy exactly the same audio packets into A and B. Original VP-006 files retained.'}
(OUT/'bgm-config.json').write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n');print(json.dumps(config,ensure_ascii=False,indent=2))
