"""Archive existing local evidence without deleting it or clearing STOP."""
import argparse
import hashlib
import json
from pathlib import Path
import tarfile
import base64
import subprocess
from runlog import snapshot, now


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--host-dir',type=Path,required=True);p.add_argument('--wsl-dir',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
    p.add_argument('--allow-incomplete',action='store_true',help='archive an exited failed logger without rewriting its incomplete state')
    a=p.parse_args()
    host=json.loads((a.host_dir/'launch.json').read_text());wsl=json.loads((a.wsl_dir/'run.json').read_text())
    if host['runId']!=wsl['runId']:p.error('host and WSL runId differ')
    hs=json.loads((a.host_dir/'host-state.json').read_text())
    incomplete=hs['status']=='RUNNING' or wsl['status']=='RUNNING'
    if incomplete:
        if not a.allow_incomplete:p.error('incomplete run: use --allow-incomplete only after process exit')
        cmd='[bool](Get-Process -Id '+str(int(hs['pid']))+' -ErrorAction SilentlyContinue)'
        result=subprocess.run(['powershell.exe','-NoProfile','-NonInteractive','-EncodedCommand',base64.b64encode(cmd.encode('utf-16le')).decode()],capture_output=True,timeout=10,check=True)
        if result.stdout.strip().lower()!=b'false':p.error('host logger is still alive; stop it normally first')
    a.out.parent.mkdir(parents=True,exist_ok=True)
    with a.out.open('xb') as f:
        with tarfile.open(fileobj=f,mode='w') as tar:
            tar.add(a.host_dir,arcname='windows');tar.add(a.wsl_dir,arcname='wsl')
        f.flush();__import__('os').fsync(f.fileno())
    snapshot(a.out.with_suffix(a.out.suffix+'.json'),{'runId':host['runId'],'archivedAt':now(),'sha256':hashlib.sha256(a.out.read_bytes()).hexdigest(),'sourceDeleted':False,'stopCleared':False,'incompleteOriginalStatePreserved':incomplete})
    print(a.out)


if __name__=='__main__':main()
