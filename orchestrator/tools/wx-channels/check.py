"""Read-only connection/tools probe and post-download verification. No downloader implementation."""
import argparse,datetime,hashlib,json,pathlib,re,subprocess,sys,select,time
ROOT=pathlib.Path(__file__).resolve().parents[3]
PS='powershell.exe'
SCRIPT=r'C:\Users\admin\video-tools\wx-channels\mcp-http-stdio.ps1'
DEFAULT_EXE='/mnt/f/工具/wx_video_download_v260907_windows_x86_64/wx_video_download.exe'

def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def windows_path(value):
 if not re.match(r'^[A-Za-z]:\\',value) or '..' in pathlib.PureWindowsPath(value).parts:raise ValueError('Require an absolute Windows drive path without parent traversal')
 return pathlib.Path(subprocess.check_output(['wslpath','-u',value],text=True).strip())
def verify(value):
 p=windows_path(value)
 if not p.is_file() or p.stat().st_size==0:raise ValueError('File absent or empty; task creation is NOT download completion')
 with p.open('rb') as f:h=hashlib.file_digest(f,'sha256').hexdigest()
 raw=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)],timeout=30))
 streams=[{k:s.get(k) for k in ['index','codec_type','codec_name','width','height','avg_frame_rate','sample_rate','channels','duration']} for s in raw['streams']]
 if not any(s['codec_type']=='video' for s in streams):raise ValueError('No readable video stream')
 return {'checkedAt':now(),'windowsPath':value,'wslPath':str(p),'bytes':p.stat().st_size,'sha256':h,'durationSeconds':float(raw['format'].get('duration',0)),'streams':streams,'status':'FILE_EXISTS_NONEMPTY_READABLE_PROBED','notFullDecodeOrLicenseApproval':True}
def probe(port,out,exe=DEFAULT_EXE,transport='native',check_status=False):
 out=pathlib.Path(out);out.mkdir(parents=True,exist_ok=True)
 if transport=='native':
  if not pathlib.Path(exe).is_file():raise ValueError('Configured Windows MCP executable not found')
  command=[exe,'mcp','--api-base-url','http://127.0.0.1:'+str(port)]
 else:command=[PS,'-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',SCRIPT,'-Port',str(port)]
 messages=[{'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':'2025-03-26','capabilities':{},'clientInfo':{'name':'videopipeline-connection-check','version':'1'}}},{'jsonrpc':'2.0','method':'notifications/initialized'},{'jsonrpc':'2.0','id':2,'method':'tools/list','params':{}}]
 if check_status:messages.append({'jsonrpc':'2.0','id':3,'method':'tools/call','params':{'name':'get_wxchannels_status','arguments':{}}})
 responses=[]
 # Keep stdin open until calls finish: upstream cancels in-flight API calls on EOF.
 with (out/'probe.stderr.log').open('w') as errors:
  process=subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=errors)
  try:
   buffered=b''
   for request in messages:
    process.stdin.write((json.dumps(request)+'\n').encode());process.stdin.flush()
    if 'id' not in request:continue
    deadline=time.monotonic()+25
    while True:
     if b'\n' not in buffered:
      remaining=deadline-time.monotonic()
      if remaining<=0 or not select.select([process.stdout],[],[],max(0,remaining))[0]:raise TimeoutError('No complete MCP response within bounded wait')
      part=os_read(process.stdout.fileno())
      if not part:raise ValueError('MCP exited before answering')
      buffered+=part
      if len(buffered)>4*1024*1024:raise ValueError('MCP response exceeds bound')
      continue
     line,buffered=buffered.split(b'\n',1)
     if not line.strip():continue
     response=json.loads(line.decode('utf-8-sig'));responses.append(response)
     if response.get('id')==request['id']:break
   process.stdin.close();process.wait(timeout=5)
  finally:
   if process.poll() is None:process.terminate();process.wait(timeout=5)
 (out/'mcp-responses.json').write_text(json.dumps(responses,ensure_ascii=False,indent=2)+'\n')
 init=next((x for x in responses if x.get('id')==1),{});listed=next((x for x in responses if x.get('id')==2),{});status=next((x for x in responses if x.get('id')==3),None)
 tools=listed.get('result',{}).get('tools',[])
 result={'checkedAt':now(),'transport':'official Windows executable stdio → Windows loopback API' if transport=='native' else 'Windows HTTP MCP relay (fallback)','port':port,'status':'CONNECTED_TOOLS_VERIFIED' if init.get('result') and tools else 'BLOCKED','serverInfo':init.get('result',{}).get('serverInfo'),'tools':[x['name'] for x in tools],'backendStatusResponse':status,'apiReachable':bool(status and not status.get('error') and not status.get('result',{}).get('isError')),'backendReady':bool(status and not status.get('error') and not status.get('result',{}).get('isError') and status.get('result',{}).get('structuredContent',{}).get('available') is True),'processExitCode':process.returncode,'downloadAttempted':False}
 (out/'connection-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');return result

def os_read(fd):
 import os
 return os.read(fd,65536)
if __name__=='__main__':
 ap=argparse.ArgumentParser(description=__doc__);s=ap.add_subparsers(dest='command',required=True)
 p=s.add_parser('probe');p.add_argument('--port',type=int,default=2022);p.add_argument('--out',required=True);p.add_argument('--exe',default=DEFAULT_EXE);p.add_argument('--transport',choices=['native','http-relay'],default='native');p.add_argument('--check-status',action='store_true')
 p=s.add_parser('verify-file');p.add_argument('--windows-path',required=True);p.add_argument('--out',required=True)
 a=ap.parse_args()
 try:
  r=probe(a.port,a.out,a.exe,a.transport,a.check_status) if a.command=='probe' else verify(a.windows_path)
  if a.command=='verify-file':p=pathlib.Path(a.out);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
  print(json.dumps(r,ensure_ascii=False));sys.exit(0 if r.get('status')!='BLOCKED' else 2)
 except (ValueError,OSError,subprocess.SubprocessError) as e:print(json.dumps({'status':'BLOCKED','type':type(e).__name__,'message':str(e)},ensure_ascii=False),file=sys.stderr);sys.exit(2)
