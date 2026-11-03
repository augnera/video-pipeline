"""Bounded CPU-only IndexTTS2 synthesis using existing pinned assets. Existing assets; no service/config mutation."""
import argparse, datetime, hashlib, importlib.util, json, os, pathlib, signal, socket, subprocess, sys, time, traceback, uuid
ROOT=pathlib.Path(__file__).resolve().parents[2]
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(p):
 with pathlib.Path(p).open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def save(p,data):
 with pathlib.Path(p).open('w') as f:json.dump(data,f,ensure_ascii=False,indent=2);f.flush();os.fsync(f.fileno())
def event(out,stage,**data):
 row=dict(utc=now(),runId=out.name,stage=stage,**data)
 with (out/'stages.jsonl').open('a') as f:f.write(json.dumps(row,ensure_ascii=False)+'\n');f.flush();os.fsync(f.fileno())
 print(json.dumps(row,ensure_ascii=False),flush=True)
def load(name,p):
 spec=importlib.util.spec_from_file_location(name,p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
def read_generated_audio(out,config):
 import numpy as np,soundfile as sf
 output=out/config.get('outputFilename','sample.wav')
 y,sr=sf.read(output,dtype='float32')
 assert y.size and np.isfinite(y).all() and np.max(np.abs(y))>1e-4
 duration=len(y)/sr;assert 1<duration<config.get('maximumAudioSeconds',30)
 return y,sr,duration
def child(out):
 config=json.loads((out/'request.json').read_text()); attempts=[]
 try:
  assert os.environ['CUDA_VISIBLE_DEVICES']=='-1'
  event(out,'cpu_bootstrap_started',pid=os.getpid())
  # Retain network restrictions from approved endpoint; no model downloads.
  def deny_network(self,address):raise OSError('External networking disabled for CPU trial')
  socket.socket.connect=deny_network;socket.socket.connect_ex=deny_network
  import torch
  sys.path.insert(0,str(ROOT/'experiments/local-video-recovery'))
  guard=load('existing_cpu_guard',ROOT/'experiments/local-video-recovery/cpu-reference-decode.py')
  guard.install_cuda_guard(torch,attempts)
  assert not torch.cuda.is_initialized()
  torch.set_num_threads(config.get('threads',8));torch.set_num_interop_threads(2)
  import numpy as np, soundfile as sf, random
  source=pathlib.Path(config['modelSource']);weights=pathlib.Path(config['modelDirectory'])
  assert subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()==config['sourceRevision']
  assets=json.loads(pathlib.Path(config['assetManifest']).read_text())
  for asset in assets:
   p=pathlib.Path(asset['path']);assert p.stat().st_size==asset['bytes'] and sha(p)==asset['sha256'],str(p)
  for item in config['inputs']:assert sha(item['path'])==item['sha256']
  event(out,'assets_verified',assetCount=len(assets),bytes=sum(x['bytes'] for x in assets),torch=torch.__version__,cudaInitialized=False)
  os.chdir(source);sys.path.insert(0,str(source))
  from indextts.infer_v2 import IndexTTS2
  event(out,'model_loading_started',device='cpu',precision='fp32');start=time.monotonic()
  model=IndexTTS2(cfg_path=str(weights/'config.yaml'),model_dir=str(weights),device='cpu',use_fp16=False,use_cuda_kernel=False,use_deepspeed=False,use_accel=False,use_torch_compile=False,use_qwen_emo=False,aux_paths={'w2v_bert':str(weights/'aux/w2v-bert-2.0'),'semantic_codec':str(weights/'aux/maskgct/semantic_codec/model.safetensors'),'campplus':str(weights/'aux/campplus/campplus_cn_common.bin'),'bigvgan':str(weights/'aux/bigvgan')})
  audit={}
  for name in ['gpt','semantic_model','semantic_codec','s2mel','campplus_model','bigvgan']:
   module=getattr(model,name);devices=sorted({str(x.device) for x in list(module.parameters())+list(module.buffers())});assert all(x=='cpu' for x in devices),devices;audit[name]={'devices':devices,'parameterDtypes':sorted({str(x.dtype) for x in module.parameters()})}
  assert not torch.cuda.is_initialized() and not attempts
  save(out/'device-audit.json',audit);event(out,'model_loading_completed',loadSeconds=time.monotonic()-start,cudaInitialized=False)
  adapter=load('approved_rhythm',config['rhythmAdapterPath']);adapter.install_rhythm(model,json.loads((out/'rhythm-plan.json').read_text()),out/'rhythm-audit.json',config['text'])
  observer=load('existing_finite_observer',ROOT/'orchestrator/src/production/tts-finite-observer.py');handle=observer.install_observer(model,out/'numerical-observations')
  # Actual first entry/return of existing forward paths, not invented model stages.
  seen=set()
  for name in ['s2mel','bigvgan']:
   module=getattr(model,name)
   def before(module,args,label=name):
    if label not in seen:seen.add(label);event(out,label+'_forward_first_entered')
   module.register_forward_pre_hook(before)
  random.seed(config['seed']);np.random.seed(config['seed']);torch.manual_seed(config['seed'])
  event(out,'synthesis_started',text=config['text'],seed=config['seed']);start=time.monotonic()
  result=model.infer(spk_audio_prompt=config['speakerWav'],text=config['text'],output_path=str(out/config.get('outputFilename','sample.wav')),emo_audio_prompt=config['emotionWav'],emo_alpha=config['emoAlpha'],**config['inference'])
  elapsed=time.monotonic()-start
  assert result is not None and (out/config.get('outputFilename','sample.wav')).is_file()
  event(out,'synthesis_completed',generationSeconds=elapsed)
  y,sr,duration=read_generated_audio(out,config)
  p=subprocess.run(['ffmpeg','-v','error','-xerror','-hwaccel','none','-i',str(out/config.get('outputFilename','sample.wav')),'-f','null','-'],capture_output=True,text=True);assert p.returncode==0,p.stderr
  assert not torch.cuda.is_initialized() and not attempts
  validation={'status':'CPU_SAMPLE_TECHNICAL_PASS','audio':str(out/config.get('outputFilename','sample.wav')),'sha256':sha(out/config.get('outputFilename','sample.wav')),'durationSeconds':duration,'sampleRate':sr,'channels':1 if y.ndim==1 else y.shape[1],'generationSeconds':elapsed,'realTimeFactor':elapsed/duration,'samplePeakDbFS':float(20*np.log10(np.max(np.abs(y)))),'fullSoftwareDecode':True,'cudaInitialized':False,'cudaGuardCalls':attempts,'deviceAudit':audit,'subjectiveVoiceSimilarity':'NOT_EVALUATED','subjectiveNaturalness':'NOT_EVALUATED','fullEpisodeProven':config.get('mode')=='full_episode','gpuStopPreserved':True}
  save(out/'validation.json',validation);event(out,'validation_completed',**validation)
 except BaseException as e:
  traceback.print_exc();save(out/'failure.json',{'utc':now(),'error':str(e),'cudaGuardCalls':attempts,'status':'STOP_NO_RETRY'});event(out,'failed',error=str(e));raise
 finally:
  save(out/'cuda-guard-result.json',{'attempts':attempts,'cudaInitialized':bool(sys.modules.get('torch') and sys.modules['torch'].cuda.is_initialized())})
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--child',type=pathlib.Path);parser.add_argument('--out',type=pathlib.Path);parser.add_argument('--episode',type=pathlib.Path);parser.add_argument('--request',type=pathlib.Path);a=parser.parse_args()
 if a.child:return child(a.child.resolve())
 if not a.out:parser.error('--out required')
 out=a.out.resolve();out.mkdir(parents=True,exist_ok=False)
 available=int(next(l.split()[1] for l in pathlib.Path('/proc/meminfo').read_text().splitlines() if l.startswith('MemAvailable:')))*1024
 assert available>40*1024**3,'Insufficient available CPU RAM'
 if a.request:
  supplied=json.loads(a.request.read_text());plan=supplied.pop('rhythmPlan');request=supplied;assert request['device']=='cpu' and request['precision']=='fp32'
 else:
  original=ROOT/'orchestrator/output/ai-programming-20261102/tts-fp32/experiment-config.json';config=json.loads(original.read_text());text='去年，我花了几千块钱学AI编程。'
  plan=json.loads(pathlib.Path(config['rhythmPlan']).read_text());assert plan['segments'][0]['text']==text
  if a.episode:
   script=json.loads(a.episode.read_text());text=''.join(x['narration'] for x in script['shots']);assert text==plan['text'] and ''.join(x['text'] for x in plan['segments'])==text
   assert next(x for x in script['shots'] if x['shotNumber']==9)['narration']==''
  else:plan.update(text=text,textSha256=hashlib.sha256(text.encode()).hexdigest(),segments=[plan['segments'][0]])
  adapter='/home/chen/ai-services/indextts2/experiments/r5-rhythm1/rhythm-adapter-generation-rms.py'
  request={k:config[k] for k in ['sourceRevision','modelRevision','speakerWav','emotionWav','seed','inference']};request.update(text=text,emoAlpha=.6,modelSource='/home/chen/ai-models/IndexTTS2',modelDirectory='/home/chen/ai-models-data/indextts2',assetManifest='/home/chen/ai-services/indextts2/manifests/downloaded-assets.json',rhythmAdapterPath=adapter,inputs=[i for i in config['inputs'] if i['path'] in [config['speakerWav'],config['emotionWav'],adapter]],device='cpu',precision='fp32',maximumRuntimeSeconds=600,maximumResidentBytes=32*1024**3,threads=8,originalConfigurationSha256=sha(original),runnerSha256=sha(__file__),gpuStopPreserved=True,scope='one short private CPU-only voice trial; not full production')
  if a.episode:request.update(mode='full_episode',outputFilename='voice.wav',maximumAudioSeconds=360,maximumRuntimeSeconds=3600,scope='authorized complete episode narration; excludes external-media shot9',episodeScript=str(a.episode.resolve()),episodeScriptSha256=sha(a.episode),preservedShortSampleSha256=sha(ROOT/'orchestrator/output/indextts-cpu/20261103-short-01/sample.wav'))
 request['runnerSha256']=sha(__file__)
 save(out/'request.json',request);save(out/'rhythm-plan.json',plan)
 stopFiles=[ROOT/'orchestrator/output/ai-programming-20261102/STOP-GPU-TTS.json',ROOT/'orchestrator/output/gpu-incident-005/20261102-post-reboot/STOP.json'];protected=[{'path':str(p),'sha256':sha(p)} for p in stopFiles]
 save(out/'protected-inputs.json',protected);save(out/'STOP.json',{'status':'CPU_SINGLE_ATTEMPT_RESERVED_NO_RETRY','utc':now(),'gpuStopUnchanged':True})
 env=os.environ.copy();env.update(CUDA_VISIBLE_DEVICES='-1',NVIDIA_VISIBLE_DEVICES='none',HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',HF_HUB_DISABLE_TELEMETRY='1',TOKENIZERS_PARALLELISM='false',PYTHONDONTWRITEBYTECODE='1',OMP_NUM_THREADS='8',MKL_NUM_THREADS='8',NLTK_DATA='/home/chen/ai-services/indextts2/cache/nltk',NUMBA_CACHE_DIR='/home/chen/ai-services/indextts2/cache/numba',MPLCONFIGDIR='/home/chen/ai-services/indextts2/cache/matplotlib',HF_HOME='/home/chen/ai-services/indextts2/cache/huggingface')
 env['OMP_NUM_THREADS']=env['MKL_NUM_THREADS']=str(request.get('threads',8))
 cmd=[request.get('python','/home/chen/ai-services/indextts2/venv/bin/python'),'-u',str(pathlib.Path(__file__).resolve()),'--child',str(out)];started=time.monotonic()
 with (out/'stdout.log').open('wb') as stdout,(out/'stderr.log').open('wb') as stderr:
  proc=subprocess.Popen(cmd,env=env,stdout=stdout,stderr=stderr,start_new_session=True);os.setpriority(os.PRIO_PROCESS,proc.pid,10)
  save(out/'run.json',{'runId':out.name,'startedUtc':now(),'pid':proc.pid,'command':cmd,'status':'CPU_RUNNING','gpuExecution':False,'retry':False,'availableBytesAtStart':available});reason=None;peak=0
  while proc.poll() is None:
   try:
    status=pathlib.Path(f'/proc/{proc.pid}/status').read_text();rss=int(next(l.split()[1] for l in status.splitlines() if l.startswith('VmRSS:')))*1024;peak=max(peak,rss)
   except (OSError,StopIteration):rss=None
   event(out,'cpu_process_monitor',pid=proc.pid,rssBytes=rss,elapsedSeconds=time.monotonic()-started)
   if time.monotonic()-started>request['maximumRuntimeSeconds'] or (rss and rss>request.get('maximumResidentBytes',32*1024**3)):
    reason='TIMEOUT' if time.monotonic()-started>request['maximumRuntimeSeconds'] else 'RSS_LIMIT';os.killpg(proc.pid,signal.SIGTERM)
    try:proc.wait(timeout=10)
    except subprocess.TimeoutExpired:os.killpg(proc.pid,signal.SIGKILL)
    break
   time.sleep(5)
  rc=proc.wait()
 for r in protected:assert sha(r['path'])==r['sha256']
 save(out/'exit.json',{'endedUtc':now(),'exitCode':rc,'stopReason':reason,'elapsedSeconds':time.monotonic()-started,'peakChildRssBytes':peak,'gpuStopsUnchanged':True,'status':'CPU_TRIAL_FINISHED' if rc==0 else 'STOP_NO_RETRY'})
 print(str(out),flush=True)
 if rc!=0:raise SystemExit(rc if rc>0 else 1)
if __name__=='__main__':main()
