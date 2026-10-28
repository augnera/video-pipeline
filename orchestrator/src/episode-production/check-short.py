import pathlib,json,subprocess,numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[3];OUT=ROOT/'orchestrator/output/microsoft-veo-skills-20261028-vp010';p=OUT/'transition-validation';rows=json.load(open(p/'results.json'))
for r in rows:
 if r.get('status')!='VERIFIED':continue
 f=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',r['path'],'-pix_fmt','rgb24','-f','rawvideo','-']),np.uint8).reshape(-1,640,360,3);d=r['durationFrames'];errs=[]
 for k,col in [(0,[33,72,119]),(6,[33,72,119]),(6+d-1,[211,138,64]),(len(f)-1,[211,138,64])]:errs.append(float(np.abs(np.median(f[k,70:100,145:180],axis=(0,1))-col).max()))
 middle=f[7:6+d-1,60:].astype(float);a=f[0,60:].astype(float);b=f[-1,60:].astype(float);delta=float(np.minimum(abs(middle-a).mean(axis=(1,2,3)),abs(middle-b).mean(axis=(1,2,3))).max());black=float((f.max(axis=3)<4).mean(axis=(1,2)).max());r['endpointColourErrors']=errs;r['middleDifferenceFromBothEndpoints']=delta;r['maxNearBlackFraction']=black;r['fullDecode']=True;r['status']='VERIFIED' if max(errs)<6 and delta>1 and black<.05 else 'FAILED'
(p/'results.json').write_text(json.dumps(rows,indent=2)+'\n');c=json.load(open(ROOT/'orchestrator/output/day9-vp008/transition-catalog.json'))
for e in c['effects']:
 tested=[r for r in rows if r.get('status')=='VERIFIED' and r.get('transitionId')==e['transitionId']];e['sourceValidatedDurationFrames']=e['validatedDurationFrames'];e['validatedDurationFrames']=[r['durationFrames'] for r in tested];e['episodeValidatedTiming']='endpoint-inclusive-linear';e['episodeValidationEvidence']='transition-validation/results.json'
(OUT/'transition-catalog.json').write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n');print([(r.get('transitionId'),r['durationFrames'],r['status']) for r in rows])
