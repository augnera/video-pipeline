"""Independent recovery evidence, not a production video-model backend.

No torch import except inside the explicitly gated child CUDA probe. No retry.
"""
import argparse
import base64
import csv
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
from runlog import new_id, metadata, snapshot, launcher_streams

ROOT = Path(__file__).resolve().parents[2]
CONTROL = ROOT / 'local-assets/experiments/video-recovery-20261029'
LATCH = CONTROL / 'STOP.json'
UUID = 'GPU-a7eafd6f-d8c7-9243-8895-a332d61e4e4f'
POLICY = json.loads(Path(__file__).with_name('gate-policy.json').read_text())
LIMITS = POLICY['operationalLimits']
REQUIRED = tuple(POLICY['stages']['A']['requirements'])


def emit(path, record):
    if 'runId' not in record and (path.parent/'run.json').exists():
        record = {'runId':json.loads((path.parent/'run.json').read_text())['runId'],**record}
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a', encoding='utf8') as f:
        f.write(json.dumps({'utc': dt.datetime.now(dt.timezone.utc).isoformat(), **record}, ensure_ascii=False) + '\n')
        f.flush()
        os.fsync(f.fileno())


def stop(reason, run_id=None):
    emit(LATCH, {'runId':run_id,'status': 'STOP', 'reason': str(reason), 'automaticRetry': False})


def gpu():
    fields = ['memory.total', 'memory.used', 'memory.free', 'temperature.gpu', 'power.draw', 'utilization.gpu']
    r = subprocess.run(['nvidia-smi', '-i', UUID, '--query-gpu=' + ','.join(fields + ['gpu_recovery_action']),
                        '--format=csv,noheader,nounits'], capture_output=True, text=True, timeout=LIMITS['nvmlTimeoutSeconds'], check=True)
    values = next(csv.reader([r.stdout.strip()]))
    if len(values) != len(fields) + 1:
        raise RuntimeError('incomplete NVML sample')
    measured = {k: None if v.strip() in ('N/A','[N/A]') else float(v.strip()) for k,v in zip(fields,values[:-1])}
    return {**measured,'recoveryAction': values[-1].strip(),
            'metricSupport':{**{k:'UNAVAILABLE' if v is None else 'SUPPORTED' for k,v in measured.items()},'memoryJunctionTemperature':'UNAVAILABLE','hotspotTemperature':'UNAVAILABLE','pcieErrorCounters':'UNAVAILABLE'},
            'memoryJunctionTemperatureC':None,'hotspotTemperatureC':None,'pcieErrorCounters':None}


def check_sample(g):
    # Conservative stop thresholds, not a hardware stability certification.
    if g['temperature.gpu'] is None or g['memory.free'] is None or g['temperature.gpu'] >= LIMITS['maxTemperatureC'] or g['memory.free'] < LIMITS['sharedDesktopReserveMiB'] or g['recoveryAction'] != 'None':
        raise RuntimeError('temperature/free-memory/recovery-action stop threshold')


def host_sample(path, required_since=None, run_id=None):
    lines = path.read_text(encoding='utf-8-sig').splitlines()
    if not lines:
        raise RuntimeError('host monitor empty')
    # Partial last write is not accepted as a valid heartbeat.
    s = json.loads(lines[-1])
    if run_id and s.get('runId') != run_id:
        raise RuntimeError('host runId mismatch')
    age = (dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(s['utc'].replace('Z', '+00:00'))).total_seconds()
    if age < -2 or age > LIMITS['hostHeartbeatMaxAgeSeconds'] or s.get('error') or s.get('deviceEvents'):
        raise RuntimeError('host heartbeat stale/error/device event')
    if UUID not in s.get('gpu', ''):
        raise RuntimeError('host GPU identity mismatch')
    if s['gpu'].strip().split(',')[-1].strip() != 'None':
        raise RuntimeError('host recovery action not clear')
    if required_since:
        coverage = dt.datetime.fromisoformat(s.get('eventSinceUtc', '').replace('Z', '+00:00'))
        if coverage > required_since:
            raise RuntimeError('native host event coverage starts after recovery review')
    return s


