"""File-based reuse adapter for existing Asset/AssetMatch v0.1. No GPU/model/service."""
import argparse, copy, datetime, hashlib, html, json, os, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'orchestrator/contracts'))
from validate_assets import validate_asset, validate_match
from jsonschema import Draft202012Validator
REUSE=Draft202012Validator(json.loads((ROOT/"orchestrator/contracts/asset-reuse-v1.schema.json").read_text()))
def validate_reuse(r):
 REUSE.validate(r)
 for region in r["composition"]["overlayRegions"]+r["composition"]["protectedRegions"]:
  if region["width"]<=0 or region["height"]<=0 or region["x"]+region["width"]>1.00001 or region["y"]+region["height"]>1.00001:raise ValueError("Normalized rectangle outside output")
 if r["scope"]=="news_event" and not r.get("scopeEpisodeId"):raise ValueError("News scope requires event identity")

def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def path(p): return Path(p) if Path(p).is_absolute() else ROOT/p
def load(p): return json.loads(path(p).read_text())
def digest(p):
 h=hashlib.sha256()
 with path(p).open('rb') as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
def save(p,data):
 p=path(p);p.parent.mkdir(parents=True,exist_ok=True)
 temp=p.with_name(p.name+'.tmp');temp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');temp.replace(p)
def probe(p):
 data=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path(p))]))
 v=next(s for s in data['streams'] if s['codec_type']=='video');rate=v.get('r_frame_rate','0/1').split('/')
 return {'width':int(v['width']),'height':int(v['height']),'durationSeconds':float(data['format']['duration']) if 'duration' in data['format'] else None,'fps':float(rate[0])/float(rate[1]) if float(rate[1]) else None}
def valid_bytes(a):
 validate_asset(a)
 if digest(a['localPath'])!=a['sha256']:raise ValueError('Asset bytes changed: '+a['assetId'])
 for f in a['analysis']['frameEvidence']:
  if digest(f['path'])!=f['sha256']:raise ValueError('Frame evidence changed: '+f['path'])
 for s in a['usableSegments']:
  if s['end']<=s['start']:raise ValueError('Invalid source interval')
def fresh():return {'version':'asset-library/1.0','assets':[],'records':{},'usageHistory':[],'inventory':[],'issues':[]}
def rec(a):
 return {'aliases':[],'catalogEvidence':[],'acquiredAt':None,'acquisitionBasis':'not recorded; filesystem mtime is not acquisition time','semanticUses':[], 'unsuitableFor':[], 'composition':{'cropMode':'contain','objectPosition':'50% 50%','overlayRegions':[],'protectedRegions':[],'reviewStatus':'NOT_EVALUATED'},'publicRights':{'status':'pending','evidence':[],'verifiedAt':None},'scope':'general','scopeEpisodeId':None,'integrityIssues':[]}
def merge(lib,a,catalog,curation=None):
 valid_bytes(a)
 existing=next((x for x in lib['assets'] if x['sha256']==a['sha256']),None)
 if existing is None:
  if any(x['assetId']==a['assetId'] for x in lib['assets']):raise ValueError('ID collision with different bytes: '+a['assetId'])
  existing=copy.deepcopy(a);lib['assets'].append(existing);lib['records'][a['sha256']]=rec(a)
 r=lib['records'][a['sha256']]
 r['licenseEvidence']=[{'path':p,'sha256':digest(p)} for p in a['license'].get('evidenceFiles',[]) if path(p).exists()]
 alias={'assetId':a['assetId'],'localPath':a['localPath']}
 if alias not in r['aliases']:r['aliases'].append(alias)
 if catalog not in r['catalogEvidence']:r['catalogEvidence'].append(catalog)
 # Conflicting permission/review claims never become an implicit permission upgrade.
 if existing['licenseStatus']!=a['licenseStatus'] or (existing['reviewStatus']!=a['reviewStatus'] and not r.get('reviewDecision')) or existing['sourceType']!=a['sourceType']:
  r['integrityIssues'].append('Conflicting provenance/license/review in '+catalog)
 if curation:
  validate_reuse(curation)
  for k in ['semanticUses','unsuitableFor','composition','scope','scopeEpisodeId','acquiredAt','acquisitionBasis','requiredDisclosures']:
   if k in curation:r[k]=copy.deepcopy(curation[k])
 return existing

