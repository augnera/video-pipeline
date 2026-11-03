import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest

sys.path.insert(0, str(Path(__file__).parent))
from run import resources, stop_group, append, snapshot


class RunnerTests(unittest.TestCase):
    def test_durable_records(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            append(p/'stages.jsonl', {'stage':'fixture_started'})
            snapshot(p/'state.json', {'status':'fixture'})
            self.assertEqual(json.loads((p/'stages.jsonl').read_text())['stage'], 'fixture_started')
            self.assertTrue(json.loads((p/'stages.jsonl').read_text())['utc'].endswith('+00:00'))
            self.assertEqual(json.loads((p/'state.json').read_text())['status'],'fixture')

    def test_owned_group_controlled_stop(self):
        p = subprocess.Popen([sys.executable,'-u','-c',
            'import subprocess,time,sys; q=subprocess.Popen([sys.executable,"-c","import time;time.sleep(30)"]);print(q.pid,flush=True);time.sleep(30)'],
            stdout=subprocess.PIPE, start_new_session=True)
        child = int(p.stdout.readline());self.assertEqual(os.getpgid(child),p.pid)
        before = resources(p.pid)
        self.assertIn(child,[x['pid']for x in before['processes']])
        stop_group(p.pid);p.wait(timeout=5);p.stdout.close()
        self.assertNotEqual(p.returncode,0)
        try:
            state=Path('/proc',str(child),'stat').read_text().rsplit(')',1)[1].split()[0]
            self.assertEqual(state,'Z')
        except FileNotFoundError:pass
        self.assertGreater(before['availableBytes'],0)


if __name__=='__main__':unittest.main()
