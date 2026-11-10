import json
import unittest
from unittest.mock import Mock,patch
from urllib.error import HTTPError
import market_overview as M
import server

class Reply:
    def __init__(self,d):self.d=d
    def __enter__(self):return self
    def __exit__(self,*_):pass
    def read(self,*_):return json.dumps(self.d).encode()

class OverviewTests(unittest.TestCase):
    def setUp(self):M._cache.clear();self.auth=Mock(return_value={'ok':True,'token':'private-token','environment':'production'})
    def test_identity_barcode_uses_ebay_gtin_parameter(self):
        from http.server import ThreadingHTTPServer
        from urllib.parse import parse_qs, urlparse
        from urllib.request import urlopen
        import threading

        http=ThreadingHTTPServer(('127.0.0.1',0),server.H)
        worker=threading.Thread(target=http.serve_forever,daemon=True);worker.start()
        url=f'http://127.0.0.1:{http.server_port}/api/identity-search?barcode='
        self.auth.return_value['base']='https://api.ebay.com'
        try:
            with patch.object(server,'ebay_access_token',self.auth),patch.object(server,'urlopen',return_value=Reply({'total':0,'itemSummaries':[]})) as upstream:
                with urlopen(url+'5030917096846&q=ignored') as response:
                    self.assertEqual(json.load(response)['returned'],0)
                params=parse_qs(urlparse(upstream.call_args.args[0].full_url).query)
                self.assertEqual(params['gtin'],['5030917096846'])
                self.assertNotIn('q',params)
                with self.assertRaises(HTTPError) as error:
                    urlopen(url+'5030917096847')
                self.assertEqual(error.exception.code,400)
                upstream.assert_called_once()
        finally:
            http.shutdown();worker.join();http.server_close()
    def test_base_and_marketing_application_tokens_have_separate_cache_entries(self):
        import os
        server._ebay_token_cache.clear();server._ebay_marketing_token_cache.clear()
        with patch.dict(os.environ,{'EBAY_LIVE_CLIENT_ID':'test-id','EBAY_LIVE_CLIENT_SECRET':'test-secret'},clear=True),patch.object(server,'urlopen',side_effect=[Reply({'access_token':'base-token','expires_in':7200}),Reply({'access_token':'marketing-token','expires_in':7200})]) as call:
            self.assertEqual(server.ebay_access_token()['token'],'base-token')
            self.assertEqual(server.ebay_access_token(M.MARKETING_SCOPE)['token'],'marketing-token')
            self.assertEqual(server.ebay_access_token(M.MARKETING_SCOPE)['token'],'marketing-token')
            self.assertEqual(server.ebay_access_token()['token'],'base-token');self.assertEqual(call.call_count,2)
    def test_official_best_selling_scope_and_category_are_separate_from_browse_and_reviews_are_not_sales(self):
        best={'merchandisedProducts':[{'epid':'123','title':'Best seller','reviewCount':9999,'marketPriceDetails':[{'conditionGroup':'USED','estimatedStartPrice':{'value':'25','currency':'GBP'}}]}]}
        high={'itemSummaries':[{'itemId':'v1|123456789|0','title':'High ask','price':{'value':'500','currency':'GBP'},'itemWebUrl':'https://www.ebay.co.uk/itm/123456789','buyingOptions':['FIXED_PRICE']}]}
        with patch.object(M,'urlopen',side_effect=[Reply(best),Reply(high)]) as call:
            d=M.overview('games',self.auth)
        self.assertTrue(d['best']['ok']);self.assertEqual(self.auth.call_args_list[0].args[0],M.MARKETING_SCOPE);self.assertEqual(self.auth.call_args_list[1].args[0],M.BASE_SCOPE)
        self.assertIn('metric_name=BEST_SELLING',call.call_args_list[0].args[0].full_url);self.assertIn('category_id=139973',call.call_args_list[0].args[0].full_url)
        self.assertNotIn('reviewCount',str(d));self.assertNotIn('private-token',str(d))
        self.assertEqual(d['active']['count'],1);self.assertIsNone(d['active']['median'])
    def test_invalid_category_and_sandbox_never_become_live_market_data(self):
        self.assertFalse(M.overview('unknown',self.auth)['ok']);self.auth.assert_not_called()
        self.auth.return_value.update(environment='sandbox')
        with patch.object(M,'urlopen') as call:d=M.overview('toys',self.auth)
        self.assertFalse(d['best']['ok']);self.assertFalse(d['active']['ok']);call.assert_not_called()
    def test_market_token_rejection_and_expensive_asks_do_not_swamp_category_sample(self):
        def auth(scope):
            if scope==M.MARKETING_SCOPE:return {'ok':False,'status':'eBay market authentication HTTP 400','detail':'private upstream detail'}
            return self.auth()
        prices=[5,10,15,20,25,30,35,200086.70]
        rows=[{'itemId':f'v1|{123456780+n}|0','title':f'Game {n+1}','itemWebUrl':f'https://www.ebay.co.uk/itm/{123456780+n}',
               'price':{'value':str(value),'currency':'GBP'},'buyingOptions':['FIXED_PRICE']} for n,value in enumerate(prices)]
        rows.append({**rows[-1],'itemId':'v1|123456787|99'})
        with patch.object(M,'urlopen',return_value=Reply({'itemSummaries':rows})) as browse:
            data=M.overview('games',auth)
        self.assertNotIn('sort=',browse.call_args.args[0].full_url)
        self.assertEqual(data['best']['status'],'eBay UK best-sellers access unavailable')
        self.assertIn('HTTP 400',data['best']['detail'])
        self.assertNotIn('private upstream detail',str(data))
        active=data['active']
        self.assertEqual((active['count'],active['lower'],active['median'],active['upper']),(8,12.5,22.5,32.5))
        self.assertEqual([row['title'] for row in active['listings'][:2]],['Game 1','Game 2'])
        self.assertEqual(active['listings'][0]['value'],5)
        self.assertNotIn('high',data)
    def test_missing_marketing_approval_is_visible_not_a_fake_best_seller_list(self):
        with patch.object(M,'urlopen',side_effect=HTTPError('url',403,'private-body',{},None)):
            d=M.overview('games',self.auth)
        self.assertFalse(d['best']['ok']);self.assertIn('buy.marketing',d['best']['detail']);self.assertNotIn('private-body',str(d))
    def test_toy_detail_uses_browse_aspects_not_cex_or_pricecharting_and_validates_the_exact_listing(self):
        id='v1|123456789|0';detail={'itemId':id,'title':'WowWee Homersapien Homer Simpson Robot','itemWebUrl':'https://www.ebay.co.uk/itm/123456789','localizedAspects':[{'name':'Brand','value':'WowWee'},{'name':'Model','value':'Homersapien'},{'name':'EAN','value':'Does not apply'}]}
        with patch.object(M,'urlopen',return_value=Reply(detail)),patch.object(server,'cex_search') as cex,patch.object(server,'pc_call') as pc:
            d=M.identity_detail(id,self.auth)
        self.assertEqual(d['manufacturer'],'WowWee');self.assertEqual(d['platform'],'Homersapien');self.assertEqual(d['barcode'],'');cex.assert_not_called();pc.assert_not_called()
        detail['itemId']='v1|999999999|0'
        with patch.object(M,'urlopen',return_value=Reply(detail)):self.assertFalse(M.identity_detail(id,self.auth)['ok'])
        self.assertFalse(M.identity_detail('https://evil.test',self.auth)['ok'])
    def test_toy_search_route_bypasses_game_catalogue_and_omits_seller_identity(self):
        from http.server import ThreadingHTTPServer
        from urllib.request import urlopen
        import threading
        http=ThreadingHTTPServer(('127.0.0.1',0),server.H);worker=threading.Thread(target=http.serve_forever,daemon=True);worker.start()
        try:
            sample={'ok':True,'environment':'production','items':[{'itemId':'v1|123456789|0','title':'WowWee Homer','price':60,'currency':'GBP','itemWebUrl':'https://www.ebay.co.uk/itm/123456789','seller':'private-seller'}]}
            with patch.object(server,'ebay_browse_search',return_value=sample),patch.object(server,'pricecharting_lookup') as pc,patch.object(server,'cex_search') as cex:
                with urlopen('http://127.0.0.1:'+str(http.server_port)+'/api/identity-search?q=WowWee%20Homersapien') as response:d=json.load(response)
                self.assertEqual(d['candidates'][0]['title'],'WowWee Homer');self.assertNotIn('private-seller',str(d));pc.assert_not_called();cex.assert_not_called()
        finally:http.shutdown();worker.join();http.server_close()
