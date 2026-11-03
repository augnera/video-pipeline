"""VideoSeek fixed-source CPU experiment. Never starts CUDA or a desktop app."""
import os,sys,json,time,pathlib,argparse,hashlib,traceback
ROOT=pathlib.Path(__file__).resolve().parents[2]
BASE=ROOT/'local-assets/experiments/video-library-cpu'
OUT=ROOT/'orchestrator/output/video-library-cpu-validation'
UP=BASE/'upstream/VideoSeek'
os.environ.update(LOCALAPPDATA=str(BASE/'app-state'),VIDEOSEEK_INFERENCE_EP='cpu',VIDEOSEEK_FORCE_HW_DECODE='0',VIDEOSEEK_FFMPEG_THREADS='2',CUDA_VISIBLE_DEVICES='',OPENCV_OPENCL_RUNTIME='disabled',QT_QPA_PLATFORM='offscreen',OMP_NUM_THREADS='4',OPENBLAS_NUM_THREADS='4')
# Constrain this CPU experiment, without changing system/service affinity.
if hasattr(os,'sched_getaffinity'):os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:4])
sys.path.insert(0,str(UP));OUT.mkdir(parents=True,exist_ok=True)
def save(name,d):(OUT/name).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def configure():
 from src.app.config import load_config,save_config
 c=load_config();c.update(prefer_gpu=False,inference_ep='cpu',experimental_hw_decode=False,experimental_hw_decode_enabled=False,fps=1,embedding_batch_size=2,model_dir=str(BASE/'models'),index_workers=1,indexing_workers=1,agent_api_enabled=True,search_mode='frame',similarity_threshold=0.7,ffmpeg_path='/usr/bin/ffmpeg')
 for profile in c.get('models',{}).get('profiles',[]):
  profile.setdefault('runtime',{}).update(prefer_gpu=False,model_dir=str(BASE/'models'),inference_ep='cpu')
 save_config(c)
 from src.core.onnx_session import resolve_onnx_providers
 assert resolve_onnx_providers(prefer_gpu=False,config=c)==['CPUExecutionProvider']
 return c

def check():
 import importlib.metadata as md,onnxruntime as ort,cv2
 cv2.ocl.setUseOpenCL(False);c=configure()
 gpu_pkgs=[d.metadata['Name'] for d in md.distributions() if any(x in d.metadata['Name'].lower() for x in ['torch','cuda','directml','onnxruntime-gpu'])]
 assert not gpu_pkgs,gpu_pkgs
 save('cpu-preflight.json',{'python':sys.version,'platform':sys.platform,'availableProviders':ort.get_available_providers(),'selectedProviders':['CPUExecutionProvider'],'opencvOpenCL':cv2.ocl.useOpenCL(),'gpuPackages':gpu_pkgs,'config':{k:c[k] for k in ['prefer_gpu','inference_ep','fps','embedding_batch_size','model_dir','experimental_hw_decode']},'upstreamCommit':'c9e13d699714e13df99579cc88ffaf532e1371c6'})
 print('CPU preflight PASS',flush=True)

def index():
 check();c=configure();t=time.perf_counter()
 from src.core.clip_embedding import get_engine
 engine=get_engine();assert engine.active_providers=={'visual':['CPUExecutionProvider'],'text':['CPUExecutionProvider']},engine.active_providers
 save('cpu-actual-sessions.json',{'providers':engine.active_providers,'backend':engine.backend_label,'usingGPU':engine.using_gpu,'modelLoadSeconds':time.perf_counter()-t})
 from src.services.library_service import add_library,register_library_videos
 from src.services.indexing_service import scan_target_libraries
 from src.storage.asset_store import load_model_metadata,save_model_metadata
 from src.storage.video_identity import get_video_hash
 lib=json.loads((ROOT/'local-assets/library/index.json').read_text());stage=BASE/'selected-media';stage.mkdir(exist_ok=True);mapping=[]
 for a in lib['assets']:
  if a['mediaType']!='video':continue
  src=ROOT/a['localPath'];dst=stage/(a['sha256']+src.suffix)
  if not dst.exists():dst.symlink_to(src)
  assert sha(dst)==a['sha256']
  mapping.append({'assetId':a['assetId'],'sha256':a['sha256'],'originalPath':a['localPath'],'videoSeekPath':str(dst),'sourceType':a['sourceType'],'licenseStatus':a['licenseStatus'],'reviewStatus':a['reviewStatus']})
 save('selected-assets.json',{'assets':mapping,'imageAssetsNotSupportedByVideoLibrary':[a['assetId'] for a in lib['assets'] if a['mediaType']=='image']})
 add_library(str(stage));save('register-result.json',register_library_videos(config=c,library_path=str(stage)));meta=load_model_metadata(config=c);issues=[]
 start=time.perf_counter()
 result=scan_target_libraries(meta,c,get_video_hash,target_lib=str(stage),video_ids=[get_video_hash(str(stage/(a['sha256']+pathlib.Path(a['localPath']).suffix))) for a in lib['assets'] if a['mediaType']=='video'],persist_meta_callback=lambda *_a,**_k:save_model_metadata(meta,config=c),issue_callback=lambda x:issues.append(x),progress_callback=lambda *x:print('INDEX',*x,flush=True))
 save_model_metadata(meta,config=c)
 save('index-result.json',{'elapsedSeconds':time.perf_counter()-start,'totalElapsedSeconds':time.perf_counter()-t,'result':str(result),'issues':issues,'metadata':meta,'providers':engine.active_providers})
 print('INDEX_DONE',flush=True)

def serve(port):
 check();configure()
 from src.core.clip_embedding import get_engine
 engine=get_engine();assert engine.active_providers=={'visual':['CPUExecutionProvider'],'text':['CPUExecutionProvider']} and not engine.using_gpu
 save('api-cpu-actual-sessions.json',{'providers':engine.active_providers,'usingGPU':engine.using_gpu,'backend':engine.backend_label,'pid':os.getpid(),'baseUrl':'http://127.0.0.1:'+str(port)})
 from src.web.agent_api.service import AgentApiService
 import uvicorn
 service=AgentApiService(host='127.0.0.1',port=port)
 uvicorn.run(service.app,host='127.0.0.1',port=port,log_level='info')

ap=argparse.ArgumentParser();ap.add_argument('command',choices=['check','index','serve']);ap.add_argument('--port',type=int,default=18765);ap.add_argument('--out');args=ap.parse_args()
if args.out:
 OUT=pathlib.Path(args.out).resolve();OUT.mkdir(parents=True,exist_ok=True)
try:
 {'check':check,'index':index,'serve':lambda:serve(args.port)}[args.command]()
except Exception as e:
 save('failure-'+args.command+'-'+str(time.time_ns())+'.json',{'error':str(e),'traceback':traceback.format_exc()});raise