def record_timeline(lib,t,tref):
 byid={alias['assetId']:a for a in lib['assets'] for alias in lib['records'][a['sha256']]['aliases']}
 th=digest(tref);fps=t['fps'];episode=t.get('episodeId') or ('day9' if 'day9' in str(tref) else None)
 if not episode:raise ValueError('Timeline needs episodeId')
 staged=[]
 for s in t['scenes']:
  if s.get('kind')=='diagram' or not s.get('assetId'):continue
  a=byid.get(s['assetId'])
  if not a:continue # not invent assets for historical unindexed scenes
  if s.get('sha256')!=a['sha256']:raise ValueError('Timeline asset hash mismatch')
  m={'projectId':'video-pipeline','episodeId':episode,'shotNumber':s['shotNumber'],'assetId':a['assetId'],'segmentStart':s.get('sourceStart'),'segmentEnd':s.get('sourceEnd'),'matchReason':s.get('assetReason') or s.get('visualReason') or s.get('reason') or 'Historical actual timeline reference','cropMode':s.get('crop',{}).get('mode','unknown'),'matchStatus':'proposed'}
  validate_match(m,{a['assetId']:a})
  key=hashlib.sha256((th+str(s['id'])).encode()).hexdigest()
  staged.append({'usageId':key,'assetSha256':a['sha256'],'match':m,'sceneId':s['id'],'timelineRef':tref,'timelineSha256':th,'timelineSeconds':{'start':s['from']/fps,'end':s['to']/fps},'basis':'existing timeline, not a new render or new human approval'})
 seen={x['usageId'] for x in lib['usageHistory']}
 lib['usageHistory'] += [x for x in staged if x['usageId'] not in seen]
 return len(staged)

def build(cfg):
 index=path(cfg['indexPath']);lib=load(index) if index.exists() else fresh();cur=load(cfg['curationRef'])
 for c in cfg['catalogs']:
  if not path(c).exists():lib['issues'].append({'path':c,'reason':'missing catalog'});continue
  for a in load(c)['assets']:
   try:
    existing=merge(lib,a,c,cur.get(a['assetId']))
    measured=probe(existing['localPath']);r=lib['records'][a['sha256']];r['measured']=measured
    if measured['width']!=a['width'] or measured['height']!=a['height']:r['integrityIssues'].append('Measured dimensions differ from catalog')
    if a['mediaType']=='video' and abs(measured['durationSeconds']-a['durationSeconds'])>.15:r['integrityIssues'].append('Measured duration differs from catalog')
   except Exception as e:lib['issues'].append({'path':a['localPath'],'reason':str(e)})
 for t in cfg['timelines']:
  if path(t).exists():
   try:record_timeline(lib,load(t),t)
   except Exception as e:lib['issues'].append({'timeline':t,'reason':str(e)})
 # Hash dedup only. No media copying/deleting, no content-based guesses about unindexed footage.
 groups={};known={a['sha256']:a for a in lib['assets']}
 for source in cfg['mediaRoots']:
  for p in sorted(path(source).rglob('*')):
   if not p.is_file() or p.suffix.lower() not in ['.mp4','.webm','.mov','.png','.jpg','.jpeg']:continue
   h=digest(p);rel=str(p.relative_to(ROOT));groups.setdefault(h,[]).append(rel)
   if h in known:
    r=lib['records'][h];alias={'assetId':known[h]['assetId'],'localPath':rel}
    if alias not in r['aliases']:r['aliases'].append(alias)
 lib['derivatives']=[]
 for d in cfg.get('derivatives',[]):
  if path(d['path']).exists():
   source=next((a for a in lib['assets'] if a['assetId']==d['sourceAssetId']),None)
   lib['derivatives'].append(dict(d,sha256=digest(d['path']),sourceSha256=source['sha256'] if source else None,autoSelectable=False))
 lib['inventory']=[{'sha256':h,'paths':ps,'assetId':known[h]['assetId'] if h in known else None,'classification':'indexed source or byte-identical staging copy' if h in known else 'unindexed auxiliary/derivative; no semantic or rights claim; not auto-selectable'} for h,ps in sorted(groups.items())]
 lib['updatedAt']=now();save(index,lib);return lib

