"""No model imports: production CPU request boundary and no-GPU dispatch."""
import importlib.util,json,pathlib,subprocess,sys,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('cpu_adapter',ROOT/'orchestrator/src/production/cpu-voice.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class CpuDispatch(unittest.TestCase):
 def test_reject_gpu_before_resource_lookup(self):
  with self.assertRaisesRegex(ValueError,'CPU/FP32'):
   m.build_cpu_request({'config':{'voice':{'device':'cuda','precision':'fp32'},'paths':{'ttsServiceDir':'unused'}},'profile':{},'rhythm':{}})
 def test_runtime_refuses_gpu_without_starting_service(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'request.json';p.write_text(json.dumps({'config':{'voice':{'device':'cuda:0'}}}))
   r=subprocess.run([sys.executable,str(ROOT/'orchestrator/src/production/voice-runtime.py'),str(p)],capture_output=True,text=True)
   self.assertNotEqual(r.returncode,0);self.assertIn('GPU_TTS_STOP',r.stderr)
 def test_cpu_request_validates_frozen_text(self):
  c=json.loads((ROOT/'orchestrator/config/production-v1.json').read_text());c['paths'].update(ttsServiceDir='unused',ttsPython='unused',ttsModelSource='unused',ttsModelDirectory='unused')
  with self.assertRaisesRegex(ValueError,'Narration/rhythm mismatch'):
   m.build_cpu_request({'config':c,'profile':{},'rhythm':{'text':'原文','segments':[{'text':'改文'}],'textSha256':'bad'}})
class OutputFilenameRegression(unittest.TestCase):
 def test_full_voice_is_read_without_short_sample_file(self):
  import wave,math,struct
  spec=importlib.util.spec_from_file_location('runner',ROOT/'experiments/indextts-cpu/run.py');runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)
  with tempfile.TemporaryDirectory() as d:
   out=pathlib.Path(d)
   with wave.open(str(out/'voice.wav'),'wb') as f:
    f.setnchannels(1);f.setsampwidth(2);f.setframerate(8000);f.writeframes(b''.join(struct.pack('<h',int(1000*math.sin(i*.2))) for i in range(16000)))
   self.assertFalse((out/'sample.wav').exists())
   y,sr,duration=runner.read_generated_audio(out,{'outputFilename':'voice.wav','maximumAudioSeconds':360})
   self.assertEqual(sr,8000);self.assertEqual(duration,2)
if __name__=='__main__':unittest.main()
