"""Gap-driven official stock API transport; existing Asset/AssetMatch remains authoritative."""
import argparse,contextlib,datetime,getpass,hashlib,importlib.util,json,os,shlex,time,urllib.parse,urllib.request,urllib.error,subprocess
from pathlib import Path
import library as lib
UP=lib.ROOT/'orchestrator/vendor/stock-media-skill'
spec=importlib.util.spec_from_file_location('stock_media_normalizers',UP/'stock_media.py');stock=importlib.util.module_from_spec(spec);spec.loader.exec_module(stock)

class Blocked(Exception):pass

def key_for(provider,cfg):
 env=cfg['providers'][provider]['keyEnv']
 if os.environ.get(env):return os.environ[env],'environment '+env
 for dotenv in [lib.ROOT/'.env',lib.ROOT/'orchestrator/.env']:
  if dotenv.is_file():
   for line in dotenv.read_text().splitlines():
    parts=line.strip().removeprefix('export ').split('=',1)
    if len(parts)==2 and parts[0].strip()==env:
     value=shlex.split(parts[1],comments=True)
     if len(value)==1 and value[0]:return value[0],str(dotenv)
 refs=[lib.path(cfg['credentialsRef'])]
 refs += [Path(os.environ['STOCK_MEDIA_CONFIG'])] if os.environ.get('STOCK_MEDIA_CONFIG') else [Path.home()/'.config/stock-media/config.json']
 for p in refs:
  if p.is_file():
   d=json.loads(p.read_text());value=d.get(provider) or d.get(env)
   if isinstance(value,str) and value.strip():return value.strip(),str(p)
 return None,None

def redact(value):
 if isinstance(value,dict):return {k:('[REDACTED]' if k.lower() in ['key','authorization','api_key','access_token','token','client_id','client_secret','secret_key','email','unsplash_secret_key','x-goog-signature','x-goog-credential'] else redact(v)) for k,v in value.items()}
 if isinstance(value,list):return [redact(v) for v in value]
 if isinstance(value,str) and value.startswith('https://'):
  u=urllib.parse.urlsplit(value);q=urllib.parse.parse_qsl(u.query,keep_blank_values=True);q=[(k,'[REDACTED]' if k.lower() in ['key','token','api_key','access_token','client_id','client_secret','x-goog-signature','x-goog-credential'] else v) for k,v in q];return urllib.parse.urlunsplit((u.scheme,u.netloc,u.path,urllib.parse.urlencode(q),u.fragment))
 return value

def error_summary(e):
 # HTTP bodies/URL exception text may reflect query keys. Never include them.
 if isinstance(e,urllib.error.HTTPError):return {'type':'HTTPError','status':e.code,'action':'STOP; no automatic retry or bypass; preserve quota/reset headers'}
 return {'type':type(e).__name__,'message':'Transport or file validation failed; no raw credential-bearing exception text retained'}

