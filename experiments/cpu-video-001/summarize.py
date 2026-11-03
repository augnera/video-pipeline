"""Summarize actual completed run logs; no model imports or inference."""
import json
from pathlib import Path
import re

H = Path(__file__).resolve().parent
for attempt in sorted((H/'runs').glob('sample-*.attempt.json')):
    p = Path(json.loads(attempt.read_text())['outputDir'])
    result = json.loads((p/'result.json').read_text())
    text = (p/'stdout.log').read_text(errors='replace')
    phases = {}
    for key, pattern in {
        'textEncodingSeconds': r'get_learned_condition completed, taking ([0-9.]+)s',
        'samplingSeconds': r'sampling completed, taking ([0-9.]+)s',
        'vaeDecodeSeconds': r'decode_first_stage completed, taking ([0-9.]+)s',
    }.items():
        match = re.search(pattern, text)
        phases[key] = float(match.group(1)) if match else None
    warnings = [line for line in text.splitlines() if re.search(r'\[(?:E|W)\]|\b(?:NaN|Inf|overflow|mismatch)\b',line,re.I)]
    resources = [json.loads(x) for x in (p/'resources.jsonl').read_text().splitlines()]
    proof = {'engineBackendCpu': 'Initializing backend: CPU' in text,
             'modelPlacements': [x for x in text.splitlines() if 'on CPU' in x and ('params backend' in x or 'compute buffer' in x)],
             'allocatedWeightsVramZero': 'VRAM 0.00MB' in text,
             'nativeCpuAttention': 'flash attention auto: CPU -> on (CPU)' in text,
             'runtimeMapEvidence': str(p/'runtime-cpu-proof.json'),
             'softwareEncodeCommand': result.get('encodingCommand')}
    out = {'runId':p.name,'status':result['status'],'phaseTimings':phases,'engineWarningErrorLines':warnings,
           'cpuEvidence':proof,'resourceSamples':len(resources),'sampleIntervalSeconds':2,
           'peakRssDefinition':'Sampled sum of current run process-group RSS; not a kernel exact high-water mark; excludes unrelated services',
           'minimumAvailableBytes':min(x['availableBytes']for x in resources),
           'swapIncreaseBytes':max(x['swapUsedBytes']for x in resources)-resources[0]['swapUsedBytes'],
           'temperature':'NOT_RECORDED: WSL hwmon empty, no validated CPU thermal sensor',
           'timingLimit':'Engine-emitted durations; model loading can be lazy and overlaps first use. No fabricated per-module start/end timestamps.',
           'preClampNumericStatistics':'UNAVAILABLE: upstream CLI has no export interface; PNG values are post-conversion and cannot establish pre-clamp finiteness'}
    (p/'summary.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'runId':p.name,'status':result['status'],'phaseTimings':phases},ensure_ascii=False))
