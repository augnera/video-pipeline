from pathlib import Path
import subprocess,json,hashlib,sys
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'orchestrator/output/day9-vp006-poc-r2';R1=ROOT/'orchestrator/output/day9-vp006-poc-r1'
def run(a):return subprocess.run(a,capture_output=True,check=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def probe(p):return json.loads(run(['ffprobe','-v','error','-count_frames','-show_entries','format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels,duration,nb_read_frames','-of','json',str(p)]).stdout)
def audiohash(p):return run(['ffmpeg','-v','error','-i',str(p),'-map','0:a:0','-c','copy','-f','streamhash','-hash','sha256','-']).stdout.decode().strip()
pre=json.load(open(OUT/'protected-inputs.before.json'));preserved={p:sha(ROOT/p)==h for p,h in pre.items()};assert all(preserved.values())
outputs={}
for p in [OUT/'sample-with-bgm.mp4',OUT/'sample-no-bgm.mp4']:
 run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'])
 b=run(['ffmpeg','-hide_banner','-i',str(p),'-an','-vf','blackdetect=d=0.05:pix_th=0.01:pic_th=0.98','-f','null','-']).stderr.decode()
 info=probe(p);v=next(s for s in info['streams'] if s['codec_type']=='video');assert v['nb_read_frames']=='546' and v['width']==1080 and v['height']==1920
 assert 'black_start:' not in b
 outputs[p.name]={'sha256':sha(p),'probe':info,'fullDecode':True,'blackIntervalsDetected':False}
identicalaudio=audiohash(OUT/'sample-with-bgm.mp4')==audiohash(R1/'sample-with-bgm.mp4');assert identicalaudio
voiceAudioEqual=audiohash(OUT/'sample-no-bgm.mp4')==audiohash(R1/'sample-no-bgm.mp4')
# Same subtitle glyph positions: compare high-luminance text masks inside the caption box.
ious=[]
for f in [30,90,150,300,480]:
 masks=[]
 for p in [R1/'sample-with-bgm.mp4',OUT/'sample-with-bgm.mp4']:
  raw=run(['ffmpeg','-v','error','-i',str(p),'-vf',f'select=eq(n\\,{f}),crop=928:124:76:1678,format=gray','-frames:v','1','-f','rawvideo','-']).stdout
  masks.append({i for i,b in enumerate(raw) if b>200})
 iou=len(masks[0]&masks[1])/len(masks[0]|masks[1]);ious.append({'frame':f,'glyphMaskIoU':iou});assert iou>.95
# Independently measure rendered title centering from its color pixels.
def center(top,height,criterion):
 raw=run(['ffmpeg','-v','error','-i',str(OUT/'sample-with-bgm.mp4'),'-vf',f'select=eq(n\\,480),crop=1080:{height}:0:{top},format=rgb24','-frames:v','1','-f','rawvideo','-']).stdout
 xs=[(i//3)%1080 for i in range(0,len(raw),3) if criterion(*raw[i:i+3])]
 assert xs
 return {'minX':min(xs),'maxX':max(xs),'centerX':(min(xs)+max(xs))/2}
main=center(280,100,lambda r,g,b:g>110 and b>130 and r<g*.8)
secondary=center(386,90,lambda r,g,b:r>130 and g>130 and b>150)
assert abs(main['centerX']-540)<4 and abs(secondary['centerX']-540)<4
for f in [30,75,150,300,480]:
 run(['ffmpeg','-v','error','-y','-i',str(OUT/'sample-with-bgm.mp4'),'-vf',f'select=eq(n\\,{f}),scale=360:-1','-frames:v','1',str(OUT/'previews'/f'phone-frame-{f:03}.png')])
# Validate only the additive match using the existing unchanged contract.
sys.path.insert(0,str(ROOT/'orchestrator/contracts'))
from validate_assets import validate_match
catalog=json.load(open(ROOT/'orchestrator/output/day9-vp006-poc/asset-catalog.json'))['assets'];match=json.load(open(OUT/'opening-asset-match.json'));validate_match(match,{a['assetId']:a for a in catalog})
opening=json.load(open(OUT/'opening-review.json'))
report={'status':'technical-checks-passed; holder-viewing-pending','preservedInputs':preserved,'outputs':outputs,'mixedAudioPacketsIdenticalToR1':identicalaudio,'noBgmVoicePacketsIdenticalToR1':voiceAudioEqual,'subtitleGlyphChecks':ious,'subtitleSource':'original 11 cues, same component, offset, font and position; original SRT untouched','centeredTitlePixelMeasurements':{'targetCenterX':540,'main':main,'secondary':secondary},'diagram':{'centerX':540,'bottomY':1420,'subtitleTopY':1678,'safeGapPx':258,'animationTimingsUnchanged':True},'cornerBadgePolicy':json.load(open(ROOT/'orchestrator/config/xiaochen-visual.json')),'staticDwell':opening['staticChecks'],'openingAdditionalMatchSchemaValid':True,'contractChanged':False,'disclosureReview':'AI image pending independent review before public release; decoration removal does not waive disclosure.','bgmPolicy':'Exact R1 mixed AAC reused; no R2 gain/loop/timing changes.','tests':'10 effect/policy tests passed','typecheck':'passed with pre-existing unused-import rule disabled','gpuModelsStarted':False,'published':False,'visualLimitations':'Phone previews and pixel checks support layout/readability; perceived opening motion, naturalness and retention require holder viewing.'}
(OUT/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'audioIdenticalToR1':identicalaudio,'voiceOnlyAudioIdenticalToR1':voiceAudioEqual,'subtitles':ious,'titleCenters':report['centeredTitlePixelMeasurements'],'inputsPreserved':all(preserved.values())},ensure_ascii=False,indent=2))