def assess(review, stage='A', purpose='trial'):
    issues = []
    if LATCH.exists():
        issues.append('persistent STOP latch: investigate before manually archiving it')
    required = list(REQUIRED)
    if stage in ('B', 'C'):
        required += POLICY['stages']['B']['requirements']
    if stage == 'C':
        required += POLICY['stages']['C']['requirements']
        if purpose == 'production':
            required += POLICY['stages']['C']['productionRequirements']
    if not review:
        return issues + ['missing recovery review: ' + ', '.join(required)]
    try:
        d = json.loads(Path(review).read_text())
    except (OSError, ValueError) as exc:
        return issues + ['review unreadable: ' + str(exc)]
    try:
        reviewed = dt.datetime.fromisoformat(d['reviewedAt'])
        if reviewed.tzinfo is None:
            raise ValueError('timezone required')
        age = time.time() - reviewed.timestamp()
        if age < 0 or age > LIMITS['reviewMaxAgeSeconds']:
            issues.append('review must be dated within the last hour')
    except (KeyError, ValueError, TypeError):
        issues.append('missing/invalid reviewedAt')
    for name in required:
        item = d.get(name, {})
        if item.get('status') != 'SATISFIED':
            issues.append(name + ': not satisfied')
            continue
        p = Path(item.get('evidencePath') or '')
        if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest() != item.get('sha256'):
            issues.append(name + ': missing or changed evidence')
    if stage in ('B', 'C'):
        if not Path(__file__).with_name('wan21-child.py').is_file():
            issues.append('bounded model sampling runner not implemented')
        if not isinstance(d.get('sampleMinimumFreeMiB'), (int, float)) or d['sampleMinimumFreeMiB'] < LIMITS['sharedDesktopReserveMiB']:
            issues.append('sample resource budget unset or below shared reserve')
    if purpose == 'production':
        issues.append('production enablement is outside this recovery tool')
    return issues


def approved_sample_profile(profile):
    # Exact reviewed profiles only; arbitrary request fields remain prohibited.
    return any(profile == json.loads(Path(__file__).with_name(name).read_text())
               for name in ('wan21-profile.json', 'wan21-profile-30step.json',
                            'wan21-profile-30step-realistic-prompt.json',
                            'wan21-profile-480x832.json'))


CUDA = '''import json,os,datetime
def report(stage,**values):
 print(json.dumps({"runId":os.environ["VIDEO_RECOVERY_RUN_ID"],"utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"stage":stage,**values}),flush=True)
report("torch_import_started")
import torch
report("torch_imported",torch=torch.__version__,cudaBuild=torch.version.cuda)
torch.set_num_threads(1)
torch.backends.cuda.matmul.allow_tf32=False
report("cuda_initialization_started")
torch.cuda.init()
report("cuda_initialized")
torch.cuda.reset_peak_memory_stats()
x=torch.arange(64*64,device="cuda",dtype=torch.float32).reshape(64,64)/4096
y=x@x.T
torch.cuda.synchronize()
assert torch.isfinite(y).all().item()
assert torch.allclose(y.cpu(), x.cpu()@x.cpu().T,atol=1e-4,rtol=1e-4)
report("tiny_matmul_pass",peakAllocatedBytes=torch.cuda.max_memory_allocated())
'''