def api_search(provider,query,cfg,limit=3):
 if provider not in cfg['providers']:raise ValueError('Unsupported provider')
 if not query.strip() or len(query)>100 or limit<1 or limit>cfg['maxCandidatesPerQuery']:raise ValueError('Use a concrete query <=100 chars and <=3 candidates')
 cachekey=hashlib.sha256(json.dumps([provider,query,limit],ensure_ascii=False).encode()).hexdigest();cache=lib.path(cfg['cacheDir'])/(cachekey+'.json')
 if cache.exists():
  old=lib.load(cache)
  if time.time()-old['cachedAtEpoch']<cfg['cacheTtlSeconds']:return dict(old,cacheHit=True)
 key,origin=key_for(provider,cfg)
 if not key:raise Blocked('MISSING_CREDENTIAL:'+provider+'; '+cfg['providers'][provider]['keyEnv']+'; '+cfg['providers'][provider]['signupUrl'])
 headers={'User-Agent':'VideoPipeline-AssetAgent/1.0'}
 if provider=='pexels':params={'query':query,'per_page':limit,'page':1};headers['Authorization']=key
 elif provider=='pixabay':params={'key':key,'q':query,'per_page':max(3,limit),'page':1,'safesearch':'true','video_type':'film'}
 elif provider=='coverr':params={'query':query,'page_size':limit,'page':0,'sort':'popular','urls':'true'};headers['Authorization']='Bearer '+key
 else:params={'query':query,'per_page':limit,'page':1};headers.update({'Authorization':'Client-ID '+key,'Accept-Version':'v1'})
 request=urllib.request.Request(cfg['providers'][provider]['searchEndpoint']+'?'+urllib.parse.urlencode(params),headers=headers)
 try:
  with urllib.request.urlopen(request,timeout=cfg['requestTimeoutSeconds']) as response:
   raw=json.load(response);quota={k:v for k,v in response.headers.items() if k.lower().startswith('x-ratelimit')}
 except Exception as e:return {'provider':provider,'query':query,'status':'BLOCKED','error':error_summary(e),'credentialOrigin':origin,'automaticRetry':False}
 candidates=[]
 for item in (raw.get('videos',[]) if provider=='pexels' else raw.get('results',[]) if provider=='unsplash' else raw.get('hits',[]))[:limit]:
  if provider=='unsplash':
   candidate={'source':provider,'id':item['id'],'type':'image','mediaType':'image','page_url':item['links']['html'],'author':item.get('user',{}).get('name'),'author_url':item.get('user',{}).get('links',{}).get('html'),'preview_url':item['urls'].get('small'),'download_url':item['urls'].get('regular'),'download_location':item['links'].get('download_location'),'width':item.get('width'),'height':item.get('height'),'description':item.get('description') or item.get('alt_description'),'premium':item.get('premium',False),'fileVersion':{'url':item['urls'].get('regular'),'representation':'API regular variant'},'attributionRequired':True}
  elif provider=='coverr':
   urls=item.get('urls') or {};candidate={'source':provider,'id':item['id'],'type':'video','page_url':item.get('page_url') or 'https://coverr.co/videos/'+str(item.get('slug') or item['id']),'author':(item.get('contributor') or {}).get('fullname'),'preview_url':item.get('thumbnail') or item.get('poster'),'download_url':urls.get('mp4_download') or urls.get('mp4'),'duration':float(item['duration']) if item.get('duration') else None,'premium':item.get('is_premium'),'contentOrigin':('ai_generated' if item.get('is_ai_generated') else 'real_stock') if isinstance(item.get('is_ai_generated'),bool) else 'UNKNOWN','title':item.get('title'),'description':item.get('description'),'fileVersion':urls}
  else:candidate=(stock.pexels_video_to_result if provider=='pexels' else stock.pixabay_video_to_result)(item)
  if provider=='pexels':
   variants=[dict(v) for v in item.get('video_files',[]) if v.get('file_type')=='video/mp4' and v.get('width') and v.get('height')]
   usable=[v for v in variants if max(v['width'],v['height'])<=1920]
   chosen=max(usable or variants,key=lambda v:v['width']*v['height'],default={});candidate.update(download_url=chosen.get('link'),fileVersion=chosen)
  elif provider=='pixabay':
   variants=[dict(v,quality=n) for n,v in item.get('videos',{}).items() if v.get('url')];usable=[v for v in variants if max(v.get('width',0),v.get('height',0))<=1920];chosen=max(usable or variants,key=lambda v:v.get('width',0)*v.get('height',0),default={});candidate.update(download_url=chosen.get('url'),fileVersion=chosen)
  candidate.update(metadataOrigin='official API response',searchQuery=query,licenseSource=cfg['providers'][provider]['licenseUrl'],licenseStatus='pending_verification',visualStatus='NOT_ANALYZED',publicReady=False)
  candidates.append(redact(candidate))
 result={'provider':provider,'query':query,'status':'SEARCHED_NOT_REVIEWED','candidates':candidates,'cachedAtEpoch':time.time(),'acquiredAt':lib.now(),'cacheHit':False,'quotaHeaders':quota,'rawResponse':redact(raw),'credentialOrigin':origin}
 lib.save(cache,result);return result

class AllowedRedirect(urllib.request.HTTPRedirectHandler):
 def __init__(self,hosts):self.hosts=hosts
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  if urllib.parse.urlsplit(newurl).hostname not in self.hosts:raise Blocked('Redirect outside official CDN allowlist')
  return super().redirect_request(req,fp,code,msg,headers,newurl)

