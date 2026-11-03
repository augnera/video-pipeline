import copy,json,tempfile,unittest,urllib.error
from unittest.mock import patch
from pathlib import Path
import network as n
class NetworkTests(unittest.TestCase):
 def setUp(self):self.cfg=n.lib.load('orchestrator/config/asset-network-v1.json')
 def test_redaction(self):
  raw={'Authorization':'secret','url':'https://host/path?api_key=secret&client_id=secret&token=secret','client_secret':'secret'}
  self.assertNotIn('secret',json.dumps(n.redact(raw)).replace('client_secret',''))
 def test_public_unsplash_uses_access_only(self):
  cfg=copy.deepcopy(self.cfg);cfg['cacheDir']=tempfile.mkdtemp()
  calls=[]
  def key(provider,c):calls.append(c['providers'][provider]['keyEnv']);return 'test-access','test'
  def deny(req,**kw):
   self.assertEqual(req.headers['Authorization'],'Client-ID test-access');self.assertNotIn('test-access',req.full_url);raise urllib.error.HTTPError(req.full_url,403,'denied',{},None)
  with patch.object(n,'key_for',side_effect=key),patch.object(n.urllib.request,'urlopen',side_effect=deny) as http:
   r=n.api_search('unsplash','workspace',cfg);self.assertEqual(http.call_count,1)
  self.assertEqual(calls,['UNSPLASH_ACCESS_KEY']);self.assertEqual(r['error']['status'],403)
 def test_unsplash_callback_origin_guard(self):
  with self.assertRaises(n.Blocked):n.track_download({'source':'unsplash','id':'x','download_location':'https://elsewhere/photos/x/download'},self.cfg)
 def test_existing_download_no_extra_request(self):
  c=n.lib.load('orchestrator/output/asset-network-supplement-v1/pixabay-215751-accepted-candidate.json')
  with patch.object(n.urllib.request,'urlopen',side_effect=AssertionError('no repeat')):
   self.assertEqual(n.fetch(c,self.cfg)['status'],'REUSED_NO_DOWNLOAD')
 def test_director_query_required_no_network(self):
  b={'episodeId':'test','requests':[{'requestId':'x','shotNumber':1,'mustShow':['actual_ai_execution'],'durationSeconds':4}]}
  with tempfile.TemporaryDirectory() as out,patch.object(n,'api_search',side_effect=AssertionError('no abstract search')):
   r=n.discover(b,self.cfg,out);self.assertEqual(r['rows'][0]['status'],'DIRECTOR_QUERY_REQUIRED')
if __name__=='__main__':unittest.main()