def watch(args, precreated=False):
    if not precreated:args.out.mkdir(parents=True, exist_ok=False)
    events = args.out / 'stages.jsonl'
    sample_request = getattr(args,'sample_request',None)
    request=json.loads(sample_request.read_text()) if sample_request else None
    accelerated=args.cuda or request is not None
    profile=request['profile'] if request else None
    run_id = getattr(args, 'run_id', None) or new_id()
    if getattr(args, 'host_log', None):
        launch = args.host_log.parent / 'launch.json'
        if launch.exists():
            native_id = json.loads(launch.read_text()).get('runId')
            if getattr(args, 'run_id', None) and native_id != args.run_id:
                raise RuntimeError('native/WSL runId mismatch')
            run_id = native_id or run_id
    state = metadata(run_id, args)
    state['workload']={'kind':'wan21_single_sample' if request else 'cuda_probe' if args.cuda else 'read_only_monitor','matrixShape':[64,64] if args.cuda else None,'dtype':'float32' if args.cuda else None,'threads':1 if args.cuda else None,'allowTF32':False if args.cuda else None,'modelLoaded':None,'samplingParameters':profile}
    if request:state['stagesAvailable'].update(model_load=True,sampling=True,vae_decode=True,video_encode=True)
    state['artifacts']={'stages':str(events),'telemetry':str(args.out/'telemetry.jsonl'),'stdout':str(args.out/'stdout.log'),'stderr':str(args.out/'stderr.log'),'launcherStdout':str(args.out/'launcher-stdout.log'),'launcherStderr':str(args.out/'launcher-stderr.log')}
    snapshot(args.out/'run.json', state)
    emit(events, {'runId': run_id, 'stage': 'monitor_start', 'cudaRequested': args.cuda})
    if accelerated:
        issues = assess(args.review, 'B' if request else 'A')
        if not args.host_log:
            issues.append('accelerated execution requires a separately launched native --host-log')
        if request:
            if not approved_sample_profile(profile) or request['runId']!=run_id or Path(request['out']).resolve()!=args.out.resolve():issues.append('sample request/profile/runId/output mismatch')
            if (args.out.parent/'sample-attempt-consumed.json').exists():issues.append('single sample attempt already consumed; no retry')
        if issues:
            emit(events, {'stage': 'BLOCKED', 'issues': issues})
            state.update(status='BLOCKED',endedAt=dt.datetime.now(dt.timezone.utc).isoformat(),issues=issues)
            snapshot(args.out/'run.json',state)
            print(json.dumps({'status': 'BLOCKED', 'issues': issues})); return 2
    lock = (CONTROL / 'monitor.lock').open('a+')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    shared = None
    if accelerated:
        shared = Path('/home/chen/ai-services/gpu.lock').open('a+')
        fcntl.flock(shared, fcntl.LOCK_EX | fcntl.LOCK_NB)
    host = None
    host_log = None
    if args.host_log:
        host_file = args.host_log
    else:
        raise RuntimeError('separately launched native --host-log required; no WSL-owned host monitor fallback')
    child = None
    child_log = None
    child_err = None
    started = time.monotonic()
    probe_started = None
    probe_finished = None
    required_since = dt.datetime.fromisoformat(json.loads(args.review.read_text())['reviewedAt']) if accelerated else None
    try:
        while time.monotonic() - started < args.seconds:
            elapsed = time.monotonic() - started
            g = gpu()
            emit(args.out / 'telemetry.jsonl', {'runId':run_id,'kind': 'wsl_nvml', 'elapsedSeconds': elapsed, 'metricSupport':{'memory':'SUPPORTED','coreTemperature':'SUPPORTED','power':'SUPPORTED','utilization':'SUPPORTED','recoveryAction':'SUPPORTED','memoryJunctionTemperature':'UNAVAILABLE','hotspotTemperature':'UNAVAILABLE','pcieErrorCounters':'UNAVAILABLE'},**g})
            check_sample(g)
            if elapsed > 7 or host_file.exists():
                hs = host_sample(host_file, required_since, run_id)
                emit(args.out / 'host-mirror.jsonl', hs)
            if host and host.poll() is not None:
                raise RuntimeError('host monitor exited early')
            if accelerated and elapsed >= 10 and child is None:
                if g['memory.free'] < (profile['minimumFreeMiB'] if request else POLICY['stages']['A']['minimumFreeMiB']):
                    raise RuntimeError('stage-specific free-memory requirement not met')
                if request:
                    mem={k:int(v.split()[0]) for k,v in (line.split(':',1) for line in Path('/proc/meminfo').read_text().splitlines())}
                    if mem['MemAvailable']/1024/1024<profile['resourceBudget']['hostAvailableMinimumGiB']:raise RuntimeError('host RAM planning budget not available')
                if g['utilization.gpu'] is not None and g['utilization.gpu'] > POLICY['stages']['A']['utilizationWarnPercent']:
                    emit(events, {'stage': 'utilization_warning', 'percent': g['utilization.gpu'], 'note': 'desktop use is not proof of another heavy compute job'})
                host_sample(host_file, required_since, run_id)
                if request:
                    consumed=args.out.parent/'sample-attempt-consumed.json'
                    with consumed.open('x') as f:
                        json.dump({'runId':run_id,'utc':dt.datetime.now(dt.timezone.utc).isoformat(),'attempts':1,'automaticRetry':False},f);f.flush();os.fsync(f.fileno())
                # Durable start marker precedes any CUDA work. An interrupted run latches on next invocation.
                emit(CONTROL / 'cuda-attempts.jsonl', {'stage': 'RUNNING', 'out': str(args.out)})
                stop('Single model sample in progress; no retry' if request else 'CUDA attempt in progress; retain latch until result and host review are inspected',run_id)
                child_log = os.fdopen(os.open(args.out/'stdout.log',os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_DSYNC,0o600),'wb',buffering=0)
                child_err = os.fdopen(os.open(args.out/'stderr.log',os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_DSYNC,0o600),'wb',buffering=0)
                argv=[str(CONTROL/'venv/bin/python'),'-u',str(Path(__file__).with_name('wan21-child.py').resolve()),str(sample_request.resolve())] if request else [str(CONTROL / 'venv/bin/python'), '-u', '-c', CUDA]
                child = subprocess.Popen(argv,
                                         stdout=child_log, stderr=child_err, start_new_session=True,
                                         env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1', 'CUDA_VISIBLE_DEVICES': '0', 'VIDEO_RECOVERY_RUN_ID':run_id})
                probe_started = time.monotonic()
                state['childPid']=child.pid
                snapshot(args.out/'run.json',state)
                emit(events, {'stage': 'model_child_started' if request else 'cuda_probe_started', 'pid': child.pid,'argv':argv})
            if child:
                if child.poll() is None and time.monotonic() - probe_started > (profile['totalChildTimeoutSeconds'] if request else LIMITS['cudaProbeTimeoutSeconds']):
                    raise RuntimeError('stage-specific child deadline; no retry')
                if request and child.poll() is None and (args.out/'model-stages.jsonl').exists():
                    stages=[json.loads(s) for s in (args.out/'model-stages.jsonl').read_text().splitlines()]
                    starts=[s for s in stages if s['stage'] in profile['stageTimeoutSeconds']]
                    if starts:
                        last=starts[-1]
                        if time.monotonic()-probe_started-last['elapsedSeconds']>profile['stageTimeoutSeconds'][last['stage']]:raise RuntimeError('model phase timeout: '+last['stage'])
                if child.poll() is not None:
                    if child.returncode != 0:
                        raise RuntimeError('CUDA compute child failed; no retry')
                    if probe_finished is None:
                        probe_finished = time.monotonic()
                        state['childExitCode']=child.returncode;state['childExitedAt']=dt.datetime.now(dt.timezone.utc).isoformat();snapshot(args.out/'run.json',state)
                    if time.monotonic() - probe_finished >= LIMITS['postProbeObservationSeconds']:
                        host_sample(host_file, required_since, run_id)
                        result='MODEL_CHILD_EXITED_HOST_WINDOW_CHECKED' if request else 'CUDA_PASS_HOST_WINDOW_CHECKED'
                        state.update(status=result,endedAt=dt.datetime.now(dt.timezone.utc).isoformat())
                        emit(events, {'stage': result, 'productionSuitable': False})
                        print('Single sample child exited; validation still required; STOP retained.' if request else 'CUDA probe passed; STOP remains until inspection. No model launched.'); return 0
            time.sleep(1)
        if accelerated:
            raise RuntimeError('CUDA stage did not finish within monitoring window')
        emit(events, {'stage': 'MONITOR_ONLY_PASS', 'cudaInitialized': False})
        state.update(status='MONITOR_ONLY_PASS',endedAt=dt.datetime.now(dt.timezone.utc).isoformat())
        print('Read-only monitoring completed. No CUDA compute.'); return 0
    except BaseException as exc:
        stop(exc,run_id); emit(events, {'stage': 'STOP', 'reason': str(exc)})
        state.update(status='STOP_INCOMPLETE',endedAt=dt.datetime.now(dt.timezone.utc).isoformat(),error=str(exc))
        print('STOP:', str(exc)); return 2
    finally:
        if child and child.poll() is None:
            os.killpg(child.pid, signal.SIGTERM)
            try: child.wait(timeout=3)
            except subprocess.TimeoutExpired: os.killpg(child.pid, signal.SIGKILL)
        if child_log: child_log.close()
        if child_err: child_err.close()
        # Only our host logger is terminated. Native host launch is preferable before an actual trial.
        if host and host.poll() is None:
            host.terminate()
            try: host.wait(timeout=3)
            except subprocess.TimeoutExpired: host.kill()
        if host_log: host_log.close()
        emit(events, {'stage': 'monitor_closed', 'hostEvidence': str(host_file)})
        state['artifacts']['host']=str(host_file)
        snapshot(args.out/'run.json',state)
        if shared: shared.close()
        lock.close()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('mode', choices=['assess', 'monitor'])
    p.add_argument('--review', type=Path)
    p.add_argument('--run-id')
    p.add_argument('--stage', choices=['A', 'B', 'C'], default='A', help='assessment stage; monitor --cuda can only run A')
    p.add_argument('--purpose', choices=['trial', 'production'], default='trial')
    p.add_argument('--host-log', type=Path, help='separate native Windows logger JSONL, read through /mnt/c')
    p.add_argument('--out', type=Path)
    p.add_argument('--seconds', type=int, default=15)
    p.add_argument('--cuda', action='store_true', help='Explicit minimal compute; requires all recovery reviews')
    p.add_argument('--sample-request',type=Path,help='stage B fixed one-sample request; all B reviews required')
    a = p.parse_args()
    CONTROL.mkdir(parents=True, exist_ok=True)
    if a.mode == 'assess':
        issues = assess(a.review, a.stage, a.purpose); print(json.dumps({'policyVersion': POLICY['version'], 'stage': a.stage, 'status': 'NO_GO' if issues else 'GO_FOR_SPECIFIED_STAGE_ONLY', 'issues': issues}, indent=2)); return 2 if issues else 0
    if a.purpose!='trial' or a.stage=='C' or (a.stage=='B' and (not a.sample_request or a.cuda)) or (a.stage=='A' and a.sample_request):
        p.error('A uses --cuda; B requires --sample-request; C/production execution is prohibited')
    if not a.host_log:
        p.error('launch native-monitor.py first and supply its --host-log')
    if not a.out or not 10 <= a.seconds <= 300 or (a.cuda and a.seconds < 50) or (a.sample_request and a.seconds<280):
        p.error('unique --out required; A monitoring >=50, B>=280, maximum300 seconds')
    if not a.out.name.replace('-', '').replace('_', '').isalnum():
        p.error('output basename must contain only letters, digits, hyphens, underscores')
    a.out.mkdir(parents=True,exist_ok=False)
    with launcher_streams(a.out):return watch(a,precreated=True)


if __name__ == '__main__':
    sys.exit(main())
