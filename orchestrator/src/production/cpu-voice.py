"""CPU adapter for existing production voice JSON; no HTTP or GPU fallback."""
import hashlib,json,pathlib,shutil,subprocess,sys,time
ROOT=pathlib.Path(__file__).resolve().parents[3]
def sha(path):
 with pathlib.Path(path).open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def build_cpu_request(request):
 c=request['config'];v=c['voice'];paths=c['paths'];p=request['profile'];plan=request['rhythm'];service=pathlib.Path(paths['ttsServiceDir'])
 if v.get('device')!='cpu' or v.get('precision')!='fp32':raise ValueError('CPU/FP32 required; GPU remains STOP')
 for key in ['ttsModelSource','ttsModelDirectory','ttsPython']:
  if not paths.get(key):raise ValueError('Configure local path: '+key)
 cpu=v['cpu'];threads=cpu['threads'];timeout=cpu['maximumRuntimeSeconds'];rss=cpu['maximumResidentGiB']
 if not isinstance(threads,int) or not 1<=threads<=8 or not 60<=timeout<=3600 or not 8<=rss<=32:raise ValueError('CPU resource limits outside reviewed bounds')
 if plan['text']!=''.join(s['text'] for s in plan['segments']) or hashlib.sha256(plan['text'].encode()).hexdigest()!=plan['textSha256']:raise ValueError('Narration/rhythm mismatch')
 adapter=service/'experiments/r5-rhythm1/rhythm-adapter-generation-rms.py'
 result={k:p[k] for k in ['sourceRevision','modelRevision','speakerWav','emotionWav']}
 result.update(text=plan['text'],rhythmPlan=plan,rhythmAdapterPath=str(adapter),inputs=[{'path':str(x),'sha256':sha(x)} for x in [p['speakerWav'],p['emotionWav'],adapter,ROOT/'experiments/local-video-recovery/cpu-reference-decode.py',ROOT/'orchestrator/src/production/tts-finite-observer.py']],modelSource=paths['ttsModelSource'],modelDirectory=paths['ttsModelDirectory'],assetManifest=str(service/'manifests/downloaded-assets.json'),python=paths['ttsPython'],seed=v['seed'],emoAlpha=v['emoAlpha'],inference=dict(v['inference']),device='cpu',precision='fp32',threads=threads,maximumRuntimeSeconds=timeout,maximumResidentBytes=int(rss*1024**3),outputFilename='voice.wav',maximumAudioSeconds=v['maxAudioSeconds'],mode='production_narration',gpuStopPreserved=True)
 result['inference']['repetition_penalty']=float(result['inference']['repetition_penalty'])
 return result

def main():
 request=json.loads(pathlib.Path(sys.argv[1]).read_text());out=pathlib.Path(request['out']);cpu=build_cpu_request(request);run=out/'cpu-execution';state=out/'attempt-state.json'
 fingerprint=hashlib.sha256(json.dumps({'request':cpu,'runnerSha256':sha(ROOT/'experiments/indextts-cpu/run.py'),'adapterSha256':sha(__file__)},sort_keys=True).encode()).hexdigest()
 if state.exists():
  old=json.loads(state.read_text());done=next((x for x in old.get('attempts',[]) if x.get('status')=='completed'),None)
  if done and done.get('fingerprint')==fingerprint and (out/'voice.wav').exists() and sha(out/'voice.wav')==done['sha256']:return
  if old.get('attempts'):raise RuntimeError('Prior CPU attempt needs review; no automatic retry')
 fn=out/'cpu-request.json';fn.write_text(json.dumps(cpu,ensure_ascii=False,indent=2));record={'attempts':[{'trial':'full','status':'started','startedAt':time.time(),'device':'cpu','fingerprint':fingerprint}],'halted':False};state.write_text(json.dumps(record,indent=2))
 try:
  subprocess.run([request['config']['paths']['python'],str(ROOT/'experiments/indextts-cpu/run.py'),'--request',str(fn),'--out',str(run)],check=True)
  for name in ['voice.wav','rhythm-audit.json']:shutil.copy2(run/name,out/name)
  record['attempts'][0].update(status='completed',sha256=sha(out/'voice.wav'),endedAt=time.time());state.write_text(json.dumps(record,indent=2))
 except BaseException as e:
  record['halted']=True;record['attempts'][0].update(status='failed',error=str(e),endedAt=time.time());state.write_text(json.dumps(record,indent=2));raise
if __name__=='__main__':main()
