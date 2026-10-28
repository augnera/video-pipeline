"""Adapter to the already approved scoped IndexTTS2 service. No installation/model changes."""
import pathlib,json,os,sys,subprocess,time,urllib.request,urllib.error,hashlib
request=json.load(open(sys.argv[1]));out=pathlib.Path(request['out']);cfg=request['config'];profile=request['profile'];plan=request['rhythm'];service=pathlib.Path(cfg['paths']['ttsServiceDir']);python=cfg['paths']['ttsPython'];experiment='routine-'+request['fingerprint'][:20]
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
configPath=out/'experiment-config.json';state=out/'attempt-state.json';voice=out/'voice.wav'
if state.exists():
 s=json.load(open(state));completed=next((a for a in s['attempts'] if a.get('status')=='completed'),None)
 if completed and voice.exists() and sha(voice)==completed['sha256']:
  print('Reusing completed inference after interrupted downstream processing');sys.exit(0)
 if s['attempts']:raise RuntimeError('TTS_ATTEMPT_REVIEW: an attempt already started/failed; refusing an automatic repeat')
base={k:profile[k] for k in ['sourceRevision','modelRevision','speakerWav','emotionWav','referenceText']};base.update(scope='private noncommercial technical evaluation only',experiment=experiment,outputDir=str(out),text=plan['text'],textSha256=plan['textSha256'],seed=cfg['voice']['seed'],inference=cfg['voice']['inference'],trials={'full':{'emo_alpha':cfg['voice']['emoAlpha'],'file':'voice.wav'}},maximumValidAudioSeconds=cfg['voice']['maxAudioSeconds'],rhythmPlan=str(out/'rhythm-plan.json'),rhythmAdapterPath=str(service/'experiments/r5-rhythm1/rhythm-adapter-generation-rms.py'))
(out/'rhythm-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2));base['inputs']=[dict(path=p,sha256=sha(p)) for p in [base['speakerWav'],base['emotionWav'],base['rhythmPlan'],base['rhythmAdapterPath']]];configPath.write_text(json.dumps(base,ensure_ascii=False,indent=2))
def health():return json.loads(urllib.request.urlopen('http://127.0.0.1:9881/health',timeout=3).read())
process=None
try:
 try:h=health()
 except urllib.error.HTTPError as e:raise RuntimeError('TTS_BUSY: unexpected existing HTTP service on9881; no model started') from e
 except OSError:h=None
 if h and h.get('experiment')!=experiment:raise RuntimeError('TTS_BUSY: port9881 belongs to a different run; do not terminate it')
 if not h:
  env=os.environ.copy();env['VP_INDEXTTS_EXPERIMENT_CONFIG']=str(configPath)
  log=open(out/'service.log','ab');process=subprocess.Popen([python,str(service/'serve.py')],env=env,stdout=log,stderr=log)
  for _ in range(120):
   if process.poll() is not None:raise RuntimeError('Approved TTS failed to start; see service.log')
   try:h=health();break
   except OSError:time.sleep(2)
  else:raise RuntimeError('TTS readiness timeout')
 if h.get('experiment')!=experiment or h.get('status')!='ready':raise RuntimeError('TTS state mismatch')
 req=urllib.request.Request('http://127.0.0.1:9881/tts',data=b'{"trial":"full"}',headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=1800) as r:
  body=r.read();assert r.status==200 and voice.exists() and hashlib.sha256(body).hexdigest()==sha(voice)
 print('Approved fixed-configuration TTS completed once')
finally:
 if process is not None:
  process.terminate()
  try:process.wait(timeout=20)
  except subprocess.TimeoutExpired:process.kill();process.wait()
