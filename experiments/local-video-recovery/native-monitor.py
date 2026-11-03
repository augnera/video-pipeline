"""Start a bounded native Windows NVML/event logger. Never imports torch."""
import argparse
import base64
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess
import time
from runlog import new_id, snapshot


def encoded(s):
    return base64.b64encode(s.encode('utf-16le')).decode()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--name', help='optional label; not used as runId')
    p.add_argument('--stop-run', help='normal stop request for our native monitor; never kills other processes')
    p.add_argument('--run-id', help='reuse the same generated ID across host and WSL, never an existing directory')
    p.add_argument('--seconds', type=int, default=60)
    p.add_argument('--since-utc', help='cover events since the dated review, ISO8601 with timezone')
    a = p.parse_args()
    if a.stop_run:
        if not a.stop_run.isascii() or not a.stop_run.replace('-','').replace('_','').isalnum():p.error('invalid runId')
        folder=Path('/mnt/c/Users/admin/video-recovery/runs')/a.stop_run
        if not (folder/'launch.json').exists():p.error('unknown runId')
        request=folder/'stop.request'
        with request.open('x') as f:
            f.write(json.dumps({'runId':a.stop_run,'utc':dt.datetime.now(dt.timezone.utc).isoformat(),'action':'normal_stop_request'})+'\n');f.flush();__import__('os').fsync(f.fileno())
        print(str(request));return
    run_id = a.run_id or new_id()
    if not run_id.isascii() or not run_id.replace('-', '').replace('_', '').isalnum() or not 10 <= a.seconds <= 300:
        p.error('ASCII name required; duration 10..300 seconds')
    folder = Path('/mnt/c/Users/admin/video-recovery/runs') / run_id
    folder.mkdir(parents=True, exist_ok=False)
    source = Path(__file__).with_name('host-watch.ps1').read_bytes()
    (folder / 'host-watch.ps1').write_bytes(source)
    for name in ['models.json','requirements.lock.txt','gate-policy.json']:
        (folder/name).write_bytes(Path(__file__).with_name(name).read_bytes())
    win = 'C:\\Users\\admin\\video-recovery\\runs\\' + run_id
    body = "& ([scriptblock]::Create([IO.File]::ReadAllText('" + win + "\\host-watch.ps1'))) -OutputPath \"" + win + '\\host.jsonl" -Seconds ' + str(a.seconds) + ' -RunId "' + run_id + '"'
    # A native stop request is a file in this same Windows-local directory.
    if a.since_utc:
        since = dt.datetime.fromisoformat(a.since_utc.replace('Z', '+00:00'))
        if since.tzinfo is None: p.error('since-utc requires timezone')
        body += ' -SinceUtc "' + since.isoformat() + '"'
    body = "try { " + body + " } catch { $failure=@{runId='"+run_id+"';pid=$PID;utc=(Get-Date).ToUniversalTime().ToString('o');status='STOP_INCOMPLETE';error=($_|Out-String)};$bytes=[Text.Encoding]::UTF8.GetBytes(($failure|ConvertTo-Json -Depth 5));foreach($name in @('bootstrap-error.json','STOP.json')){$target='"+win+"\\'+$name;if(!(Test-Path -LiteralPath $target)){$f=[IO.FileStream]::new($target,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read);try{$f.Write($bytes,0,$bytes.Length);$f.Flush($true)}finally{$f.Dispose()}}};exit 1 }"
    # Encode authorized diagnostic commands, without changing ExecutionPolicy or using -Bypass.
    launch = '''[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);
$p=Start-Process -FilePath "$PSHOME\\powershell.exe" -ArgumentList @('-NoProfile','-NonInteractive','-EncodedCommand','ENCODED') -WindowStyle Hidden -PassThru;
@{launcherPid=$PID;loggerPid=$p.Id;utc=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json
'''.replace('ENCODED', encoded(body))
    started = time.monotonic()
    try:
        r = subprocess.run(['powershell.exe', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded(launch)],
                           capture_output=True, timeout=15)
    except subprocess.TimeoutExpired as exc:
        (folder/'launcher-stdout.log').write_bytes(exc.stdout or b'');(folder/'launcher-stderr.log').write_bytes(exc.stderr or b'')
        snapshot(folder/'launch-failure.json',{'runId':run_id,'status':'STOP_INCOMPLETE','reason':'launcher_timeout','utc':dt.datetime.now(dt.timezone.utc).isoformat()})
        raise RuntimeError('native launcher timeout; inspect '+str(folder)+'; no automatic retry') from None
    (folder/'launcher-stdout.log').write_bytes(r.stdout);(folder/'launcher-stderr.log').write_bytes(r.stderr)
    if r.returncode:
        snapshot(folder/'launch-failure.json',{'runId':run_id,'status':'STOP_INCOMPLETE','returnCode':r.returncode,'utc':dt.datetime.now(dt.timezone.utc).isoformat()})
        raise RuntimeError('native logger launch failed; evidence retained at '+str(folder))
    result = json.loads(r.stdout)
    result.update(runId=run_id,label=a.name,launcherReturnedUtc=dt.datetime.now(dt.timezone.utc).isoformat(),
                  launchElapsedSeconds=time.monotonic() - started, durationSeconds=a.seconds,
                  logPath=str(folder / 'host.jsonl'), scriptSha256=hashlib.sha256(source).hexdigest(),
                  executionPolicyChanged=False)
    result['params']={'seconds':a.seconds,'sinceUtc':a.since_utc,'runId':run_id,'label':a.name}
    result['artifacts']={'telemetry': str(folder/'host.jsonl'), 'stdout':str(folder/'stdout.log'), 'stderr':str(folder/'stderr.log')}
    snapshot(folder/'launch.json', result)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
