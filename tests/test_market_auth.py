import json
import os
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
import server

class Reply:
    def __enter__(self): return self
    def __exit__(self,*_): pass
    def read(self): return json.dumps({'access_token':'test-application-token','expires_in':7200}).encode()

class MarketAuthTests(unittest.TestCase):
    def setUp(self): server._ebay_token_cache.update(token=None,expires=0,client=None,environment=None)

    def test_connected_production_app_is_used_before_old_sandbox_defaults(self):
        with patch.dict(os.environ,{'EBAY_LIVE_CLIENT_ID':'prod-id','EBAY_LIVE_CLIENT_SECRET':'prod-secret',
            'EBAY_CLIENT_ID':'old-sandbox-id','EBAY_CLIENT_SECRET':'old-sandbox-secret','EBAY_ENV':'sandbox'},clear=True),patch.object(server,'urlopen',return_value=Reply()) as call:
            result=server.ebay_access_token();request=call.call_args.args[0]
            self.assertTrue(result['ok']);self.assertEqual(result['environment'],'production')
            self.assertEqual(request.full_url,'https://api.ebay.com/identity/v1/oauth2/token')
            import base64
            self.assertEqual(request.get_header('Authorization'),'Basic '+base64.b64encode(b'prod-id:prod-secret').decode())

    def test_explicit_market_override_and_incomplete_override_never_silently_fall_back(self):
        env={'EBAY_LIVE_CLIENT_ID':'prod-id','EBAY_LIVE_CLIENT_SECRET':'prod-secret','EBAY_MARKET_CLIENT_ID':'override-id','EBAY_MARKET_CLIENT_SECRET':'override-secret'}
        with patch.dict(os.environ,env,clear=True):self.assertEqual(server._ebay_market_credentials()['client'],'override-id')
        env['EBAY_MARKET_CLIENT_SECRET']=''
        with patch.dict(os.environ,env,clear=True),patch.object(server,'urlopen') as call:
            self.assertFalse(server.ebay_access_token()['ok']);call.assert_not_called()

    def test_partial_production_keys_do_not_fall_back_to_legacy_keys(self):
        with patch.dict(os.environ,{'EBAY_LIVE_CLIENT_ID':'prod-id','EBAY_CLIENT_ID':'old-id','EBAY_CLIENT_SECRET':'old-secret'},clear=True):
            self.assertFalse(server._ebay_market_credentials()['ok'])

    def test_401_explains_the_selected_pair_without_reflecting_provider_secrets(self):
        with patch.dict(os.environ,{'EBAY_MARKET_CLIENT_ID':'private-id','EBAY_MARKET_CLIENT_SECRET':'private-secret'},clear=True),patch.object(server,'urlopen',side_effect=HTTPError('url',401,'private upstream',{},None)):
            result=server.ebay_access_token();text=json.dumps(result)
            self.assertIn('EBAY_MARKET_CLIENT_ID',result['detail']);self.assertNotIn('private-id',text);self.assertNotIn('private-secret',text);self.assertNotIn('private upstream',text)

    def test_rotating_the_secret_reissues_a_token_even_if_app_id_is_unchanged(self):
        with patch.dict(os.environ,{'EBAY_LIVE_CLIENT_ID':'prod-id','EBAY_LIVE_CLIENT_SECRET':'first-secret'},clear=True),patch.object(server,'urlopen',return_value=Reply()) as call:
            server.ebay_access_token();server.ebay_access_token();self.assertEqual(call.call_count,1)
            os.environ['EBAY_LIVE_CLIENT_SECRET']='second-secret';server.ebay_access_token();self.assertEqual(call.call_count,2)
