"""Replaceable VideoSeek HTTP retrieval adapter. Asset facts/rights remain in library.py."""
import argparse,json,time,urllib.request,urllib.error,urllib.parse
from pathlib import Path
import library as libmod

def request(base,route,body=None):
 req=urllib.request.Request(base.rstrip('/')+'/api/v1/'+route,data=None if body is None else json.dumps(body,ensure_ascii=False).encode(),headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=30) as f:return json.load(f)

def retrieve(brief,library,cfg,base,mapping,out,scene_cache=None):
 out=libmod.path(out);out.mkdir(parents=True,exist_ok=True)
 health=request(base,'health');libmod.save(out/'health.json',health)
 if not health.get('index_ready'):raise ValueError('VideoSeek index not ready; no automatic ingest through Agent API')
 videos=request(base,'videos');libmod.save(out/'api-videos.json',videos)
 bypath={a['videoSeekPath']:a for a in mapping['assets']};assets={a['sha256']:a for a in library['assets']}
 start=time.perf_counter();rows=[]
 for q in brief['requests']:
  t=time.perf_counter();body={'query':q.get('queryEnglish') or q.get('query') or q.get('goal'),'query_type':'text','search_kind':'visual','mode':'chunk','top_k':3,'text_enhance':False,'scope':{'use_saved_scope':False,'video_paths':list(bypath)}}
  raw=request(base,'search',body);libmod.save(out/(q['requestId']+'-raw.json'),{'request':body,'response':raw})
  checked=[]
  for hit in raw.get('hits',[])[:3]:
   bind=bypath.get(hit['video_path'])
   if bind is None:checked.append({'rawHit':hit,'eligible':False,'reason':'API path not in supplied SHA-bound mapping'});continue
   a=assets.get(bind['sha256'])
   if a is None:raise ValueError('Mapping not in canonical library')
   libmod.valid_bytes(a)
   if libmod.digest(hit['video_path'])!=a['sha256']:raise ValueError('VideoSeek file bytes no longer match Asset')
   # Evaluate this retrieved candidate using the same local semantic/rights/duration/crop/repeat policy.
   single=dict(library,assets=[a]);p=libmod.propose(single,dict(brief,requests=[q]),cfg);detail=p['recommendations'][0]
   coverage=detail.get('renderSourceCoverage',{'start':0,'end':float('inf')})
   intersections=[{'start':max(s['start'],hit['start_sec'],coverage['start']),'end':min(s['end'],hit['end_sec'],coverage['end'])} for s in a['usableSegments']]
   interval=next((s for s in intersections if s['end']-s['start']>=q['durationSeconds']),None)
   eligible=detail.get('available',False) and interval is not None
   if eligible:
    detail['match']['segmentStart']=interval['start'];detail['match']['segmentEnd']=interval['start']+q['durationSeconds']
    libmod.validate_match(detail['match'],{a['assetId']:a})
   scenes=next((x for x in (scene_cache or {}).get('rows',[]) if x['sha256']==a['sha256']),None)
   scene_candidates=[{'segmentId':x['segmentId'],'start':x['start'],'end':x['end'],'description':x.get('description'),'reviewStatus':x['reviewStatus']} for x in scenes['segments'] if x['end']>hit['start_sec'] and x['start']<hit['end_sec']] if scenes else []
   checked.append({'sceneCandidates':scene_candidates,'sceneConstraintApplied':False,'sceneLimit':'Detection candidates only; retain original usableSegments until actual review.','preparedHandoff':{k:v for k,v in detail.items() if k in ['renderPath','renderSha256','renderDerivedFromSha256','renderSourceClockOriginSeconds','renderSourceCoverage','requiredDisclosures']},'rank':hit['rank'],'assetId':a['assetId'],'sha256':a['sha256'],'rawHit':hit,'clipSimilarityNotQuality':hit['score'],'eligible':eligible,'match':detail.get('match') if eligible else None,'usableIntersection':interval,'factEvidence':a['analysis']['frameEvidence'],'cropAndOverlay':detail.get('crop') or library['records'][a['sha256']]['composition'],'publicationRights':library['records'][a['sha256']]['publicRights']['status'],'humanReviewStatus':a['reviewStatus'],'filterEvidence':detail.get('ranking'),'warning':'Single-frame/CLIP hit is not full action understanding; Director inspects actual interval.'})
  rows.append({'request':q,'elapsedSeconds':time.perf_counter()-t,'top3':checked,'gap':not any(x['eligible'] for x in checked)})
 result={'adapter':'VideoSeek HTTP (replaceable)','mode':'rules_postfilter_with_cpu_clip_retrieval','modelUsed':'VideoSeek clip_onnx vit-base-patch32 for retrieval only; no VLM action understanding','rows':rows,'elapsedSeconds':time.perf_counter()-start,'publicReady':False,'assetSourceOfTruth':cfg['indexPath']}
 libmod.save(out/'retrieval-results.json',result)
 # Suggestions are a standard JSON handoff, never a final edit or automatic library promotion.
 recommendations=[];gaps=[]
 for row in rows:
  h=next((h for h in row['top3'] if h['eligible']),None);q=row['request']
  if h:
   a=assets[h['sha256']];recommendations.append({'requestId':q['requestId'],'available':True,'assetId':a['assetId'],'localPath':a['localPath'],'sha256':a['sha256'],'match':h['match'],'sourceStart':h['match']['segmentStart'],'sourceEnd':h['match']['segmentEnd'],'reason':h['match']['matchReason'],'overlaySuggestions':libmod.overlay_suggestions(library['records'][a['sha256']],cfg),'trial':True,**h.get('preparedHandoff',{})})
  else:
   gaps.append({'requestId':q['requestId'],'shotNumber':q['shotNumber'],'reason':'No eligible actual-content/crop/duration/rights candidate in retrieved top3; inspect metadata fallback before network supplement.'})
 libmod.save(out/'asset-proposal.json',{'contractVersion':'asset-proposal/0.1','mode':'rules','modelUsed':None,'retrievalModel':'CPU CLIP, not semantic reasoning','catalogPath':cfg['indexPath'],'recommendations':recommendations,'gaps':gaps,'publicReady':False})
 libmod.save(out/'asset-matches.json',{'matches':[x['match'] for x in recommendations]})
 libmod.save(out/'asset-catalog.json',{'assets':[a for a in library['assets'] if a['assetId'] in {x['assetId'] for x in recommendations}]})
 return result

