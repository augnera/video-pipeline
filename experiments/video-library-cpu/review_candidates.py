"""Build CPU-only interval evidence/preview; review conclusions are separate, never generated from CLIP scores."""
from pathlib import Path
import json,subprocess,time,hashlib
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'orchestrator/output/video-library-cpu-validation'
lib=json.loads((ROOT/'local-assets/library/index.json').read_text());byid={a['assetId']:a for a in lib['assets']};r=json.loads((OUT/'queries/retrieval-results.json').read_text())
cache={};rows=[];t=time.perf_counter();previews=[]
for row in r['rows']:
 for hit in row['top3']:
  a=byid[hit['assetId']];interval=hit['usableIntersection'];start=interval['start'] if interval else a['usableSegments'][0]['start'];duration=min(row['request']['durationSeconds'],a['usableSegments'][0]['end']-start) if not interval else row['request']['durationSeconds'];end=start+duration
  key=(a['assetId'],round(start,3),round(end,3));frames=[]
  if key not in cache:
   dest=OUT/'candidate-previews';dest.mkdir(exist_ok=True)
   for i in range(6):
    sec=start+duration*i/6;p=dest/(a['assetId']+'-'+str(round(start,3))+'-'+str(round(end,3))+'-'+str(i)+'.jpg')
    cmd=['ffmpeg','-v','error','-hwaccel','none','-threads','1','-ss',str(sec),'-i',str(ROOT/a['localPath']),'-frames:v','1','-vf','scale=400:-1','-threads','1','-y',str(p)]
    subprocess.run(cmd,check=True,timeout=20);frames.append({'path':str(p.relative_to(ROOT)),'timestampSeconds':sec,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
   cache[key]=frames
  frames=cache[key];hit['reviewInterval']={'start':start,'end':end};hit['intervalFrameEvidence']=frames
  rows.append((row['request']['requestId'],a['assetId'],hit['rank'],frames))
 # One actual short motion preview per need that has an eligible source; source is not modified/copied whole.
 choice=next((x for x in row['top3'] if x['eligible']),None)
 if choice:
  a=byid[choice['assetId']];s=choice['reviewInterval'];p=OUT/'candidate-previews'/(row['request']['requestId']+'-'+a['assetId']+'.mp4')
  cmd=['ffmpeg','-v','error','-hwaccel','none','-threads','1','-ss',str(s['start']),'-i',str(ROOT/a['localPath']),'-t',str(s['end']-s['start']),'-an','-vf','scale=480:-2','-c:v','libx264','-preset','fast','-crf','23','-threads','1','-y',str(p)]
  subprocess.run(cmd,check=True,timeout=30);previews.append({'requestId':row['request']['requestId'],'assetId':a['assetId'],'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'sourceSha256':a['sha256'],'sourceRange':s,'command':cmd,'derivativeOnly':True})
r['previews']=previews;r['previewGenerationSeconds']=time.perf_counter()-t
(OUT/'candidate-evidence.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
for part in range(2):
 group=rows[part*15:(part+1)*15];im=Image.new('RGB',(1200,len(group)*230),'#141625');d=ImageDraw.Draw(im)
 for i,(need,aid,rank,frames) in enumerate(group):
  d.text((4,i*230),need+' rank'+str(rank)+' '+aid,fill='white')
  for j,f in enumerate(frames):
   pic=Image.open(ROOT/f['path']);pic.thumbnail((195,185));im.paste(pic,(j*200,i*230+23));d.text((j*200,i*230+211),str(round(f['timestampSeconds'],2)),fill='white')
 im.save(OUT/('top3-intervals-'+str(part+1)+'.jpg'))
print('candidates',len(rows),'unique intervals',len(cache),'motion previews',len(previews),'elapsed',r['previewGenerationSeconds'])