def safe_media_url(candidate,cfg,url):
 provider=candidate['source'];u=urllib.parse.urlsplit(url or '')
 if u.scheme!='https' or u.username or u.password or u.port not in [None,443] or u.hostname not in cfg['providers'][provider]['mediaHosts']:raise Blocked('Not a permitted official media CDN URL')
 if any(k.lower() in ['key','api_key','access_token','token'] for k,v in urllib.parse.parse_qsl(u.query)):raise Blocked('Credential-like media query URL must not enter receipts')
 return url

def duplicate(candidate,cfg):
 ledger=lib.load(cfg['ledgerPath']) if lib.path(cfg['ledgerPath']).exists() else {'records':[]}
 catalog=lib.load(lib.load(cfg['libraryConfigRef'])['indexPath'])
 for a in catalog['assets']:
  import re
  u=urllib.parse.urlsplit(a.get('sourceUrl') or '')
  match=re.search(r'-(\d+)/?$',u.path)
  same_id=match and match.group(1)==str(candidate['id']) and u.hostname in (['pexels.com','www.pexels.com'] if candidate['source']=='pexels' else ['pixabay.com','www.pixabay.com'])
  if same_id or (candidate.get('page_url') and a.get('sourceUrl')==candidate['page_url']):return {'assetId':a['assetId'],'localPath':a['localPath'],'sha256':a['sha256'],'basis':'provider ID or source URL already indexed'}
 for r in ledger['records']:
  if (r['source']==candidate['source'] and str(r['sourceId'])==str(candidate['id'])) or r.get('sourceUrl')==candidate.get('page_url'):
   if lib.path(r['localPath']).exists() and lib.digest(r['localPath'])==r['sha256']:return dict(r,basis='provider ID/URL already acquired')
 return None

def track_download(candidate,cfg):
 provider=candidate['source'];key,_=key_for(provider,cfg)
 if provider=='unsplash':
  url=candidate.get('download_location','');u=urllib.parse.urlsplit(url)
  if u.scheme!='https' or u.hostname!='api.unsplash.com' or u.path!='/photos/'+str(candidate['id'])+'/download':raise Blocked('Invalid official download callback')
  request=urllib.request.Request(url,headers={'Authorization':'Client-ID '+key,'Accept-Version':'v1'})
 elif provider=='coverr':
  request=urllib.request.Request('https://api.coverr.co/videos/'+urllib.parse.quote(str(candidate['id']),safe='')+'/stats/downloads',method='PATCH',headers={'Authorization':'Bearer '+key})
 else:return {'status':'NOT_REQUIRED'}
 try:
  with urllib.request.urlopen(request,timeout=cfg['requestTimeoutSeconds']) as response:return {'status':'RECORDED','httpStatus':response.status,'at':lib.now(),'sourceId':candidate['id']}
 except Exception as e:return {'status':'BLOCKED','error':error_summary(e),'automaticRetry':False,'at':lib.now()}

def image_preview(candidate,cfg,out):
 out=lib.path(out);out.mkdir(parents=True,exist_ok=True);target=out/'api-hotlink-preview.jpg'
 url=safe_media_url(candidate,cfg,candidate.get('preview_url'))
 try:
  with urllib.request.urlopen(url,timeout=cfg['requestTimeoutSeconds']) as response: data=response.read(8*1024*1024+1)
  if len(data)>8*1024*1024:raise Blocked('Preview bound exceeded')
  target.write_bytes(data)
  from PIL import Image
  with Image.open(target) as im:im.verify()
  result={'status':'IMAGE_READY_NOT_ANALYZED','frameEvidence':[{'path':str(target.relative_to(lib.ROOT)),'timestampSeconds':None,'sha256':lib.digest(target)}],'hotlinkUrl':url,'attribution':{'name':candidate.get('author'),'profile':candidate.get('author_url'),'platform':'https://unsplash.com/?utm_source=video_pipeline&utm_medium=referral'},'notDynamicFootage':True}
 except Exception as e:result={'status':'BLOCKED','error':error_summary(e),'automaticRetry':False}
 lib.save(out/'preview-status.json',result);return result

