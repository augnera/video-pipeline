import pathlib,json,subprocess
root=pathlib.Path(__file__).resolve().parents[3];out=root/'orchestrator/output/day9-vp008/compatibility'
r=json.loads((out/'results.json').read_text());checks=[]
for item in r['results']:
 p=root/item['path'];decoded=subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],capture_output=True)
 stream=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,nb_read_frames','-of','json',str(p)]))['streams'][0]
 ok=decoded.returncode==0 and (stream['width'],stream['height'],stream['r_frame_rate'],int(stream['nb_read_frames']))==(360,640,'30/1',30)
 checks.append({**item,'fullDecode':decoded.returncode==0,'media':stream,'technicalStatus':'VERIFIED' if ok else 'FAILED','humanEvaluation':'NOT_EVALUATED'})
r['results']=checks;r['technicalSummary']={'VERIFIED':sum(c['technicalStatus']=='VERIFIED' for c in checks),'FAILED':sum(c['technicalStatus']=='FAILED' for c in checks)}
(out/'results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(r['technicalSummary'])