def allowed(a,r,purpose):
 if r['integrityIssues']:return 'integrity/provenance conflict'
 if a['reviewStatus']=='rejected' or a['licenseStatus']=='rejected' or r['publicRights']['status']=='rejected':return 'rejected'
 if purpose=='public':
  rights=r['publicRights']
  if a['reviewStatus']!='approved' or rights['status']!='confirmed' or not rights.get('evidence') or not rights.get('verifiedAt'):return 'public rights or human approval unconfirmed'
 elif a['license']['localExperimentAllowed'] is not True or a['licenseStatus'] not in ['verified_for_local_experiment','local_experiment_only']:return 'local experiment permission unconfirmed'
 return None

def overlay_suggestions(r,cfg):
 c=r['composition']
 def pixels(z):return {k:round(z[k]*(1080 if k in ['x','width'] else 1920)) for k in ['x','y','width','height']}
 safe=[]
 for z in c['overlayRegions']:
  if (z['y']+z['height'])*1920>cfg['subtitleSafeTop']:continue
  overlap=lambda b:z['x']<b['x']+b['width'] and z['x']+z['width']>b['x'] and z['y']<b['y']+b['height'] and z['y']+z['height']>b['y']
  if any(overlap(b) for b in c['protectedRegions']):continue
  safe.append({'rect':pixels(z),'status':'proposed_requires_director_output_check','basis':z.get('basis'),'compatibleContract':'overlay-v1: rect only; text/fromFrame/toFrame supplied by Director from actual narration'})
 return {'positions':safe,'protectedRects':[pixels(z) for z in c['protectedRegions']],'cropDependency':c['cropMode'],'sourceEvidence':c.get('evidence'),'automaticPlacement':False}

def prepared_source(a,r):
 p=r['composition'].get('preparedMedia')
 if not p:return None
 if p.get('sourceSha256')!=a['sha256'] or p.get('sourceClockOriginSeconds')!=0 or digest(p['path'])!=p['sha256']:raise ValueError('Prepared source hash/clock binding changed')
 if p.get('width')!=1080 or p.get('height')!=1920 or p.get('fps')!=30 or p.get('technicalStatus')!='VERIFIED':raise ValueError('Prepared layout not technically verified')
 return p

