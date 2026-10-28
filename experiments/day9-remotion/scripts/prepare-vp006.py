"""VP-006 bounded PoC metadata + local render inputs; no model or service starts."""
from pathlib import Path
import json, hashlib, subprocess, shutil, datetime
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'orchestrator/output/day9-vp006-poc'
PUB=ROOT/'experiments/day9-remotion/public/vp006';PUB.mkdir(exist_ok=True)
def save(p,d): p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def probe(p): return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
model='gpt-6.1-sol (Codex current multimodal session; actual view_image contact-sheet inspection; no external inference API)'
videoLicense='https://mixkit.co/license/modal/videoFree/'
licenseEvidence=['orchestrator/output/day9-vp006-poc/sources/mixkit-video-free-license.html']
def license_(name,url,statusAllowed,restrictions,evidence=[]):
 return dict(name=name,sourceUrl=url,verifiedAt='2026-10-28',restrictions=restrictions,localExperimentAllowed=statusAllowed,attributionRequired=None,evidenceFiles=evidence)
stocklic=license_('Mixkit Stock Video Free License',videoLicense,True,['Use within edited video, no standalone resale or public stock redistribution.','Third-party logos/brands require separate review; not implying actor identity or endorsement.','Only 2 downloads for this PoC; no mass download or competitive stock service.'],licenseEvidence)
assets=[]
def asset(id,type,path,desc,actions,mood,tags,lic,ls,frames,facts,inferences,uncertainty,source=None,creator=None,generation=None):
 p=ROOT/path; info=probe(p);v=next(s for s in info['streams'] if s['codec_type']=='video');isimage=p.suffix.lower() in ['.png','.jpg','.jpeg'];dur=None if isimage else float(info['format']['duration']);fps=None if isimage else eval(v['r_frame_rate'],{'__builtins__':{}},{})
 a=dict(assetId=id,sourceType=type,mediaType='image' if isimage else 'video',localPath=path,sha256=sha(p),sourceUrl=source,creator=creator,license=lic,licenseStatus=ls,durationSeconds=dur,width=v['width'],height=v['height'],fps=fps,description=desc,actions=actions,mood=mood,tags=tags,usableSegments=[] if isimage else [dict(start=0,end=dur)],reviewStatus='pending_human',aspectRatio=v['width']/v['height'],analysis=dict(model=model,analyzedAt=now,frameEvidence=[dict(path=f,timestampSeconds=t,sha256=sha(ROOT/f)) for f,t in frames],facts=facts,inferences=inferences,uncertainty=uncertainty),generation=generation)
 assets.append(a);return a
for i in [39839,39854]:
 slug={39839:'man-working-on-computer-in-an-office-at-night-39839',39854:'exhausted-man-working-in-an-office-overtime-39854'}[i]
 if i==39839:
  facts=['A person in a light shirt, tie and glasses sits at a desk facing a large monitor.','Hands near keyboard/mouse across sampled frames; head direction changes slightly.','Dim office, front-side view; monitor occupies right foreground.']
  desc='昏暗办公室内，一名穿浅色衬衫、领带并戴眼镜的人坐在桌前操作电脑；右侧为大显示器。'
  actions=['坐着操作电脑','轻微转头'];infer=['画面可表达持续工作；疲劳仅是语境推测，不是可验证健康事实。'];mood=['沉静（推测）']
 else:
  facts=['Rear three-quarter view of person in light shirt at computer desk.','At 2–6 seconds hand reaches glasses/face; glasses are removed and head lowers.','At 8–10 seconds the person returns attention/hands toward desk.','Vertical frame; screen on right, face in upper-middle region.']
  desc='竖屏办公室背侧视角：桌前人物抬手摘下眼镜，低头触碰眼部附近，随后回到桌面方向。'
  actions=['摘眼镜','低头触碰眼部附近','回到桌面'];infer=['动作可作为疲惫/眼部不适的视觉隐喻，不能证明疾病、真实熬夜时间或职业。'];mood=['疲惫（推测）']
 asset(f'mixkit-{i}','web_stock',f'orchestrator/output/day9-vp006-poc/assets/mixkit-{i}.mp4',desc,actions,mood,['office','computer','live-action'],stocklic,'verified_for_local_experiment',[(f'orchestrator/output/day9-vp006-poc/assets/{i}-{t:02}.jpg',t) for t in [0,2,4,6,8,10]],facts,infer,['2-second sampling cannot establish every intervening motion or absence of all logos.','Individual author not exposed by item page metadata; creator remains null.'],source=f'https://mixkit.co/free-stock-video/{slug}/')
