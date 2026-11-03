"""Small persistence helpers shared by the existing recovery entry points."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import time
import uuid
import importlib.metadata
from contextlib import contextmanager


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def new_id():
    return dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:12]


def append(path, record):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a', encoding='utf8') as f:
        f.write(json.dumps({'utc': now(), **record}, ensure_ascii=False) + '\n')
        f.flush(); os.fsync(f.fileno())


def snapshot(path, data):
    path = Path(path)
    tmp = path.with_suffix('.tmp')
    with tmp.open('w', encoding='utf8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        f.write('\n'); f.flush(); os.fsync(f.fileno())
    os.replace(tmp, path)
    fd = os.open(path.parent, os.O_RDONLY)
    try: os.fsync(fd)
    finally: os.close(fd)


def metadata(run_id, args):
    here = Path(__file__).parent
    files = sorted(p.name for p in here.iterdir() if p.is_file() and p.suffix in ('.py','.ps1','.json','.txt'))
    target=here.parents[1]/'local-assets/experiments/video-recovery-20261029/venv'
    packages=sorted((d.metadata['Name'],d.version) for d in importlib.metadata.distributions(path=[str(target/'lib/python3.12/site-packages')]))
    return {'runId': run_id, 'startedAt': now(), 'endedAt': None, 'status': 'RUNNING',
            'launcherPid': os.getpid(), 'python': sys.version, 'interpreter': sys.executable,
            'params': {k: str(v) if isinstance(v, Path) else v for k, v in vars(args).items()},
            'sourceSha256': {f: hashlib.sha256((here/f).read_bytes()).hexdigest() for f in files},
            'modelVersions': json.loads((here/'models.json').read_text()),
            'modelIntegrityEvidence':str(here.parents[1]/'orchestrator/output/local-video-recovery-20261029/asset-integrity.json'),
            'environmentLock': str(here/'requirements.lock.txt'),
            'targetInterpreter':str(target/'bin/python'),'targetPackages':packages,
            'stagesAvailable': {'cuda_probe': True, 'model_load': False, 'sampling': False, 'vae_decode': False, 'video_encode': False}}


@contextmanager
def launcher_streams(folder):
    class Tee:
        def __init__(self, original, path):self.original=original;self.file=path.open('xb',buffering=0)
        def write(self, s):
            self.file.write(s.encode('utf8'));os.fsync(self.file.fileno());self.original.write(s);self.original.flush();return len(s)
        def flush(self):self.file.flush();os.fsync(self.file.fileno());self.original.flush()
    oldout,olderr=sys.stdout,sys.stderr
    stdout,stderr=Tee(oldout,folder/'launcher-stdout.log'),Tee(olderr,folder/'launcher-stderr.log')
    sys.stdout,sys.stderr=stdout,stderr
    try:yield
    except BaseException:
        import traceback
        traceback.print_exc();raise
    finally:
        sys.stdout,sys.stderr=oldout,olderr
        stdout.file.close();stderr.file.close()


def capture_child(argv, folder, run_id, stages, timeout, terminate_after=None, env=None):
    """Only used with our credential-free CUDA probe or CPU fixture, never arbitrary services."""
    folder = Path(folder)
    child = subprocess.Popen(argv, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env, start_new_session=True)
    append(stages, {'runId': run_id, 'stage': 'child_started', 'pid': child.pid, 'argv': argv})
    snapshot(folder/'child.json', {'runId': run_id, 'pid': child.pid, 'argv': argv, 'startedAt': now(), 'endedAt': None})
    errors = []
    def pump(pipe, name):
        try:
            with (folder/name).open('xb', buffering=0) as dest:
                while True:
                    chunk = os.read(pipe.fileno(), 4096)
                    if not chunk: break
                    dest.write(chunk); os.fsync(dest.fileno())
                    # Preserve raw output; stage facts remain exactly the child's emitted data.
                    append(stages, {'runId': run_id, 'stage': 'child_output', 'stream': name,
                                    'text': chunk.decode('utf8', errors='replace')})
        except Exception as exc: errors.append(str(exc))
        finally: pipe.close()
    threads = [threading.Thread(target=pump, args=(child.stdout, 'stdout.log')),
               threading.Thread(target=pump, args=(child.stderr, 'stderr.log'))]
    for t in threads: t.start()
    started = time.monotonic()
    reason = None
    try:
        while child.poll() is None:
            elapsed = time.monotonic() - started
            if errors or elapsed >= timeout or (terminate_after is not None and elapsed >= terminate_after):
                reason = 'log_error' if errors else 'controlled_termination' if terminate_after is not None and elapsed >= terminate_after else 'timeout'
                child.terminate()
                try: child.wait(timeout=3)
                except subprocess.TimeoutExpired: child.kill()
                break
            time.sleep(.05)
        child.wait(timeout=3)
    finally:
        if child.poll() is None:
            child.terminate()
            try: child.wait(timeout=3)
            except subprocess.TimeoutExpired: child.kill(); child.wait(timeout=3)
        for t in threads: t.join(timeout=3)
    result = {'runId': run_id, 'pid': child.pid, 'endedAt': now(), 'returnCode': child.returncode,
              'stopReason': reason, 'logErrors': errors}
    snapshot(folder/'child-result.json', result)
    append(stages, {'stage': 'child_finished', **result})
    return result