if __name__=='__main__':
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--config',default='orchestrator/config/asset-library-v1.json');ap.add_argument('--brief',required=True);ap.add_argument('--mapping',required=True);ap.add_argument('--scene-cache');ap.add_argument('--base-url',default='http://127.0.0.1:18765');ap.add_argument('--cpu-evidence',required=True);ap.add_argument('--out',required=True);args=ap.parse_args()
 # Do not infer CPU backend merely from API health.provider (which names model family).
 if urllib.parse.urlparse(args.base_url).hostname not in ['127.0.0.1','localhost','::1']:raise ValueError('CPU experiment permits local loopback adapter only')
 evidence=libmod.load(args.cpu_evidence)
 if evidence.get('providers')!={'visual':['CPUExecutionProvider'],'text':['CPUExecutionProvider']} or evidence.get('usingGPU') is not False:raise ValueError('Explicit observed CPU sessions required')
 cfg=libmod.load(args.config)
 try:
  r=retrieve(libmod.load(args.brief),libmod.load(cfg['indexPath']),cfg,args.base_url,libmod.load(args.mapping),args.out,libmod.load(args.scene_cache) if args.scene_cache else None)
  print(json.dumps({'requests':len(r['rows']),'gaps':sum(x['gap'] for x in r['rows']),'elapsedSeconds':r['elapsedSeconds']},ensure_ascii=False))
 except Exception as e:
  libmod.save(libmod.path(args.out)/'adapter-failure.json',{'error':str(e),'fallback':'npm --prefix orchestrator run assets -- match --brief <same-brief> --out <new-out>','automaticRetry':False});raise
