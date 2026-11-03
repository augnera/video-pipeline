"""Production voice dispatcher: CPU-only while GPU synthesis remains stopped."""
import json
import pathlib
import runpy
import sys

def main():
    request=json.loads(pathlib.Path(sys.argv[1]).read_text())
    voice=request['config']['voice']
    if voice.get('device')!='cpu' or voice.get('precision')!='fp32':
        raise RuntimeError('GPU_TTS_STOP: CPU/FP32 execution is required; no automatic GPU fallback')
    runpy.run_path(str(pathlib.Path(__file__).with_name('cpu-voice.py')),run_name='__main__')

if __name__=='__main__':
    main()
