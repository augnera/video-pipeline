import requests,json,re,pathlib,subprocess,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[3];OUT=ROOT/'orchestrator/output/microsoft-veo-skills-20261028-vp010';SRC=OUT/'sources';AS=OUT/'assets';AS.mkdir(exist_ok=True)
slugs=['typing-on-a-laptop-close-up-1781','hands-of-a-girl-working-on-a-computer-4938','person-typing-on-a-computer-in-detail-4907','a-woman-writing-in-her-spiral-notebook-42655','student-hand-takes-a-stiky-note-to-paste-it-on-50112','bluish-data-center-hallway-23282','datacenter-racks-7887']
results=[]
for slug in slugs:
 id=slug.rsplit('-',1)[1];url=f'https://mixkit.co/free-stock-video/{slug}/';r=requests.get(url,timeout=25);(SRC/f'mixkit-{id}-page.html').write_text(r.text)
 licenseFree='Stock Video Free License' in r.text and 'data-license="videoFree"' in r.text
 restricted='data-license="videoRestricted"' in r.text
 urls=list(dict.fromkeys(re.findall(r'https://assets\.mixkit\.co/videos/[^"\s<>]+?\.mp4',r.text)))
 item={'id':id,'sourceUrl':url,'statusCode':r.status_code,'exactPageFreeLicense':licenseFree,'visibleRestrictedLicense':restricted,'allowedUse':'private noncommercial local review only' if restricted else 'edited commercial/noncommercial video under FreeLicense','videoUrls':urls}
 if r.status_code!=200 or not (licenseFree or restricted):results.append(item);continue
 download=next((u for u in urls if '1080' in u),None)
 if not download:download=next((u for u in urls if '-720.mp4' in u),None)
 if not download:results.append(item);continue
 path=AS/f'mixkit-{id}.mp4'
 if not path.exists():
  v=requests.get(download,timeout=60)
  if v.status_code!=200:item['downloadStatus']=v.status_code;results.append(item);continue
  path.write_bytes(v.content)
 try:
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)]));stream=next(s for s in probe['streams'] if s['codec_type']=='video');d=float(probe['format']['duration'])
  item.update(downloadUrl=download,localPath=str(path.relative_to(ROOT)),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),duration=d,width=stream['width'],height=stream['height'],fps=stream['r_frame_rate'])
  for k,t in enumerate([min(.5,d*.1),d*.5,max(0,d-1)]):subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(path),'-frames:v','1','-vf','scale=480:-1',str(AS/f'{id}-{k}.jpg')],check=True)
 except Exception as e:item['error']=str(e)
 results.append(item);print(id,item.get('localPath','BLOCKED'),flush=True)
(SRC/'stock-acquisition.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
for key,url in [('video-free-license','https://mixkit.co/license/modal/videoFree/'),('terms','https://mixkit.co/terms/'),('video-restricted-license','https://mixkit.co/license/#videoRestricted')]:
 r=requests.get(url,timeout=25);(SRC/f'mixkit-{key}.html').write_text(r.text)