promptp=ROOT/'orchestrator/output/day9-vp004a/first-frame-prompt.txt'
asset('ai-night-desk-v1','ai_generated','orchestrator/output/day9-vp004a/shot-001-first-frame-v1.png','夜色窗边书桌、电脑和台灯；一人背侧坐姿，手靠近脸部。',['静态坐姿'],['安静（推测）','思考（推测）'],['night','desk','blue','static'],license_('Holder-authorized reuse of existing generated image',None,True,['Private local PoC only; generation source record retained.'],['orchestrator/output/day9-vp004a/first-frame-record.json']),'local_experiment_only',[('orchestrator/output/day9-vp004a/shot-001-first-frame-v1.png',None)],['Desk, monitor, lamp, seated figure and night city-window background.','Blue room lighting and warm desk lamp.'],['Pose may convey contemplation or fatigue.'],['Generated image is not documentary evidence of the holder.','Exact generation model version/seed were not exposed.'],generation={'model':None,'prompt':promptp.read_text() if promptp.exists() else None,'parameters':json.loads((ROOT/'orchestrator/output/day9-vp004a/first-frame-record.json').read_text())})
asset('local-opinion-card-v1','local_library','orchestrator/output/day9-vp003a/shot-005-remotion.mp4','蓝紫网格背景，功能越做越多标题与叠层卡片逐步进入画面。',['标题渐显','卡片叠层动画'],['理性（推测）'],['motion-graphic','blue-purple','typography'],license_('Internal Remotion output; original private evaluation scope',None,True,['Local private experiment only; embedded audio must be muted when reused.'],['orchestrator/output/day9-vp003a/holder-visual-selection.json']),'local_experiment_only',[(f'orchestrator/output/day9-vp006-poc/assets/local-card-{t}.jpg',t) for t in [.2,1.7,3.2]],['Blue-purple grid; Chinese title 功能/越做越多; overlapping rectangular cards.'],['Communicates feature accumulation.'],['This is about product features, not bodily recovery; excluded from shots 3–4 sample.'])
save(OUT/'asset-catalog.json',{'contractVersion':'0.1','scope':'experimental_staging_not_formal_library','assets':assets})
T=json.loads((ROOT/'orchestrator/output/day9-vp005a/timeline.json').read_text())
start=T['shots'][2]['startSeconds'];end=T['shots'][3]['endSeconds'];duration=end-start
matches=[]
def match(shot,id,ss,se,reason,crop,status='proposed'):
 matches.append(dict(projectId='video-pipeline',episodeId='day9',shotNumber=shot,assetId=id,segmentStart=ss,segmentEnd=se,matchReason=reason,cropMode=crop,matchStatus=status))