def propose(lib,brief,cfg,purpose='private_review'):
 recommendations=[];gaps=[];counts={};chosen=[]
 episode=brief.get('episodeId','unspecified');fps=brief.get('fps',30)
 recent=[]
 for u in reversed(lib['usageHistory']):
  e=u['match']['episodeId']
  if e!=episode and e not in recent:recent.append(e)
 recent=recent[:cfg['recentEpisodeWindow']]
 for q in brief['requests']:
  if q.get('kind')=='diagram':
   recommendations.append({'requestId':q['requestId'],'available':False,'reason':'Procedural need: Director selects an existing diagram template; not a stock gap'});continue
  concepts=q.get('concepts',[]);duration=q.get('durationSeconds')
  if duration is None and 'from' in q and 'to' in q:duration=(q['to']-q['from'])/fps
  query=' '.join(str(q.get(k,'')) for k in ['goal','visualIntent','originalVisualIntent','narration','query'])
  ranking=[]
  for a in lib['assets']:
   r=lib['records'][a['sha256']];reasons=[];reason=allowed(a,r,purpose);prepared=None
   try:prepared=prepared_source(a,r)
   except Exception:reasons.append('missing/changed prepared source or clock binding')
   if reason:reasons.append(reason)
   # Real-time byte verification: stale library does not authorize changed files/frames.
   try:valid_bytes(a)
   except Exception:reasons.append('missing/changed source or frame evidence')
   if r['scope']=='news_event' and (q.get('eventScope') or q.get('sourceEpisodeId'))!=r['scopeEpisodeId']:reasons.append('event-specific evidence, scope not requested')
   if q.get('noVisibleFace',True) and (prepared.get('visibleFace') if prepared else r.get('composition',{}).get('visibleFace')) is not False:reasons.append('faceless crop not assessed')
   needs=q.get('mustShow',[])
   if (q.get('preferBase')=='screen_recording' or q.get('kind')=='screen_recording') and 'screen_recording' not in r['semanticUses']:reasons.append('actual recording required')
   if any(n not in r['semanticUses'] for n in needs):reasons.append('required actual content missing')
   if q.get('kind')=='image_motion' and a['mediaType']!='image':reasons.append('image requested')
   elif q.get('kind')!='image_motion' and a['mediaType']!='video':reasons.append('real dynamic video requested')
   hits=[x for x in r['semanticUses'] if (x in concepts if concepts else (x in needs or any(term.lower() in query.lower() for term in cfg.get('conceptTerms',{}).get(x,[]))))]
   # Only reviewed facts support semantic fields; filenames/tags alone contribute no score.
   score=4*len(hits)
   if not hits:reasons.append('no reviewed semantic evidence matches request')
   if counts.get(a['sha256'],0)>=cfg['maxUsesPerEpisode']:reasons.append('episode reuse limit')
   if chosen and a['sha256']==chosen[-1]:reasons.append('consecutive reuse')
   uses=sum(u['assetSha256']==a['sha256'] and u['match']['episodeId'] in recent for u in lib['usageHistory'])
   score-=min(2,uses)*cfg['recentUsePenalty']
   score-=counts.get(a['sha256'],0)*2
   start=end=None
   if a['mediaType']=='video':
    if not isinstance(duration,(int,float)) or duration<=0:reasons.append('actual required duration missing')
    else:
     segments=[{'start':max(s['start'],prepared['sourceCoverage']['start']),'end':min(s['end'],prepared['sourceCoverage']['end'])} for s in a['usableSegments']] if prepared else a['usableSegments']
     segment=next((s for s in segments if s['end']-s['start']>=duration),None)
     if not segment:reasons.append('reviewed usable interval too short')
     else:start=segment['start'];end=start+duration
   # Semantic qualification precedes diversity/recency tie-breakers.
   if 4*len(hits)<cfg['minSemanticScore']:reasons.append('semantic threshold')
   ranking.append({'assetId':a['assetId'],'score':score,'matchedConcepts':hits,'excludedReasons':reasons,'sourceStart':start,'sourceEnd':end,'recentUsageCount':uses})
  ranking.sort(key=lambda x:(-x['score'],x['assetId']))
  candidate=next((x for x in ranking if not x['excludedReasons']),None)
  if not candidate:
   gap={'requestId':q['requestId'],'shotNumber':q['shotNumber'],'need':q.get('goal') or q.get('visualIntent') or query,'durationSeconds':duration,'reason':'No locally eligible, semantically supported, long-enough and reviewed-crop match','nextAction':'Director refine requirement; then single official stock candidate or real product recording. Do not fill with unrelated footage.'}
   gaps.append(gap);recommendations.append({'requestId':q['requestId'],'available':False,'ranking':ranking});continue
  a=next(a for a in lib['assets'] if a['assetId']==candidate['assetId']);r=lib['records'][a['sha256']]
  reason='Reviewed semantic evidence: '+', '.join(candidate['matchedConcepts'])+'; duration fits reviewed interval; crop proposal based on sampled frames, final renderer output NOT_EVALUATED. Recent usage='+str(candidate['recentUsageCount'])+'. Pending human review remains pending.'
  m={'projectId':brief.get('projectId','video-pipeline'),'episodeId':episode,'shotNumber':q['shotNumber'],'assetId':a['assetId'],'segmentStart':candidate['sourceStart'],'segmentEnd':candidate['sourceEnd'],'matchReason':reason,'cropMode':r['composition']['cropMode'],'matchStatus':'proposed'}
  validate_match(m,{a['assetId']:a})
  recommendations.append({'requestId':q['requestId'],'available':True,'assetId':a['assetId'],'localPath':a['localPath'],'sha256':a['sha256'],'sourceType':a['sourceType'],'sourceStart':candidate['sourceStart'],'sourceEnd':candidate['sourceEnd'],'crop':r['composition'],'overlaySuggestions':overlay_suggestions(r,cfg),'reason':reason,'match':m,'licenseStatus':a['licenseStatus'],'humanReviewStatus':a['reviewStatus'],'publicRights':r['publicRights']['status'],'trial':a['reviewStatus']!='approved','productionReady':False,'preparationRequired':r['composition'].get('rendererCompatibility'),'ranking':ranking})
  prepared=prepared_source(a,r)
  if prepared:
   recommendations[-1].update(renderPath=prepared['path'],renderSha256=prepared['sha256'],renderDerivedFromSha256=a['sha256'],renderSourceClockOriginSeconds=prepared['sourceClockOriginSeconds'],renderSourceCoverage=prepared['sourceCoverage'],preparationRequired=None,layoutTechnicalStatus='VERIFIED',requiredDisclosures=r.get('requiredDisclosures',[]))
  counts[a['sha256']]=counts.get(a['sha256'],0)+1;chosen.append(a['sha256'])
 return {'contractVersion':'asset-proposal/0.1','mode':'rules','modelUsed':None,'catalogPath':cfg['indexPath'],'scope':purpose,'recommendations':recommendations,'gaps':gaps,'publicReady':purpose=='public' and not gaps and all(x.get('available') for x in recommendations),'capabilityLimit':'Reuse existing frame-reviewed descriptions + explicit semantic rules; no new model service, face detector, or subject recognition.'}

