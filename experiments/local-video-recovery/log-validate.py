"""CPU-only lifecycle/log validation. Does not run CUDA, models, or fault injection on hardware."""
import argparse
import datetime as dt
import json
from pathlib import Path
import sys
import threading
import time
from unittest.mock import patch
import recovery
from runlog import append, capture_child, metadata, new_id, snapshot

FIXTURE = '''import json,sys,time,datetime
def log(stage):
 print(json.dumps({"utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"stage":stage,"simulation":True}),flush=True)
log("fixture_started")
print("fixture stderr: intentionally recorded",file=sys.stderr,flush=True)
for n in range(6):
 log("fixture_progress")
 time.sleep(.2)
log("fixture_completed")
'''


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
    a.out.mkdir(parents=True,exist_ok=False)
    results=[]
    for mode in ('normal','terminated'):
        folder=a.out/mode;folder.mkdir();run_id=new_id();state=metadata(run_id,a)
        state.update(simulation=True,gpuCompute=False,modelInference=False)
        snapshot(folder/'run.json',state);events=folder/'stages.jsonl'
        append(events,{'runId':run_id,'stage':'fixture_launch','simulation':True})
        received=[]
        t=threading.Thread(target=lambda: received.append(capture_child([sys.executable,'-u','-c',FIXTURE],folder,run_id,events,10,.8 if mode=='terminated' else None)))
        t.start()
        deadline=time.monotonic()+2
        while not (folder/'stdout.log').exists() and time.monotonic()<deadline: time.sleep(.01)
        while (folder/'stdout.log').stat().st_size==0 and time.monotonic()<deadline: time.sleep(.01)
        flushed_before_exit=t.is_alive() and (folder/'stdout.log').stat().st_size>0 and (folder/'stderr.log').stat().st_size>0
        t.join(timeout=12);assert not t.is_alive() and received
        result=received[0];raw=[json.loads(x) for x in (folder/'stdout.log').read_text().splitlines()]
        state.update(status='COMPLETED' if result['returnCode']==0 else 'STOP_INCOMPLETE',endedAt=result['endedAt'],pid=result['pid'],lastRealChildStage=raw[-1]['stage'])
        if mode=='terminated':
            with patch.object(recovery,'LATCH',folder/'STOP.json'):recovery.stop('controlled CPU fixture termination; SIMULATED',run_id)
        snapshot(folder/'run.json',state)
        results.append({'runId':run_id,'mode':mode,'flushedBeforeExit':flushed_before_exit,'lastRealChildStage':raw[-1]['stage'],'status':state['status'],'stdoutRecords':len(raw),'stderrBytes':(folder/'stderr.log').stat().st_size})
        assert flushed_before_exit
    folder=a.out/'simulated-event';folder.mkdir();run_id=new_id()
    event={'runId':run_id,'utc':dt.datetime.now(dt.timezone.utc).isoformat(),'simulation':True,'error':None,
           'gpu':recovery.UUID+', 1, 33, 20, 0, None','deviceEvents':[{'Id':153,'ProviderName':'SIMULATED_nvlddmkm','RecordId':-1,'rawXml':'<Event><System><Provider Name="SIMULATED"/><EventID>153</EventID></System></Event>'}]}
    append(folder/'host-fixture.jsonl',event)
    try:recovery.host_sample(folder/'host-fixture.jsonl');raise AssertionError('fault was not detected')
    except RuntimeError as exc:
        with patch.object(recovery,'LATCH',folder/'STOP.json'):recovery.stop('SIMULATED event: '+str(exc),run_id)
    snapshot(a.out/'validation.json',{'gpuCompute':False,'modelInference':False,'runs':results,'simulatedEventDetected':True,'realDriverFaultSurvival':'NOT_TESTED','realStopLatchModified':False})
    print(json.dumps(results,indent=2))


if __name__=='__main__':main()
