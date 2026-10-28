"""Episode curation from frozen narration + inspected footage, not a claimed autonomous model agent."""
import pathlib,json,hashlib,subprocess,shutil,math
from PIL import Image
R=pathlib.Path(__file__).resolve().parents[3]; O=R/'orchestrator/output/microsoft-veo-skills-20261028-vp010'; P=R/'experiments/gl-transitions-vp008/public/vp010';P.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(n,x):(O/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
D=json.load(open(O/'script.voiced.json')); catalog=[]; stock=json.load(open(O/'sources/stock-acquisition.json'))
desc={'1781':'银色笔记本电脑键盘上的双手近景，无可辨人脸','4938':'桌面笔记本电脑上带手链的双手打字，无可辨人脸','4907':'低角度键盘与手指打字特写，无可辨人脸','42655':'手持笔在螺旋笔记本书写；顶部可能有头发，渲染仅保留手与纸','50112':'手从书本处拿起便签；仅使用开头限定片段（不超过3.7秒），避开后段人脸','23282':'蓝色机房走廊向前移动，通用资料，非微软内部现场','7887':'机柜指示灯与服务器架实景，通用资料，非微软内部现场'}
now='2026-10-28'; assets={}
def asset(id,p,typ,desc,url,lic,ls,segments,evidence,creator=None):
 info=probe(p) if p.suffix not in ['.png','.jpg'] else None
 if info:v=next(s for s in info['streams'] if s['codec_type']=='video'); w,h=v['width'],v['height'];du=float(info['format']['duration']);fps=eval(v['r_frame_rate'])
 else:w,h=Image.open(p).size;du=fps=None
 a=dict(assetId=id,sourceType=typ,mediaType='video' if info else 'image',localPath=str(p.relative_to(R)),sha256=sha(p),sourceUrl=url,creator=creator,license=lic,licenseStatus=ls,durationSeconds=du,width=w,height=h,fps=fps,description=desc,actions=['typing' if '打字' in desc else 'document_editing' if id=='work-editor' else 'observed scene'],mood=[],tags=[id],usableSegments=segments,reviewStatus='pending_human',analysis=dict(model='Codex session image inspection; exact model identifier unavailable',analyzedAt=now,frameEvidence=[dict(path=str(f.relative_to(R)),timestampSeconds=t,sha256=sha(f)) for f,t in evidence],facts=[desc],inferences=[],uncertainty=['关键帧抽样不等于逐帧语义审查；人工未验收']))
 catalog.append(a);assets[id]=a;shutil.copy2(p,P/p.name);return a
for x in stock:
 id=x['id'];restricted=x.get('visibleRestrictedLicense',False);licid='videoRestricted' if restricted else 'videoFree';p=R/x['localPath']; du=x['duration'];end=min(3.7,du) if id=='50112' else du
 lic=dict(name='Mixkit '+licid,sourceUrl='https://mixkit.co/license/modal/'+licid+'/',verifiedAt=now,restrictions=['personal/noncommercial/private review only; replace before business publication'] if restricted else ['no standalone redistribution; no endorsement implied'],localExperimentAllowed=True,attributionRequired=False,evidenceFiles=[str((O/f'sources/{licid}-terms.html').relative_to(R)),str((O/f'sources/mixkit-{id}-page.html').relative_to(R))])
 asset('mixkit-'+id,p,'web_stock',desc[id],x['sourceUrl'],lic,'local_experiment_only' if restricted else 'verified_for_local_experiment',[dict(start=0,end=end)],[(O/f'assets/{id}-{k}.jpg',None) for k in range(3)])
e=json.load(open(O/'recordings/editor-closeup/events.json'));p=pathlib.Path(e['recordingPath']);evidence=[]
for t in [8,24,36,52,70]:evidence.append((O/f'recordings/editor-closeup/check-{t}.jpg',t))
asset('work-editor',p,'local_library','真实 VSCode 网页编辑本期核查目标、资格比例代码、需求交付与方法复盘文档；没有执行AI、没有声称微软内部资料','https://vscode.dev/',dict(name='Project-created document editing recording',sourceUrl='https://vscode.dev/',verifiedAt=now,restrictions=['no claim of AI execution, Microsoft internal operation, holder personal tenure, or UI saving'],localExperimentAllowed=True), 'verified_for_local_experiment',[dict(start=8,end=28),dict(start=33,end=41.5),dict(start=47,end=61),dict(start=68,end=85)],evidence,'VideoPipeline project capture')
for id,url in [('official-veo','https://blogs.microsoft.com/blog/2026/10/26/introducing-a-voluntary-exit-offer/'),('annual-report','https://www.microsoft.com/investor/reports/ar26/')]:
 p=O/f'assets/{id}.png';asset(id,p,'web_stock','真实官方网站标题局部截图，非重绘公告；仅显示短标题',url,dict(name='Official headline quotation; copyright retained, no blanket reuse license asserted',sourceUrl=url,verifiedAt=now,restrictions=['private review only; minimal headline excerpt; no announcement fabrication'],localExperimentAllowed=True), 'local_experiment_only',[],[(p,None)],'Microsoft')
save('asset-catalog.json',dict(contractVersion='asset/0.1',assets=catalog))
# Each plan entry is curated against the exact narration and inspected material. Source offsets are explicit, no repetition loops.
plan={1:[('official-veo',None,None)],2:[('mixkit-1781',0,None)],3:[('annual-report',None,3),('mixkit-23282',0,None)],4:[('mixkit-7887',0,4.5),('mixkit-23282',5.4,None)],5:[('mixkit-4938',0,4),('mixkit-1781',3.1,None)],6:[('mixkit-4907',0,None)],7:[('work-editor',33,None)],8:[('mixkit-4938',4.05,None)],9:[('work-editor',8,None)],10:[('mixkit-4907',4.5,None)],11:[('graphic',None,None)],12:[('graphic',None,1),('work-editor',15.2,None)],13:[('work-editor',17.7,None)],14:[('work-editor',47,None)],15:[('graphic',None,1),('mixkit-1781',7.3,None)],16:[('work-editor',38.15,3),('mixkit-4907',8.2,None)],17:[('work-editor',52.3,None)],18:[('graphic',None,1),('mixkit-42655',0,None)],19:[('mixkit-42655',2.95,None)],20:[('work-editor',68,None)],21:[('mixkit-50112',0,None)],22:[('work-editor',74.6,None)],23:[('work-editor',79.9,5.05),('mixkit-1781',9.6,None)],24:[('graphic',None,None)],25:[('mixkit-4907',10.4,3.5),('graphic',None,None)]}
titles={1:['约6万人','符合自愿离职条件'],2:['你的技能','还能保值多久？'],3:['符合条件 ≠ 已经离职','约27%｜按2026年6月底员工基数'],4:['适应业务与人员需求变化','AI投入是背景，不是已证实因果'],5:['需求会变','技能需要重新检验'],6:['部分专业任务','完成门槛正在变化'],7:['报告 · 分析 · 代码','从熟练操作出发'],8:['更多人可以开始','通用工作情境，非AI产品演示'],9:['同样的使用条件','好问题，比身份更重要'],10:['差距缩小之后','靠什么保持竞争力？'],11:['三个方向','判断问题 · 交付结果 · 积累方法'],12:['01 判断问题','从熟练操作，走向判断问题'],13:['目标对吗？信息够吗？','核查来源与验收条件'],14:['为什么做？怎样算合格？','把判断写进工作过程'],15:['02 交付结果','从完成一步，走向交付结果'],16:['固定步骤','也要理解前后环节'],17:['理解需求 → 验证效果','把问题从头到尾解决好'],18:['03 积累方法','从重复做事，走向积累方法'],19:['留下可复用的方法','不是只重复做过的事'],20:['原因 · 教训 · 适用条件','真实整理本期核查文档'],21:['下一次工作','站在上一次积累上'],22:['扩大技能解决的问题','持续检验，而非一次学会'],23:['判断更好 · 交付完整','积累经过验证的方法'],24:['技能还能保值多久？','重新检验自己的价值'],25:['完成任务的门槛降低','我能把什么问题解决得更好？']}
scenes=[];matches=[];recommend=[];counts={}
for shot in D['shots']:
 n=shot['shotNumber'];start=round(shot['voiceover']['timelineStartSeconds']*30);end=round(D['shots'][n]['voiceover']['timelineStartSeconds']*30) if n<25 else round(shot['voiceover']['timelineEndSeconds']*30)
 if n==25:end=math.ceil(D['actualDurationSeconds']*30)+24 if 'actualDurationSeconds' in D else math.ceil(shot['voiceover']['timelineEndSeconds']*30)+24
 cursor=start
 for j,(aid,src,seconds) in enumerate(plan[n]):
  stop=cursor+round(seconds*30) if seconds is not None else end
  if j==len(plan[n])-1:stop=end
  duration=(stop-cursor)/30;graphic=aid=='graphic';a=assets.get(aid);isimage=a and a['mediaType']=='image';screen=aid=='work-editor'
  cls='fullscreen_graphic' if graphic else 'news_document' if isimage else 'screen_recording' if screen else 'real_stock'
  kind='diagram' if graphic else 'image_motion' if isimage else 'screen_recording' if screen else 'live_action'
  reason=next(x['goal'] for x in json.load(open(O/'visual-brief.json'))['requests'] if x['shotNumber']==n)+'；'+('短暂章节/结论点题' if graphic else a['description'])
  s=dict(id=f'shot-{n:03d}-{j+1}',requestId=f'shot-{n:03d}',shotNumber=n,from_=cursor,to=stop,kind=kind,visualClass=cls,goal=reason,visualReason=reason,reason=reason,available=True,assetId=None if graphic else aid,localPath=None if graphic else a['localPath'],publicPath=None if graphic else 'vp010/'+pathlib.Path(a['localPath']).name,sourceType=None if graphic else a['sourceType'],sha256=None if graphic else a['sha256'],sourceStart=src,sourceEnd=src+duration if src is not None else None,sourceRange=dict(startSeconds=src,endSeconds=src+duration) if src is not None else None,crop=dict(mode='portrait_focus' if not screen else 'genuine_editor_closeup',objectPosition='50% 70%' if aid=='mixkit-42655' else '50% 50%'),motion=dict(scaleFrom=1,scaleTo=1.035 if isimage else 1,panX=0,panY=0),entry=dict(type='none',durationFrames=0),labels=dict(mainTitle=titles[n][0],secondaryTitle=titles[n][1]),requiresClearReading=screen or bool(isimage),transitionRelation='progression' if graphic else 'visual_type_change' if j else 'continuation',transitionPolicy=('soft' if shot['narration'].startswith(('这不能证明','第三，','技能还能保值多久')) else 'progression' if shot['narration'].startswith(('第一，','第二，')) else 'hard_cut') if j==0 else 'hard_cut',transitionDurationFrames=8 if shot['narration'].startswith(('第一，','第二，')) else 6,templateId='episode-centered' if graphic else None,layout='centered',decorativeBadges=False)
  s['from']=s.pop('from_');scenes.append(s);cursor=stop
  if a:
   assert src is None or any(src>=u['start']-.001 and src+duration<=u['end']+.001 for u in a['usableSegments']),(n,aid,src,duration,a['usableSegments'])
   matches.append(dict(projectId='video-pipeline',episodeId='microsoft-veo-skills-20261028',shotNumber=n,assetId=aid,segmentStart=src,segmentEnd=s['sourceEnd'],matchReason=reason,cropMode=s['crop']['mode'],matchStatus='proposed',narration=shot['narration'],visualGoal=reason,visualStyle='蓝紫科技叠加，字幕稳定',licenseStatusAtMatch=a['licenseStatus'],humanReviewStatus='pending_human',sourceTypeAtMatch=a['sourceType']))
  recommend.append(dict(requestId=s['requestId'],sceneId=s['id'],assetId=s['assetId'],reason=reason,available=True,humanReview='pending_human'))
assert scenes[0]['from']==0 and all(a['to']==b['from'] for a,b in zip(scenes,scenes[1:]))
frames=scenes[-1]['to'];caps=json.load(open(O/'captions.json'));assert ''.join(c['text'] for c in caps)==''.join(s['narration'] for s in D['shots'])
t=dict(contractVersion='visual-timeline/0.1',mode='rules',modelUsed=None,episodeId='microsoft-veo-skills-20261028',fps=30,width=1080,height=1920,durationInFrames=frames,globalStartSeconds=0,globalEndSeconds=frames/30,publicVoice='vp010/full-raw.wav',scenes=scenes,captions=caps,transitions=[],visualPolicy=dict(decorativeBadges=dict(brand=False,sceneIllustration=False),brandAccentLine=False),disclosures=[],closingHoldFrames=24)
shutil.copy2(O/'voice/full-raw.wav',P/'full-raw.wav');save('timeline.json',t);save('asset-matches.json',matches);save('asset-proposal.json',dict(mode='rules',modelUsed=None,decisionBasis='Narration intent + actual frame inspection, curated episode requirements; not autonomous model service',recommendations=recommend,gaps=[]))
ratios={}
for s in scenes:ratios[s['visualClass']]=ratios.get(s['visualClass'],0)+s['to']-s['from']
ratios={k:dict(frames=v,seconds=v/30,percent=v/frames*100) for k,v in ratios.items()};assert sum(ratios[k]['percent'] for k in ['real_stock','screen_recording'])>=60;assert ratios['fullscreen_graphic']['percent']<=30
save('visual-distribution.json',dict(totalFrames=frames,durationSeconds=frames/30,classes=ratios,segments=[dict(scene=s['id'],shotNumber=s['shotNumber'],visualClass=s['visualClass'],fromFrame=s['from'],toFrame=s['to']) for s in scenes],human='NOT_EVALUATED'))
# Honest capture time audit: wall clock includes browser startup; selected source seconds independently checked in decoded frames.
save('recording-timing-evidence.json',dict(wallClockNotVideoTime=True,videoDurationSeconds=88.2,selectedIntervals=[(8,28),(33,41.5),(47,61),(68,85)],basis='Actual decoded 8/24/36/52/70s frames show corresponding documents; ranges are conservative editing windows, not claimed exact UI event alignment',discardedCaptures=['raw','editor-v2','verified-editor']))
print(json.dumps(ratios,ensure_ascii=False))