def fetch(candidate,cfg,transport="http"):
 found=duplicate(candidate,cfg)
 if found:return {'status':'REUSED_NO_DOWNLOAD','record':found}
 if candidate.get('premium') is True:raise Blocked('Paid/premium asset excluded')
 if candidate['source']=='coverr' and candidate.get('contentOrigin')!='real_stock':raise Blocked('Coverr original stock origin not confirmed')
 if candidate.get('visualStatus')!='preview_accepted' or not candidate.get('previewEvidence'):raise Blocked('Preview visual review required before full download; metadata labels do not qualify')
 for f in candidate['previewEvidence']:
  if lib.digest(f['path'])!=f['sha256']:raise Blocked('Preview frame changed')
 if candidate['source']=='unsplash' and candidate.get('downloadTracking',{}).get('status')!='RECORDED':
  candidate=dict(candidate,downloadTracking=track_download(candidate,cfg))
  if candidate['downloadTracking']['status']!='RECORDED':return {'status':'BLOCKED','downloadTracking':candidate['downloadTracking'],'automaticRetry':False}
 url=safe_media_url(candidate,cfg,candidate.get('download_url'));root=lib.path(cfg['mediaDir']);root.mkdir(parents=True,exist_ok=True);tmp=root/('partial-'+str(time.time_ns()))
 opener=urllib.request.build_opener(AllowedRedirect(cfg['providers'][candidate['source']]['mediaHosts']))
 try:
  command=None
  if transport=='ffmpeg-copy':
   command=['ffmpeg','-v','error','-hwaccel','none','-threads','1','-i',url,'-map','0:v:0','-c:v','copy','-an','-fs',str(cfg['maxFileBytes']),'-f','mp4',str(tmp)]
   result=subprocess.run(command,capture_output=True,timeout=120)
   if result.returncode:
    (root/(tmp.name+'.stderr.log')).write_bytes(result.stderr);raise Blocked('FFmpeg normal media read failed; no automatic transport switch/retry')
   if tmp.stat().st_size>=cfg['maxFileBytes']-65536:raise Blocked('File size bound reached; do not accept truncated acquisition')
  elif transport=='http':
   with opener.open(urllib.request.Request(url,headers={'User-Agent':'VideoPipeline-AssetAgent/1.0'}),timeout=cfg['requestTimeoutSeconds']) as response,tmp.open('xb') as f:
    if not response.headers.get('Content-Type','').lower().startswith(('image/',) if candidate.get('mediaType')=='image' else ('video/','application/octet-stream')):raise Blocked('Unexpected media response')
    n=0
    while True:
     data=response.read(1024*1024)
     if not data:break
     n+=len(data)
     if n>cfg['maxFileBytes']:raise Blocked('Candidate exceeds bounded single-file size')
     f.write(data)
    f.flush();os.fsync(f.fileno())
  else:raise Blocked('Unsupported explicit transport')
  info=lib.probe(tmp)
  if candidate.get('duration') and abs(info['durationSeconds']-candidate['duration'])>1.2:raise Blocked('Acquired duration differs from API; do not accept a partial file')
  h=lib.digest(tmp);catalog=lib.load(lib.load(cfg['libraryConfigRef'])['indexPath']);same=next((a for a in catalog['assets'] if a['sha256']==h),None)
  target=lib.path(same['localPath']) if same else root/(h+('.jpg' if candidate.get('mediaType')=='image' else '.mp4'))
  if target.exists():
   if lib.digest(target)!=h:raise Blocked('Content address collision')
   tmp.unlink() # only our redundant temporary download; never a formal asset
  else:tmp.rename(target)
  info=lib.probe(target);r={'source':candidate['source'],'sourceId':str(candidate['id']),'sourceUrl':candidate['page_url'],'creator':candidate.get('author'),'downloadUrl':url,'fileVersion':candidate.get('fileVersion'),'acquiredAt':lib.now(),'localPath':str(target.relative_to(lib.ROOT)) if target.is_relative_to(lib.ROOT) else str(target),'sha256':h,'bytes':target.stat().st_size,'probe':info,'licenseStatus':'pending_verification','reviewStatus':'pending_human','downloadDoesNotApproveLicense':True,'acquisitionTransport':transport,'representation':'visual stream copy, audio omitted, MP4 remux; original remote file byte SHA unknown' if transport=='ffmpeg-copy' else 'original HTTP response bytes','acquisitionCommand':command}
  ledger=lib.load(cfg['ledgerPath']) if lib.path(cfg['ledgerPath']).exists() else {'records':[]};r['downloadTracking']=({'status':'RECORDED_BY_MP4_DOWNLOAD_URL','at':lib.now()} if transport=='http' and candidate.get('fileVersion',{}).get('mp4_download')==url else track_download(candidate,cfg)) if candidate['source']=='coverr' else candidate.get('downloadTracking');ledger['records'].append(r);lib.save(cfg['ledgerPath'],ledger)
  return {'status':'DOWNLOADED_NOT_INGESTED','record':r}
 except Exception as e:return {'status':'BLOCKED','error':error_summary(e),'partialFile':str(tmp) if tmp.exists() else None,'automaticRetry':False}

