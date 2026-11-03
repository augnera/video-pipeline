import datetime as dt
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('recovery', Path(__file__).with_name('recovery.py'))
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.patch = patch.object(r, 'LATCH', self.root / 'STOP.json')
        self.patch.start()

    def tearDown(self):
        self.patch.stop()
        self.tmp.cleanup()

    def review(self):
        evidence = self.root / 'review-evidence.txt'
        evidence.write_text('fixture only; never GPU authorization')
        item = {'status': 'SATISFIED', 'evidencePath': str(evidence),
                'sha256': hashlib.sha256(evidence.read_bytes()).hexdigest()}
        data = {'reviewedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
                **{name: item for name in r.REQUIRED}}
        path = self.root / 'review.json'
        path.write_text(json.dumps(data))
        return path, evidence

    def test_unresolved_review_is_blocked(self):
        self.assertTrue(r.assess(None))

    def test_evidence_change_invalidates_review(self):
        path, evidence = self.review()
        self.assertEqual(r.assess(path), [])
        evidence.write_text('changed')
        self.assertTrue(any('changed evidence' in s for s in r.assess(path)))

    def test_latch_survives_new_assessment(self):
        path, _ = self.review()
        r.stop('simulated device fault')
        self.assertTrue(any('persistent STOP' in s for s in r.assess(path)))
        self.assertIn('simulated device fault', r.LATCH.read_text())

    def test_stale_review_blocked(self):
        path, _ = self.review()
        data = json.loads(path.read_text())
        data['reviewedAt'] = '2020-01-01T00:00:00+00:00'
        path.write_text(json.dumps(data))
        self.assertTrue(any('last hour' in s for s in r.assess(path)))

    def test_host_loss_and_device_events_stop(self):
        p = self.root / 'host.jsonl'
        sample = {'utc': dt.datetime.now(dt.timezone.utc).isoformat(),
                  'gpu': r.UUID + ', 1, 33, 20, 0, None', 'error': None, 'deviceEvents': []}
        p.write_text(json.dumps(sample) + '\n')
        r.host_sample(p)
        for changes in [{'deviceEvents': [{'Id': 153}]}, {'error': 'permission denied'},
                        {'utc': '2020-01-01T00:00:00Z'}, {'gpu': 'different GPU'}]:
            p.write_text(json.dumps({**sample, **changes}) + '\n')
            with self.assertRaises(RuntimeError):
                r.host_sample(p)

    def test_resource_stop_thresholds(self):
        r.check_sample({'temperature.gpu': 33, 'memory.free': 40000, 'recoveryAction': 'None'})
        for values in [{'temperature.gpu': 75, 'memory.free': 40000},
                       {'temperature.gpu': 33, 'memory.free': 4095}]:
            with self.assertRaises(RuntimeError):
                r.check_sample({**values, 'recoveryAction': 'None'})
        with self.assertRaises(RuntimeError):
            r.check_sample({'temperature.gpu': 33, 'memory.free': 40000, 'recoveryAction': 'Reset'})

    def test_stage_a_does_not_require_dump_psu_or_28gib(self):
        path, _ = self.review()
        self.assertEqual(r.assess(path, 'A'), [])
        self.assertFalse(r.POLICY['stages']['A']['requiresIncidentDump'])
        self.assertFalse(r.POLICY['stages']['A']['requiresProvenRootCause'])
        self.assertFalse(r.POLICY['stages']['A']['requiresPsuSpecification'])
        self.assertEqual(r.POLICY['stages']['A']['minimumFreeMiB'], 4096)
        r.check_sample({'temperature.gpu': 33, 'memory.free': 5000, 'recoveryAction': 'None'})

    def test_stage_b_and_c_cannot_inherit_a_permission(self):
        path, _ = self.review()
        self.assertTrue(any('hardware_power_review' in x for x in r.assess(path, 'B')))
        self.assertTrue(any('sample resource budget' in x for x in r.assess(path, 'B')))
        self.assertTrue(any('production_authorization' in x for x in r.assess(path, 'C', 'production')))

    def test_external_host_must_cover_review_time(self):
        p = self.root / 'host.jsonl'
        now = dt.datetime.now(dt.timezone.utc)
        sample = {'utc': now.isoformat(), 'eventSinceUtc': now.isoformat(),
                  'gpu': r.UUID + ', 1, 33, 20, 0, None', 'error': None, 'deviceEvents': []}
        p.write_text(json.dumps(sample) + '\n')
        with self.assertRaises(RuntimeError):
            r.host_sample(p, now - dt.timedelta(minutes=1))

    def test_missing_review_never_enters_gpu_or_spawns_process(self):
        import argparse
        args = argparse.Namespace(out=self.root / 'blocked', cuda=True, review=None, host_log=None)
        with patch.object(r, 'gpu', side_effect=AssertionError('GPU must not be queried')), \
             patch.object(r.subprocess, 'Popen', side_effect=AssertionError('No child allowed')):
            self.assertEqual(r.watch(args), 2)

    def test_stage_b_power_gate_blocks_before_gpu_and_child(self):
        import argparse
        profile=json.loads(Path(r.__file__).with_name('wan21-profile.json').read_text())
        out=self.root/'sample'
        request=self.root/'request.json'
        request.write_text(json.dumps({'runId':'fixture-b','out':str(out),'profile':profile}))
        args=argparse.Namespace(out=out,cuda=False,review=None,host_log=self.root/'host.jsonl',sample_request=request,run_id='fixture-b')
        with patch.object(r,'gpu',side_effect=AssertionError('No GPU before review')), \
             patch.object(r.subprocess,'Popen',side_effect=AssertionError('No model before review')):
            self.assertEqual(r.watch(args),2)
        self.assertFalse((self.root/'sample-attempt-consumed.json').exists())

    def test_stage_b_profile_uses_supported_small_latent_and_no_acceleration(self):
        p=json.loads(Path(r.__file__).with_name('wan21-profile.json').read_text())
        self.assertEqual(p['width']%16,0);self.assertEqual(p['height']%16,0)
        self.assertEqual((p['frames']-1)%4,0);self.assertEqual(p['batchSize'],1)
        for flag in ['--disable-async-offload','--disable-pinned-memory','--disable-comfy-compiler','--disable-cuda-graphs','--disable-triton-backend','--disable-xformers']:
            self.assertIn(flag,p['comfyArgs'])
        self.assertEqual(p['maxSamplingAttempts'],1);self.assertFalse(p['automaticRetry'])

    def test_30_step_control_is_exact_and_only_changes_steps(self):
        old=json.loads(Path(r.__file__).with_name('wan21-profile.json').read_text())
        control=json.loads(Path(r.__file__).with_name('wan21-profile-30step.json').read_text())
        self.assertEqual(control,{**old,'steps':30})
        self.assertTrue(r.approved_sample_profile(control))
        self.assertFalse(r.approved_sample_profile({**control,'steps':31}))
        self.assertFalse(r.approved_sample_profile({**control,'width':720}))

    def test_realistic_prompt_control_only_changes_positive(self):
        old=json.loads(Path(r.__file__).with_name('wan21-profile-30step.json').read_text())
        new=json.loads(Path(r.__file__).with_name('wan21-profile-30step-realistic-prompt.json').read_text())
        self.assertNotEqual(old['prompt'],new['prompt'])
        self.assertTrue(new['prompt'].startswith(old['prompt']))
        self.assertEqual({k:v for k,v in new.items() if k!='prompt'},
                         {k:v for k,v in old.items() if k!='prompt'})
        self.assertTrue(r.approved_sample_profile(new))
        self.assertFalse(r.approved_sample_profile({**new,'negativePrompt':'changed'}))

    def test_portrait_resolution_profile_has_only_spatial_and_budget_changes(self):
        old=json.loads(Path(r.__file__).with_name('wan21-profile-30step-realistic-prompt.json').read_text())
        new=json.loads(Path(r.__file__).with_name('wan21-profile-480x832.json').read_text())
        allowed={'width','height','minimumFreeMiB','resourceBudget','stageTimeoutSeconds','totalChildTimeoutSeconds'}
        self.assertEqual({k:v for k,v in old.items() if k not in allowed},
                         {k:v for k,v in new.items() if k not in allowed})
        self.assertEqual((new['width'],new['height'],new['frames']),(480,832,17))
        self.assertEqual(5*(new['width']//16)*(new['height']//16),7800)
        self.assertGreaterEqual(new['minimumFreeMiB'],old['minimumFreeMiB'])
        self.assertTrue(r.approved_sample_profile(new))
        self.assertFalse(r.approved_sample_profile({**new,'frames':33}))


if __name__ == '__main__':
    unittest.main()
