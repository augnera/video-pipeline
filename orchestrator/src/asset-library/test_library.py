import copy, importlib.util, json, tempfile, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('library',Path(__file__).with_name('library.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class LibraryTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.base=m.load('local-assets/library/index.json');cls.cfg=m.load('orchestrator/config/asset-library-v1.json')
 def setUp(self):self.lib=copy.deepcopy(self.base)
 def brief(self,**q):return {'episodeId':'next-episode-test','requests':[dict(requestId='r1',shotNumber=1,concepts=['keyboard_work'],durationSeconds=3,**q)]}
 def test_reproducible_real_match_and_no_contract_change(self):
  a=m.propose(self.lib,self.brief(),self.cfg);b=m.propose(self.lib,self.brief(),self.cfg)
  self.assertEqual(a,b);self.assertTrue(a['recommendations'][0]['available']);self.assertFalse(a['publicReady'])
  for x in a['recommendations']:
   if x.get('available'):m.validate_match(x['match'],{v['assetId']:v for v in self.lib['assets']})
 def test_explicit_visual_need_beats_incidental_narration(self):
  b=self.brief(narration='写代码、分析、需求、报告');p=m.propose(self.lib,b,self.cfg)
  self.assertIn('keyboard_work',self.lib['records'][p['recommendations'][0]['sha256']]['semanticUses'])
 def test_public_gate_separate_from_source_traceability(self):
  p=m.propose(self.lib,self.brief(),self.cfg,'public');self.assertEqual(len(p['gaps']),1)
 def test_no_fake_real_ai_operation(self):
  p=m.propose(self.lib,self.brief(mustShow=['actual_ai_execution']),self.cfg);self.assertTrue(p['gaps'])
 def test_duration_and_news_scope(self):
  q={'episodeId':'another','requests':[{'requestId':'n','shotNumber':1,'kind':'image_motion','concepts':['microsoft_veo_news'],'noVisibleFace':True}]}
  self.assertTrue(m.propose(self.lib,q,self.cfg)['gaps'])
  q=self.brief();q['requests'][0]['durationSeconds']=1000;self.assertTrue(m.propose(self.lib,q,self.cfg)['gaps'])
 def test_repetition_and_rejected_not_selected(self):
  b=self.brief();b['requests']=[dict(b['requests'][0],requestId=str(i),shotNumber=i+1) for i in range(len(self.lib['assets'])*2+1)]
  p=m.propose(self.lib,b,self.cfg);ids=[v['assetId'] for v in p['recommendations'] if v.get('available')]
  self.assertTrue(p['gaps']);self.assertTrue(all(ids.count(x)<=2 for x in ids));self.assertTrue(all(x!=y for x,y in zip(ids,ids[1:])))
  for a in self.lib['assets']:a['reviewStatus']='rejected'
  self.assertTrue(m.propose(self.lib,self.brief(),self.cfg)['gaps'])
 def test_byte_change_invalidates_match(self):
  for a in self.lib['assets']:
   if 'keyboard_work' in self.lib['records'][a['sha256']].get('semanticUses',[]):a['sha256']='a'*64
  # Record mapping deliberately stale: validate bytes must fail before selecting.
  for a in self.lib['assets']:
   if a['sha256']=='a'*64:self.lib['records']['a'*64]=copy.deepcopy(next(iter(self.lib['records'].values())))
  self.assertTrue(m.propose(self.lib,self.brief(),self.cfg)['gaps'])
 def test_prepared_source_hash_clock_and_coverage(self):
  b=m.load('orchestrator/output/video-library-cpu-validation/ten-real-needs.json');b['requests']=[q for q in b['requests'] if q['requestId']=='need-1']
  r=m.propose(self.lib,b,self.cfg)['recommendations'][0]
  self.assertTrue(r['available']);self.assertEqual(r['renderSourceClockOriginSeconds'],0);self.assertLessEqual(r['sourceEnd'],r['renderSourceCoverage']['end'])
  a=next(a for a in self.lib['assets'] if a['assetId']==r['assetId']);p=self.lib['records'][a['sha256']]['composition']['preparedMedia'];p['sourceClockOriginSeconds']=1
  self.assertTrue(m.propose(self.lib,b,self.cfg)['gaps'])
 def test_sha_dedup_and_idempotent_history(self):
  lib=m.fresh();a=copy.deepcopy(self.lib['assets'][4]);r=self.lib['records'][a['sha256']]
  m.merge(lib,a,'original');a['assetId']='alias';m.merge(lib,a,'alias');self.assertEqual(len(lib['assets']),1)
  t='orchestrator/output/microsoft-veo-skills-20261028-vp010/timeline.json';n=len(self.lib['usageHistory']);m.record_timeline(self.lib,m.load(t),t);m.record_timeline(self.lib,m.load(t),t);self.assertEqual(n,len(self.lib['usageHistory']))
 def test_overlay_rects_outside_subject_and_caption_safe_zone(self):
  r=self.lib['records'][next(a['sha256'] for a in self.lib['assets'] if a['assetId']=='mixkit-1781')]
  s=m.overlay_suggestions(r,self.cfg);self.assertTrue(s['positions'])
  for p in s['positions']:self.assertLessEqual(p['rect']['y']+p['rect']['height'],self.cfg['subtitleSafeTop'])
  bad=copy.deepcopy(r);bad['composition']['overlayRegions'][0]['x']=1
  with self.assertRaises(ValueError):m.validate_reuse(bad)
if __name__=='__main__':unittest.main()