def sample_frames(candidate,cfg,out,local_record=None):
 out=lib.path(out);out.mkdir(parents=True,exist_ok=True)
 if local_record:
  source=str(lib.path(local_record['localPath']))
  if lib.digest(source)!=local_record['sha256']:raise Blocked('Downloaded bytes changed')
  duration=lib.probe(source)['durationSeconds']
 else:
  source=safe_media_url(candidate,cfg,candidate.get('download_url'));duration=candidate.get('duration')
 if not isinstance(duration,(int,float)) or duration<=0:raise Blocked('Real source duration required')
 evidence=[];commands=[]
 for i in range(6):
  sec=max(0,min(duration-.05,duration*i/6));target=out/('frame-'+str(i)+'.jpg')
  if target.exists():raise Blocked('Use a new preview/inspection directory')
  cmd=['ffmpeg','-v','error','-hwaccel','none','-threads','1','-ss',str(sec),'-i',source,'-frames:v','1','-vf','scale=480:-2','-threads','1',str(target)];commands.append(cmd)
  try:subprocess.run(cmd,check=True,capture_output=True,timeout=cfg['requestTimeoutSeconds'])
  except Exception as e:
   if isinstance(e,subprocess.CalledProcessError):
    (out/'ffmpeg.stderr.log').write_bytes(e.stderr or b'')
    lib.save(out/'ffmpeg-command.json',cmd)
   failure={'status':'BLOCKED','phase':'local-inspect' if local_record else 'remote-preview','error':error_summary(e),'stoppedAtFrame':i,'automaticRetry':False,'evidenceAlreadySaved':evidence,'noBypass':True};lib.save(out/'preview-status.json',failure);return failure
  if not target.exists() or target.stat().st_size==0:
   failure={'status':'BLOCKED','phase':'local-inspect' if local_record else 'remote-preview','error':{'type':'NoFrameWritten','message':'FFmpeg returned without a usable image; not proof of source validity'},'stoppedAtFrame':i,'automaticRetry':False,'evidenceAlreadySaved':evidence}
   lib.save(out/'preview-status.json',failure);return failure
  evidence.append({'path':str(target.relative_to(lib.ROOT)),'timestampSeconds':sec,'sha256':lib.digest(target)})
 result={'status':'FRAMES_READY_NOT_ANALYZED','source':candidate['source'],'sourceId':candidate['id'],'frameEvidence':evidence,'commands':commands,'fullActionProven':False,'motionNaturalness':'NOT_EVALUATED'}
 lib.save(out/'preview-status.json',result)
 if not local_record:
  lib.save(out/'candidate.with-preview.json',dict(candidate,previewEvidence=evidence,visualStatus='preview_ready_not_reviewed'))
 else:
  subprocess.run(['ffmpeg','-v','error','-hwaccel','none','-threads','1','-i',source,'-f','null','-'],check=True,capture_output=True,timeout=120)
  a={'assetId':candidate['source']+'-'+str(candidate['id']),'sourceType':'web_stock','mediaType':'video','localPath':local_record['localPath'],'sha256':local_record['sha256'],'sourceUrl':candidate['page_url'],'creator':candidate.get('author'),'license':{'name':None,'sourceUrl':cfg['providers'][candidate['source']]['licenseUrl'],'verifiedAt':None,'restrictions':[],'localExperimentAllowed':None},'licenseStatus':'pending_verification',**lib.probe(source),'description':None,'actions':[],'mood':[],'tags':[],'usableSegments':[],'reviewStatus':'pending_human','analysis':None}
  lib.save(out/'asset-draft.NOT-READY.json',a) # intentionally fails existing Asset contract until actual visual/license analysis supplied
 return result

