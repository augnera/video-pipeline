"""CPU-only validation of the sole produced video; never regenerates on failure."""
import argparse
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import subprocess
from runlog import snapshot


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('request',type=Path);a=p.parse_args()
    req=json.loads(a.request.read_text());out=Path(req['out']);cfg=req['profile'];video=out/'sample.mp4'
    raw=subprocess.check_output(['ffprobe','-v','error','-count_frames','-select_streams','v:0','-show_streams','-show_format','-of','json',str(video)],timeout=15)
    snapshot(out/'ffprobe.json',json.loads(raw));stream=json.loads(raw)['streams'][0]
    assert stream['width']==cfg['width'] and stream['height']==cfg['height']
    assert int(stream['nb_read_frames'])==cfg['frames'] and Fraction(stream['avg_frame_rate'])==cfg['fps']
    r=subprocess.run(['ffmpeg','-nostdin','-v','error','-i',str(video),'-f','null','-'],capture_output=True,timeout=20)
    (out/'decode-check-stdout.log').write_bytes(r.stdout);(out/'decode-check-stderr.log').write_bytes(r.stderr);assert r.returncode==0,r.stderr.decode(errors='replace')
    snapshot(out/'video-validation.json',{'runId':req['runId'],'result':'TECHNICAL_VIDEO_PASS','bytes':video.stat().st_size,'sha256':hashlib.file_digest(video.open('rb'),'sha256').hexdigest(),'width':stream['width'],'height':stream['height'],'fps':cfg['fps'],'frames':int(stream['nb_read_frames']),'durationSeconds':float(stream['duration']),'fullDecodeExitCode':r.returncode,'humanVisualReview':'NOT_EVALUATED','repeatedGeneration':'NOT_RUN','productionSuitability':'NOT_EVALUATED'})
    print('One sample technically validated; no regeneration.')


if __name__=='__main__':main()