def export_preview(lib,out):
 out=path(out);out.mkdir(parents=True,exist_ok=True);rows=[]
 for a in lib['assets']:
  r=lib['records'][a['sha256']];esc=html.escape
  def link(p):return esc(os.path.relpath(path(p),out),quote=True)
  images=''.join('<a href="'+link(f['path'])+'"><img width="220" src="'+link(f['path'])+'"></a>' for f in a['analysis']['frameEvidence'][:3])
  rows.append('<article><h2>'+esc(a['assetId'])+'</h2>'+images+'<p>'+esc(a['description'])+'</p><p>'+esc(' / '.join(r['semanticUses']))+'</p><p>'+esc(a['licenseStatus']+' | public='+r['publicRights']['status']+' | '+a['reviewStatus'])+'</p><p>'+esc(str(a['usableSegments']))+'</p><a href="'+link(a['localPath'])+'">打开原片</a></article>')
 (out/'index.html').write_text('<!doctype html><meta charset="utf-8"><title>小陈AI说素材库</title><style>body{background:#141627;color:#eee;font:16px sans-serif;max-width:1100px;margin:auto}article{padding:20px;border-bottom:1px solid #668}a{color:#aaf}img{object-fit:contain;max-height:220px}</style><h1>素材复用候选（非公开授权清单）</h1><p>仅复用已有抽帧；点击原片核查实际动态。pending_human不代表正式库审核通过。</p>'+''.join(rows))
 groups={'confirmed':[],'pending':[],'rejected':[]}
 for a in lib['assets']:groups[lib['records'][a['sha256']]['publicRights']['status']].append(a['assetId'])
 save(out/'rights-summary.json',groups)
 save(out/'asset-catalog.json',{'assets':lib['assets']})
 return groups

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--config',default='orchestrator/config/asset-library-v1.json');sub=ap.add_subparsers(dest='command',required=True)
 sub.add_parser('build');sub.add_parser('status')
 p=sub.add_parser('preview');p.add_argument('--out',required=True)
 p=sub.add_parser('search');p.add_argument('--query',required=True);p.add_argument('--seconds',type=float,required=True);p.add_argument('--out',required=True);p.add_argument('--purpose',choices=['private_review','public'],default='private_review')
 p=sub.add_parser('match');p.add_argument('--brief',required=True);p.add_argument('--out',required=True);p.add_argument('--purpose',choices=['private_review','public'],default='private_review')
 p=sub.add_parser('ingest');p.add_argument('--asset',required=True);p.add_argument('--reuse-record',required=True)
 p=sub.add_parser('review');p.add_argument('--decision',required=True)
 p=sub.add_parser('record-use');p.add_argument('--timeline',required=True)
 p=sub.add_parser('supplement');p.add_argument('--proposal',required=True);p.add_argument('--out',required=True)
 args=ap.parse_args();cfg=load(args.config)
 if args.command=='build':lib=build(cfg);print(json.dumps({'assets':len(lib['assets']),'issues':lib['issues'],'index':cfg['indexPath']},ensure_ascii=False));return
 lib=load(cfg['indexPath'])
 if args.command=='status':print(json.dumps({'assets':len(lib['assets']),'history':len(lib['usageHistory']),'inventoryGroups':len(lib['inventory']),'issues':lib['issues']},ensure_ascii=False));return
 if args.command in ['preview','match','search']:
  target=path(args.out).resolve();protected={path(p).resolve().parent for p in cfg['catalogs']+cfg['timelines']}
  if target in protected or target in [ROOT,ROOT/'orchestrator/output']:raise ValueError('Refuse to overwrite a historical episode/source directory; use an independent output')
 if args.command=='preview':print(json.dumps(export_preview(lib,args.out),ensure_ascii=False));return
 if args.command in ['match','search']:
  b=load(args.brief) if args.command=='match' else {'episodeId':'search-only','requests':[{'requestId':'search','shotNumber':1,'query':args.query,'durationSeconds':args.seconds}]}
  result=propose(lib,b,cfg,args.purpose);out=path(args.out);out.mkdir(parents=True,exist_ok=True)
  save(out/'asset-proposal.json',result);matches=[p['match'] for p in result['recommendations'] if p.get('available')];ids={m['assetId'] for m in matches}
  save(out/'asset-matches.json',{'matches':matches});save(out/'asset-catalog.json',{'assets':[a for a in lib['assets'] if a['assetId'] in ids]});print(json.dumps({'matches':len(matches),'gaps':len(result['gaps']),'out':str(out)},ensure_ascii=False));return
 if args.command=='ingest':
  a=load(args.asset);r=load(args.reuse_record)
  measured=probe(a['localPath'])
  if measured['width']!=a['width'] or measured['height']!=a['height'] or (a['mediaType']=='video' and abs(measured['durationSeconds']-a['durationSeconds'])>.15):raise ValueError('Intake media probe differs from supplied metadata')
  # New analysis cannot be invented during intake; caller supplies real evidence.
  if a['reviewStatus']!='pending_human':raise ValueError('Intake must remain pending_human; do not auto-promote')
  current=merge(lib,a,args.asset,r);save(cfg['indexPath'],lib);print('Indexed/reused '+current['assetId']);return
 if args.command=='review':
  d=load(args.decision)
  if not d.get('reviewer') or not d.get('reviewedAt') or not d.get('evidenceFiles'):raise ValueError('Explicit reviewer, date and evidence files required')
  evidence=[{'path':p,'sha256':digest(p)} for p in d['evidenceFiles']]
  a=next(a for a in lib['assets'] if a['sha256']==d['sha256']);r=lib['records'][a['sha256']]
  if d['reviewStatus'] not in ['approved','pending_human','rejected']:raise ValueError('Invalid review status')
  public=d.get('publicRightsStatus','pending')
  if public not in ['confirmed','pending','rejected']:raise ValueError('Invalid public rights decision')
  if public=='confirmed' and (not d.get('licenseSourceUrl') or not d.get('allowedUse') or a['licenseStatus'] in ['local_experiment_only','rejected']):raise ValueError('No public upgrade from private/restricted license; record independently verified license first in original acquisition evidence')
  r['reviewDecision']=dict(d,evidenceHashes=evidence);a['reviewStatus']=d['reviewStatus'];r['publicRights']={'status':public,'evidence':evidence,'verifiedAt':d['reviewedAt'],'sourceUrl':d.get('licenseSourceUrl'),'allowedUse':d.get('allowedUse')}
  save(cfg['indexPath'],lib);print('Recorded explicit review; original catalog unchanged');return
 if args.command=='record-use':
  n=record_timeline(lib,load(args.timeline),args.timeline);save(cfg['indexPath'],lib);print('Recorded idempotently: '+str(n));return
 if args.command=='supplement':
  proposal=load(args.proposal);save(args.out,{'mode':'gap-driven','automaticDownload':False,'gaps':[dict(g,sourceOrder=['existing local library','official Pexels/Pixabay/Mixkit allowed download or real recording'],requiredBeforeIntake=['sourceURL/creator','exact license terms and date','actual frame inspection','sha256 and probe','pending human review'],prohibited=['fake UI','unrelated office filler','AIGC video while STOP']) for g in proposal['gaps']]});print('Saved specific gaps; no downloads');return

if __name__=='__main__':main()
