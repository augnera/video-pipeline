#!/usr/bin/env python3
"""Build VP-005A assets and ASR-estimated phrase captions from frozen Day9 inputs."""
import hashlib, json, re, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "orchestrator/output/day9-vp005a"
PUB = Path(__file__).resolve().parents[1] / "public"
VOICED = ROOT / "orchestrator/output/day9/script.voiced.json"
MATRIX = ROOT / "orchestrator/output/day9-vp003a/visual-matrix.json"
ASR_DIR = ROOT / "local-assets/voice/experiments/day9-g4/checks"
PREVIEW = ROOT / "local-assets/voice/experiments/day9-g4/day9-preview.wav"
FRAME1 = ROOT / "orchestrator/output/day9-vp004a/shot-001-first-frame-v1.png"
SHOT5 = ROOT / "orchestrator/output/day9-vp003a/shot-005-remotion.mp4"

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def fmt_srt(t):
    ms = round(t * 1000); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"
def strip_punct(s): return ''.join(c for c in s if c.isalnum() or '\u3400' <= c <= '\u9fff')

OUT.mkdir(parents=True, exist_ok=True); PUB.mkdir(parents=True, exist_ok=True)
voiced = json.loads(VOICED.read_text()); matrix = json.loads(MATRIX.read_text())
assert len(voiced['shots']) == len(matrix['shots']) == 10
assert sha(PREVIEW) == '85ba511665f9f17380ea55fc2d4dc2fc4a70e11ea1f1e27da00d14d7a693e291'
assert sha(SHOT5) == 'd8f6150f51c6aa000fefc30a5d092de9aca060ad308579b539e4417570a97fcd'
shutil.copy2(PREVIEW, PUB / 'day9-preview.wav')
shutil.copy2(FRAME1, PUB / 'shot-001-first-frame-v1.png')

shots=[]; cues=[]; cue_id=1
for idx, s in enumerate(voiced['shots']):
    n=s['shotNumber']; duration=s['voiceover']['durationSeconds']; start=s['voiceover']['timelineStartSeconds']
    visual_end = voiced['shots'][idx+1]['voiceover']['timelineStartSeconds'] if idx+1 < len(voiced['shots']) else start+duration
    shots.append({'shotNumber':n,'startSeconds':start,'endSeconds':start+duration,'durationSeconds':duration,
      'startFrame':round(start*30),'endFrame':round(visual_end*30) if n<10 else 2514,
      'narration':s['narration'],'overlayText':s['overlayText'],'templateId':matrix['shots'][idx]['templateId'],
      'voiceAudioSha256':s['voiceover']['audioSha256'],'visualAsset':'shot-001-first-frame-v1.png' if n==1 else ('remotion-opinion-card-vp003a' if n==5 else None)})
    asr=json.loads((ASR_DIR/f'shot-{n:03}.json').read_text())
    # Whisper word boundaries are estimates, not forced alignment. Map their character spans
    # sequentially to the authoritative script, preserving source punctuation and wording.
    spoken=strip_punct(s['narration']); timing=[]
    for seg in asr['segments']:
        for w in seg.get('words',[]):
            token=strip_punct(w['word'])
            if token:
                timing.extend([(start+w['start'],start+w['end'])] * len(token))
    if len(timing) != len(spoken):
        raise ValueError(f'shot {n}: source spoken chars {len(spoken)} != ASR chars {len(timing)}')
    # Include punctuation in the on-screen source text. Break at natural punctuation or
    # roughly 14 Han characters so mobile captions stay within two lines.
    cursor=0; char_cursor=0
    while cursor < len(s['narration']):
        while cursor < len(s['narration']) and s['narration'][cursor].isspace(): cursor += 1
        if cursor >= len(s['narration']): break
        end=min(cursor+16,len(s['narration']))
        for j in range(cursor,min(cursor+17,len(s['narration']))):
            if s['narration'][j] in '，。！？；：': end=j+1; break
        text=s['narration'][cursor:end]
        visible=strip_punct(text)
        if not visible: cursor=end; continue
        a=timing[char_cursor][0]; b=timing[char_cursor+len(visible)-1][1]
        cues.append({'id':cue_id,'startSeconds':max(0,a),'endSeconds':min(83.771565,b),'text':text,'shotNumber':n})
        cue_id += 1; char_cursor += len(visible); cursor=end
    assert char_cursor == len(spoken), (n,char_cursor,len(spoken))

timeline={'schemaVersion':'day9-vp005a/1','status':'rendered-mvp','width':1080,'height':1920,'fps':30,
 'audio':{'path':'local-assets/voice/experiments/day9-g4/day9-preview.wav','publicAsset':'day9-preview.wav','durationSeconds':83.77156462585035,'sha256':sha(PREVIEW),'tracks':1},
 'visualCoverage':'10 shots; global frames, last-frame ceiling 2514','subtitlePrecision':'phrase captions timed from existing Whisper word timestamps; ASR estimate, not forced alignment; authoritative text copied from voiced script',
 'shots':shots,'captions':cues}
(OUT/'timeline.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2)+'\n')
(Path(__file__).resolve().parents[1]/'src/generated/timeline-vp005a.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2)+'\n')
blocks=[]
for c in cues:
    blocks.append(f"{c['id']}\n{fmt_srt(c['startSeconds'])} --> {fmt_srt(c['endSeconds'])}\n{c['text']}\n")
(OUT/'subtitles.srt').write_text('\n'.join(blocks),encoding='utf-8')
print(json.dumps({'shots':len(shots),'captions':len(cues),'duration':timeline['audio']['durationSeconds'],'audioSha256':timeline['audio']['sha256'],'shot1Sha256':sha(FRAME1)},ensure_ascii=False))