match(3,'ai-night-desk-v1',None,None,'对应“第一个错误，是把身体当成可以透支的资源”：用既有夜间独自办公静帧建立环境；不把图中人物声称为本人。','cover; preserve face lower-right; slow push 1.00→1.04')
match(3,'mixkit-39854',2,7.2,'对应“熬夜、久坐、硬扛，觉得等产品出来了，一切都值得”：实际摘镜低头动作可表达身体负担；只作情境示意，非病情事实。','native vertical cover; center, no crop beyond 9:16')
match(3,'mixkit-39839',0,4,'持续办公事实成立，但没有明确疲劳动作；比 39854 匹配弱，本样片不选用。','if reused: 30% x focal crop to retain person; monitor will be partly lost','rejected')
match(5,'local-opinion-card-v1',0,assets[-1]['durationSeconds'],'对应第5镜“产品功能越做越多”，标题与叠层卡片语义相符；属于第5镜既有复用，非当前3–4镜样片填充。','native vertical; retain existing animation')
save(OUT/'asset-matches.json',{'contractVersion':'0.1','matches':matches,'gaps':[{'shotNumber':4,'need':'本人休息/活动或恢复身体的真实动作','status':'missing; use explicit illustrative method diagram, do not label tired-office video as recovery'}]})
clips=[dict(start=0,end=107/30,assetId='ai-night-desk-v1',expression='AI静帧缓慢推镜'),dict(start=107/30,end=263/30,assetId='mixkit-39854',sourceStart=2,sourceEnd=7.2,expression='实景摘镜低头'),dict(start=263/30,end=duration,assetId=None,expression='Remotion 身体储备→进度上限动态图解；图形是概念示意，无医学量化值')]
cues=[dict(c, startSeconds=max(0,c['startSeconds']-start),endSeconds=min(duration,c['endSeconds']-start)) for c in T['captions'] if c['endSeconds']>start and c['startSeconds']<end]
sample=dict(projectId='video-pipeline',episodeId='day9',globalStartSeconds=start,globalEndSeconds=end,durationSeconds=duration,durationInFrames=round(duration*30),fps=30,width=1080,height=1920,shots=[3,4],clips=clips,captions=cues,subtitleSource='orchestrator/output/day9-vp005a/subtitles.srt',subtitlePrecision=T['subtitlePrecision'],bgm=json.loads((ROOT/'orchestrator/config/music.json').read_text()),rightsScope='private local audition only')
save(OUT/'sample-timeline.json',sample)
shutil.copy2(ROOT/assets[1]['localPath'],PUB/'fatigue.mp4')
shutil.copy2(ROOT/assets[2]['localPath'],PUB/'night.png')
save(ROOT/'experiments/day9-remotion/src/generated/vp006-timeline.json',sample)
# Sample exact frozen voice; no re-TTS or time stretch. BGM remains separate WAV.
voice=ROOT/'local-assets/voice/experiments/day9-g4/day9-preview.wav'
subprocess.run(['ffmpeg','-v','error','-y','-ss',str(start),'-i',str(voice),'-t',str(duration),'-c:a','pcm_s16le',str(OUT/'sample-voice.wav')],check=True)
# Library discovery excludes node_modules/build caches; every discovered media file is classified by existing path/context.
paths=[]
for folder in ['local-assets','orchestrator/output','experiments/day9-remotion/public']:
 for p in (ROOT/folder).rglob('*'):
  if p.is_file() and p.suffix.lower() in ['.mp4','.mov','.webm','.png','.jpg','.jpeg'] and OUT not in p.parents:
   paths.append({'path':str(p.relative_to(ROOT)),'sha256':sha(p),'bytes':p.stat().st_size,'classification':'existing generated render, preview, or derived still; not evidence of user camera/screen footage'})
save(OUT/'source-discovery.json',{'scannedRoots':['local-assets','orchestrator/output','experiments/day9-remotion/public'],'inventory':paths,'sourceChecks':{'local_library':'Found original Remotion card + generated previews; shot5 card semantically unsuitable for sample shots3–4.','web_stock':'2 exact item Free Licenses checked; 2 official downloads, no login, no bypass.','ai_generated':'Reused existing first-frame image; no new generation.','user_provided':'No original camera/product-screen video found within scanned roots. Raw m4a is narration, not video.'},'userProvidedNeeds':['本人离开桌面活动/休息的短镜头（可选，非本轮强制要求）','本人产品最小流程录屏（后续分镜候选）']})
print('Prepared',len(assets),'assets;',duration,'seconds;',len(cues),'unchanged subtitle cues')