def layout(asset,start,seconds,out):
 lib.valid_bytes(asset)
 if asset['reviewStatus']=='rejected' or asset['license']['localExperimentAllowed'] is not True:raise Blocked('Local review permission required')
 if asset['mediaType']!='video' or not 0<seconds<=8 or not any(start>=s['start'] and start+seconds<=s['end']+.0001 for s in asset['usableSegments']):raise Blocked('Layout test requires a reviewed video interval <=8sec')
 out=lib.path(out);out.mkdir(parents=True,exist_ok=True);target=out/'contain-9x16.mp4'
 if target.exists():raise Blocked('Use a new independent preview directory')
 vf='scale=1080:1920:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x100e29,fps=30,setsar=1'
 cmd=['ffmpeg','-v','error','-hwaccel','none','-threads','1','-ss',str(start),'-i',str(lib.path(asset['localPath'])),'-t',str(seconds),'-an','-vf',vf,'-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-threads','2',str(target)]
 t=time.perf_counter();subprocess.run(cmd,check=True,capture_output=True,timeout=90)
 probe=lib.probe(target);subprocess.run(['ffmpeg','-v','error','-hwaccel','none','-threads','1','-i',str(target),'-f','null','-'],check=True,capture_output=True,timeout=40)
 scale=min(1080/asset['width'],1920/asset['height']);w=round(asset['width']*scale)//2*2;h=round(asset['height']*scale)//2*2;x=(1080-w)//2;y=(1920-h)//2
 result={'sourceAssetId':asset['assetId'],'sourceSha256':asset['sha256'],'sourceRange':{'start':start,'end':start+seconds},'path':str(target.relative_to(lib.ROOT)),'sha256':lib.digest(target),'probe':probe,'actualContentRect':{'x':x,'y':y,'width':w,'height':h},'overlayProposal':{'rect':{'x':80,'y':160,'width':900,'height':180},'basis':'actual padded area above source content; valid only for this contain layout','status':'NOT_EVALUATED'} if y>=340 else None,'subtitleSafeRect':{'x':76,'y':1648,'width':904,'height':172},'fullSoftwareDecode':True,'elapsedSeconds':time.perf_counter()-t,'command':cmd,'role':'composition validation preview only, not new raw Asset; do not reuse trimmed derivative with unadjusted original sourceStart','subjectPreservation':'NOT_EVALUATED','motionNaturalness':'NOT_EVALUATED'}
 lib.save(out/'layout-validation.json',result);return result

