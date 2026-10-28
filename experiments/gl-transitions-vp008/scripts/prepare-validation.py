import json,pathlib,hashlib,subprocess
root=pathlib.Path(__file__).resolve().parents[3];out=root/'orchestrator/output/day9-vp008';old=root/'orchestrator/output/day9-vp007'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(n,v):(out/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
t=json.loads((out/'timeline.json').read_text());previous=json.loads((old/'timeline.json').read_text())
assert t['scenes']==previous['scenes'] and t['captions']==previous['captions'] and t['durationInFrames']==546
brief=json.loads((old/'visual-brief.json').read_text());brief['transitionPlan']=t['transitions'];brief['transitionSelectionMode']='rules';save('visual-brief.json',brief)
save('asset-proposal.json',json.loads((old/'asset-proposal.json').read_text()))
bgm=json.loads((old/'bgm-config.json').read_text());bgm['selectedBoostDb']=3;bgm['reuse']='Exact AAC packets copied from VP007 sample-bgm-plus3.mp4';save('bgm-config.json',bgm)
save('inputs.before.json',json.loads((out/'protected-before.json').read_text()))
save('run.json',{'mode':'rules','modelUsed':None,'sourceTimeline':'orchestrator/output/day9-vp007/timeline.json','pipeline':'Existing Day9 brief / Asset Proposal → Visual Director GL second pass → existing timeline renderer → existing Quality Gate with probe adapter','originalSourcesModified':False})
p=out/'sample.mp4';full=subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],capture_output=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
black=subprocess.run(['ffmpeg','-hide_banner','-i',str(p),'-vf','blackdetect=d=0.04:pix_th=0.10:pic_th=0.98','-an','-f','null','-'],capture_output=True).stderr.decode()
(out/'blackdetect.log').write_text(black)
# Exact packet identity avoids another codec pass / mix or narration gain change.
def audiohash(p):return hashlib.sha256(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-vn','-c:a','copy','-f','adts','-'])).hexdigest()
a=audiohash(p);b=audiohash(old/'sample-bgm-plus3.mp4');assert a==b
v=next(s for s in probe['streams'] if s['codec_type']=='video');assert (v['width'],v['height'],v['r_frame_rate'],int(v['nb_frames']))==(1080,1920,'30/1',546)
save('validation.json',{'status':'technical-checks-completed; human-review-pending','mode':'rules','modelUsed':None,'fullDecode':full.returncode==0,'noBlackIntervals':'black_start:' not in black,'probe':probe,'voiceSliceSampleExact':json.loads((old/'validation.json').read_text())['voiceSliceSampleExact'],'voiceProof':'Inherited source-sample proof from VP007 and exact unchanged AAC stream from its +3dB sample','sampleSha256':sha(p),'audioBitstreamUnchanged':a==b,'audioSha256':a,'sourceAudioSha256':b,'captionsAndScenesUnchanged':True,'selectedBgmBoostDb':3,'subjectiveQuality':'NOT_EVALUATED','publicationReady':False})
print('Decode, 546 frames, frozen source clocks, audio packet identity checked')
