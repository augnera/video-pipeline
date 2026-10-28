import copy,json,unittest
from pathlib import Path
from validate_assets import validate_asset, validate_bundle, validate_match, formal_library_eligible
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'orchestrator/output/day9-vp006-poc'
class ContractTests(unittest.TestCase):
 def setUp(self):
  self.assets=json.loads((OUT/'asset-catalog.json').read_text())['assets']
  self.matches=json.loads((OUT/'asset-matches.json').read_text())['matches']
  self.a=copy.deepcopy(self.assets[0]);self.m=copy.deepcopy(self.matches[1])
 def test_real_bundle(self):validate_bundle(self.assets,self.matches)
 def test_all_required_fields_enforced(self):
  from validate_assets import ASSET
  for key in ASSET.schema['required']:
   a=copy.deepcopy(self.a);del a[key]
   with self.subTest(field=key),self.assertRaises(Exception):validate_asset(a)
 def test_wrong_sha_and_source(self):
  for key,value in [('sha256','not-hash'),('sourceType','downloaded'),('reviewStatus','AI-approved')]:
   a=copy.deepcopy(self.a);a[key]=value
   with self.subTest(field=key),self.assertRaises(Exception):validate_asset(a)
 def test_asset_has_no_episode_fields(self):
  self.a['episodeId']='day9'
  with self.assertRaises(Exception):validate_asset(self.a)
 def test_image_null_unknown_allowed(self):validate_asset(self.assets[2]);self.assertIsNone(self.assets[2]['creator'])
 def test_image_cannot_have_fake_video_duration(self):
  a=copy.deepcopy(self.assets[2]);a['durationSeconds']=4
  with self.assertRaises(Exception):validate_asset(a)
 def test_duplicate_sha_rejected(self):
  a=copy.deepcopy(self.a);a['assetId']='duplicate'
  with self.assertRaises(Exception):validate_bundle(self.assets+[a],self.matches)
 def test_out_of_bounds_and_reverse_match_rejected(self):
  for start,end in [(8,2),(0,999),(None,None)]:
   m=copy.deepcopy(self.m);m.update(segmentStart=start,segmentEnd=end)
   with self.subTest(interval=(start,end)),self.assertRaises(Exception):validate_match(m,{a['assetId']:a for a in self.assets})
 def test_unknown_asset_is_gap(self):
  self.m['assetId']='missing'
  with self.assertRaises(Exception):validate_match(self.m,{})
 def test_pending_review_not_formal_library(self):self.assertFalse(any(map(formal_library_eligible,self.assets)))
 def test_verified_license_needs_evidence(self):
  self.a['license']['sourceUrl']=None
  with self.assertRaises(Exception):validate_asset(self.a)
 def test_reuse_between_episodes(self):
  m=copy.deepcopy(self.m);m['episodeId']='another-episode'
  validate_bundle(self.assets,self.matches+[m])
if __name__=='__main__':unittest.main()