def discover(brief,cfg,out,search=True):
 """Existing Asset facts first; only explicit Director visual queries reach external APIs."""
 out=lib.path(out);out.mkdir(parents=True,exist_ok=True)
 lc=lib.load(cfg['libraryConfigRef']);local=lib.propose(lib.load(lc['indexPath']),brief,lc)
 lib.save(out/'local-proposal.json',local);gap_ids={g['requestId'] for g in local['gaps']};rows=[]
 for q in brief['requests']:
  if q['requestId'] not in gap_ids:continue
  query=q.get('queryEnglish') or q.get('stockSearchQuery')
  row={'requestId':q['requestId'],'query':query,'results':[],'automaticDownload':False}
  if not query:row['status']='DIRECTOR_QUERY_REQUIRED'
  elif not search:row['status']='PLANNED_NO_NETWORK'
  else:
   providers=['unsplash'] if q.get('kind')=='image_motion' or q.get('mediaType')=='image' else ['pixabay','coverr']
   for provider in providers:
    try:r=api_search(provider,query,cfg)
    except Blocked as e:r={'status':'BLOCKED','reason':str(e)}
    filename=str(len(rows))+'-'+provider+'-search.json';lib.save(out/filename,r)
    row['results'].append({'provider':provider,'status':r['status'],'path':filename,'candidates':len(r.get('candidates',[]))})
   row['status']='REVIEW_REQUIRED'
  rows.append(row)
 result={'mode':'rules','modelUsed':None,'localFirst':True,'rows':rows,'downloadAfterActualVisualReviewOnly':True,'maxCandidatesPerProviderQuery':cfg['maxCandidatesPerQuery'],'newAssetDoesNotChangeFrozenTimeline':True}
 lib.save(out/'discovery.json',result);return result

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--config',default='orchestrator/config/asset-network-v1.json');sub=ap.add_subparsers(dest='command',required=True)
 sub.add_parser('keys')
 p=sub.add_parser('discover');p.add_argument('--brief',required=True);p.add_argument('--out',required=True);p.add_argument('--plan-only',action='store_true')
 p=sub.add_parser('configure');p.add_argument('--source',choices=['pexels','pixabay','coverr','unsplash'],required=True)
 p=sub.add_parser('search');p.add_argument('--source',choices=['pexels','pixabay','coverr','unsplash'],required=True);p.add_argument('--query',required=True);p.add_argument('--out',required=True)
 p=sub.add_parser('preview');p.add_argument('--candidate',required=True);p.add_argument('--out',required=True)
 p=sub.add_parser('inspect');p.add_argument('--candidate',required=True);p.add_argument('--receipt',required=True);p.add_argument('--out',required=True)
 p=sub.add_parser('fetch');p.add_argument('--candidate',required=True);p.add_argument('--out',required=True);p.add_argument('--transport',choices=['http','ffmpeg-copy'],default='http')
 p=sub.add_parser('layout');p.add_argument('--asset-id',required=True);p.add_argument('--start',type=float,default=0);p.add_argument('--seconds',type=float,default=3);p.add_argument('--out',required=True)
 args=ap.parse_args();cfg=lib.load(args.config)
 if args.command=='discover':
  r=discover(lib.load(args.brief),cfg,args.out,not args.plan_only);print(json.dumps({'gaps':len(r['rows']),'automaticDownload':False}));return
 if args.command=='keys':print(json.dumps({s:{'configured':bool(key_for(s,cfg)[0]),'configItem':v['keyEnv'],'signupUrl':v['signupUrl']} for s,v in cfg['providers'].items()},ensure_ascii=False));return
 if args.command=='configure':
  value=getpass.getpass('API key (hidden; never pass via chat/argv): ').strip()
  if not value:raise Blocked('Empty key')
  target=lib.path(cfg['credentialsRef']);target.parent.mkdir(parents=True,exist_ok=True);d=lib.load(target) if target.exists() else {};d[args.source]=value
  fd=os.open(target,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
  with os.fdopen(fd,'w') as f:json.dump(d,f);f.flush();os.fsync(f.fileno())
  os.chmod(target,0o600);print('Saved private configuration; no key output');return
 if args.command=='layout':
  catalog=lib.load(lib.load(cfg['libraryConfigRef'])['indexPath']);a=next(a for a in catalog['assets'] if a['assetId']==args.asset_id);r=layout(a,args.start,args.seconds,args.out);print(json.dumps({'path':r['path'],'fullSoftwareDecode':True}));return
 if args.command in ['preview','inspect']:
  candidate=lib.load(args.candidate);record=lib.load(args.receipt).get('record') if args.command=='inspect' else None
  result=image_preview(candidate,cfg,args.out) if candidate.get('mediaType')=='image' and not record else sample_frames(candidate,cfg,args.out,record);print(json.dumps({'status':result['status']}));
  if result['status']=='BLOCKED':raise SystemExit(2)
  return
 try:
  result=api_search(args.source,args.query,cfg) if args.command=='search' else fetch(lib.load(args.candidate),cfg,args.transport)
 except Blocked as e:result={'status':'BLOCKED','reason':str(e),'automaticRetry':False}
 lib.save(args.out,result);print(json.dumps({k:result[k] for k in ['status','reason'] if k in result},ensure_ascii=False))
 if result['status']=='BLOCKED':sys_exit=2;raise SystemExit(sys_exit)

if __name__=='__main__':main()
