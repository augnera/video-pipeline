"""CPU-only scene boundaries cache. Source Asset facts and rights stay in VideoPipeline."""
import os,json,pathlib,time,hashlib,subprocess
os.environ.update(CUDA_VISIBLE_DEVICES='',OPENCV_OPENCL_RUNTIME='disabled',OMP_NUM_THREADS='2')
import cv2
cv2.ocl.setUseOpenCL(False);cv2.setNumThreads(2)
from scenedetect import SceneManager
from scenedetect.detectors import ContentDetector
from scenedetect.backends.opencv import VideoCaptureAdapter
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'orchestrator/output/video-library-cpu-validation';lib=json.loads((ROOT/'local-assets/library/index.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
# Existing multi-shot review film is a reference-only container, never a new reusable stock Asset.
refs=[{'assetId':a['assetId'],'localPath':a['localPath'],'sha256':a['sha256'],'reusable':True,'usableSegments':a['usableSegments']} for a in lib['assets'] if a['mediaType']=='video']
p=ROOT/'orchestrator/output/day9-vp007/sample-with-bgm-plus3db.mp4'
if not p.exists():
 candidates=sorted((ROOT/'orchestrator/output/day9-vp007').glob('*.mp4'));p=next((x for x in candidates if 'sample' in x.name),None)
if p:
 refs.append({'assetId':None,'localPath':str(p.relative_to(ROOT)),'sha256':sha(p),'reusable':False,'usableSegments':[]})
rows=[];started=time.perf_counter()
for a in refs:
 t=time.perf_counter();src=ROOT/a['localPath'];assert sha(src)==a['sha256']
 cap=cv2.VideoCapture(str(src),cv2.CAP_FFMPEG,[cv2.CAP_PROP_HW_ACCELERATION,cv2.VIDEO_ACCELERATION_NONE])
 assert cap.isOpened(),src
 assert cap.get(cv2.CAP_PROP_HW_ACCELERATION)==cv2.VIDEO_ACCELERATION_NONE
 video=VideoCaptureAdapter(cap);manager=SceneManager();manager.add_detector(ContentDetector(threshold=27.0,min_scene_len=15));manager.auto_downscale=True
 manager.detect_scenes(video=video,show_progress=False);scenes=manager.get_scene_list(start_in_scene=True)
 segments=[]
 for i,(start,end) in enumerate(scenes):
  seg={'segmentId':a['sha256'][:16]+'-'+str(start.get_frames()),'start':start.get_seconds(),'end':end.get_seconds(),'startFrame':start.get_frames(),'endFrame':end.get_frames(),'description':None,'actions':[],'mood':[],'visibleText':[],'uncertainty':['Cut detector provides boundaries only; no automatic scene caption or action completion inference.'],'reviewStatus':'pending_human','frameEvidence':[]}
  # Render small evidence frames only for genuinely multi-shot sources.
  if len(scenes)>1:
   dest=OUT/'scene-previews';dest.mkdir(exist_ok=True)
   for k,sec in enumerate([seg['start'],(seg['start']+seg['end'])/2,max(seg['start'],seg['end']-.1)]):
    target=dest/(seg['segmentId']+'-'+str(k)+'.jpg')
    cmd=['ffmpeg','-v','error','-hwaccel','none','-threads','1','-ss',str(sec),'-i',str(src),'-frames:v','1','-vf','scale=320:-1','-threads','1','-y',str(target)]
    subprocess.run(cmd,check=True,timeout=30);seg['frameEvidence'].append({'path':str(target.relative_to(ROOT)),'timestampSeconds':sec,'sha256':sha(target),'command':cmd})
  segments.append(seg)
 cap.release();row=dict(a,segments=segments,sceneCount=len(segments),elapsedSeconds=time.perf_counter()-t,decoder='OpenCV FFmpeg backend; CAP_PROP_HW_ACCELERATION=VIDEO_ACCELERATION_NONE',openCL=False)
 rows.append(row);save(OUT/'scene-index.json',{'version':'scene-cache/1','tool':'PySceneDetect 0.7.2','algorithm':'ContentDetector threshold27 min_scene_len15','rows':rows,'elapsedSeconds':time.perf_counter()-started,'semantics':'No automatic caption generation; segment descriptions remain null until actual frame analysis. Reference film cuts cannot confer source reuse rights.'});print(a['localPath'],len(scenes),row['elapsedSeconds'],flush=True)
