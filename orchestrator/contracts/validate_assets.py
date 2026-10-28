"""Asset v0.1 offline structural and cross-record checks; no promotion/service/database."""
import json
from pathlib import Path
from jsonschema import Draft202012Validator
HERE=Path(__file__).resolve().parent
ASSET=Draft202012Validator(json.loads((HERE/'asset-v0.1.schema.json').read_text()))
MATCH=Draft202012Validator(json.loads((HERE/'asset-match-v0.1.schema.json').read_text()))
def validate_asset(a):
 ASSET.validate(a)
 for s in a['usableSegments']:
  if s['end']<=s['start'] or a['durationSeconds'] is None or s['end']>a['durationSeconds']:
   raise ValueError('usable segment must be increasing and within measured duration')
 if a['licenseStatus']=='verified_for_local_experiment' and not (a['license']['sourceUrl'] and a['license']['verifiedAt'] and a['license']['localExperimentAllowed'] is True):
  raise ValueError('verified license requires source, date and explicit permitted scope')
def validate_match(m,assets):
 MATCH.validate(m)
 if m['assetId'] not in assets: raise ValueError('missing asset reference; record a gap instead')
 a=assets[m['assetId']]
 if a['mediaType']=='image':
  if m['segmentStart'] is not None or m['segmentEnd'] is not None: raise ValueError('image has no video time range')
 elif m['segmentStart'] is None or m['segmentEnd'] is None or not (0<=m['segmentStart']<m['segmentEnd']<=a['durationSeconds']):
  raise ValueError('matched video interval outside source')
def validate_bundle(assets,matches):
 ids=set(); hashes=set()
 for a in assets:
  validate_asset(a)
  if a['assetId'] in ids or a['sha256'] in hashes: raise ValueError('reuse existing asset ID for duplicate SHA instead of duplicate entry')
  ids.add(a['assetId']);hashes.add(a['sha256'])
 index={a['assetId']:a for a in assets}
 for m in matches: validate_match(m,index)
def formal_library_eligible(a):
 validate_asset(a)
 return a['reviewStatus']=='approved' and a['licenseStatus']=='verified_for_local_experiment'
if __name__=='__main__':
 import sys
 a=json.loads(Path(sys.argv[1]).read_text())['assets'];m=json.loads(Path(sys.argv[2]).read_text())['matches']
 validate_bundle(a,m)
 print(f'Valid v0.1 bundle: {len(a)} assets, {len(m)} matches; formal eligible={sum(map(formal_library_eligible,a))}')
