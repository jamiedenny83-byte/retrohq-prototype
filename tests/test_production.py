import io
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen
from http.server import ThreadingHTTPServer
import ebay_live as live
import ebay_seller as sandbox
import server

def listing_xml(variations=False,pages=1):
    units='<Variations><Variation><SKU>RED</SKU><StartPrice currencyID="GBP">15</StartPrice><Quantity>4</Quantity><SellingStatus><QuantitySold>1</QuantitySold></SellingStatus></Variation><Variation><SKU>BLUE</SKU><StartPrice currencyID="GBP">16</StartPrice><QuantityAvailable>2</QuantityAvailable></Variation></Variations>' if variations else '<SKU>ONE</SKU><QuantityAvailable>3</QuantityAvailable><SellingStatus><CurrentPrice currencyID="GBP">12</CurrentPrice></SellingStatus>'
    return ('<GetMyeBaySellingResponse xmlns="urn:ebay:apis:eBLBaseComponents"><Ack>Success</Ack><ActiveList><PaginationResult><TotalNumberOfPages>'+str(pages)+'</TotalNumberOfPages></PaginationResult><ItemArray><Item><ItemID>123</ItemID><Title>A game</Title>'+units+'</Item></ItemArray></ActiveList></GetMyeBaySellingResponse>').encode()

def order():
    return {'orderId':'O1','orderPaymentStatus':'PAID','cancelStatus':{'cancelState':'NONE'},'creationDate':'2026-10-23T12:00:00Z','buyer':{'username':'PRIVATE_BUYER'},'fulfillmentStartInstructions':[{'shippingStep':{'shipTo':{'fullName':'PRIVATE_NAME'}}}], 'lineItems':[{'lineItemId':'L1','legacyItemId':'123','sku':'ONE','quantity':1,'title':'A game','lineItemCost':{'value':'12','currency':'GBP'}}]}

class ProductionTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.store=Path(self.temp.name)/'production'/'tokens.json'
        for p in [patch.object(live,'_store_path',return_value=self.store),patch.dict(os.environ,{'EBAY_ENV':'sandbox','EBAY_LIVE_CLIENT_ID':'production-client','EBAY_LIVE_CLIENT_SECRET':'production-secret','EBAY_LIVE_RUNAME':'production-runame','RETROHQ_ADMIN_PIN':'long-private-pin'})]:p.start();self.addCleanup(p.stop)
        live.ebay_listing_details._cache.clear();live.ebay_listing_details._attempted.clear();live._pending.clear();live._access.update(token=None,expires=0)

    def test_production_authorisation_is_separate_single_use_and_refresh_only_on_disk(self):
        pending=dict(sandbox._pending);access=dict(sandbox._access)
        url=live.start_authorisation()['authorizeUrl'];q=parse_qs(urlparse(url).query)
        self.assertEqual(urlparse(url).hostname,'auth.ebay.com');self.assertEqual(q['redirect_uri'],['production-runame'])
        self.assertEqual(set(q['scope'][0].split()),set(live.SCOPES));self.assertNotEqual(live._store_path(),sandbox._store_path())
        self.assertFalse(live.complete_authorisation('forged','code')['ok'])
        data={'ok':True,'data':{'access_token':'PRIVATE_ACCESS','refresh_token':'PRIVATE_REFRESH','expires_in':7200,'refresh_token_expires_in':99999}}
        with patch.object(live,'_token_request',return_value=data):result=live.complete_authorisation(q['state'][0],'code')
        self.assertTrue(result['ok']);self.assertNotIn('PRIVATE',json.dumps(result))
        self.assertNotIn('PRIVATE_ACCESS',self.store.read_text());self.assertIn('PRIVATE_REFRESH',self.store.read_text())
        self.assertTrue(live.configuration()['connected']);
        if os.name!='nt':self.assertEqual(self.store.stat().st_mode & 0o777,0o600)
        self.assertFalse(live.complete_authorisation(q['state'][0],'reuse')['ok'])
        self.assertEqual(pending,sandbox._pending);self.assertEqual(access,sandbox._access)
        live._access.update(token=None,expires=0)
        with patch.object(live,'_token_request',return_value={'ok':True,'data':{'access_token':'REFRESHED','expires_in':7200}}) as request:
            self.assertEqual(live._user_token()['token'],'REFRESHED');self.assertEqual(request.call_args.args[0]['refresh_token'],'PRIVATE_REFRESH')

    def test_missing_production_settings_never_fall_back_to_sandbox(self):
        with patch.dict(os.environ,{'EBAY_LIVE_CLIENT_SECRET':''}),patch.object(live,'_token_request') as request:
            self.assertFalse(live._user_token()['ok']);request.assert_not_called()
        self.store.parent.mkdir(parents=True)
        for body in ['[]','{"environment":"sandbox","refresh_token":"x"}','{"environment":"production","refresh_token":"x","refresh_expires_at":"bad"}']:
            self.store.write_text(body);os.chmod(self.store,0o600);self.assertIsNone(live._read_store())

    def test_listing_variations_preserve_sku_price_and_available_quantities(self):
        rows,pages=live._active_page(listing_xml(True,3));self.assertEqual(pages,3)
        self.assertEqual([(x['sku'],x['quantity'],x['price'])for x in rows],[('RED',3,15),('BLUE',2,16)])
        rows,_=live._active_page(listing_xml());self.assertEqual(rows[0]['quantity'],3)
        with self.assertRaises(ValueError):live._active_page(listing_xml().replace(b'Success',b'Failure'))

    def test_snapshot_reads_production_only_redacts_buyers_and_bounds_paging(self):
        requests=[]
        def read(request):
            requests.append(request)
            if '/ws/' in request.full_url:return listing_xml()
            return json.dumps({'orders':[order()],'total':1}).encode()
        with patch.object(live,'_user_token',return_value={'ok':True,'token':'PRIVATE_TOKEN'}),patch.object(live,'_read_bytes',side_effect=read):result=live.snapshot()
        self.assertTrue(result['ok']);self.assertEqual(result['environment'],'production');self.assertEqual(len(requests),3)
        self.assertTrue(all(urlparse(r.full_url).hostname=='api.ebay.com' for r in requests))
        self.assertEqual(requests[0].get_method(),'POST');self.assertIn(b'GetMyeBaySellingRequest',requests[0].data)
        self.assertEqual(requests[1].get_method(),'GET');self.assertIn('lastmodifieddate',requests[1].full_url)
        self.assertEqual(requests[2].get_header('X-ebay-api-call-name'),'GetItem');self.assertNotIn('PRIVATE',json.dumps(result));self.assertEqual(result['orders'][0]['sku'],'ONE');self.assertEqual(result['orders'][0]['createdAt'],'2026-10-23T12:00:00Z')
        with patch.object(live,'_user_token',return_value={'ok':True,'token':'x'}),patch.object(live,'_read_bytes',return_value=listing_xml(pages=99)):
            # Listing cap then malformed order response => no partial success saved.
            self.assertFalse(live.snapshot()['ok'])

    def test_partial_order_window_is_disclosed_and_malformed_reads_fail_safely(self):
        count=0
        def read(request):
            nonlocal count
            if '/ws/' in request.full_url:return listing_xml()
            count+=1;v=order();v['orderId']='O'+str(count)
            return json.dumps({'orders':[v],'total':99999,'next':'https://evil.example/steal'}).encode()
        with patch.object(live,'_user_token',return_value={'ok':True,'token':'x'}),patch.object(live,'_read_bytes',side_effect=read):result=live.snapshot()
        self.assertTrue(result['orderTruncated']);self.assertEqual(count,10)
        for body in [b'[]',b'{"orders":12}',b'{not json']:
            with patch.object(live,'_user_token',return_value={'ok':True,'token':'x'}),patch.object(live,'_read_bytes',side_effect=[listing_xml(),body]):self.assertFalse(live.snapshot()['ok'])

    def test_http_guards_callback_isolation_and_safe_status(self):
        http=ThreadingHTTPServer(('127.0.0.1',0),server.H);threading.Thread(target=http.serve_forever,daemon=True).start();self.addCleanup(http.server_close);self.addCleanup(http.shutdown)
        base='http://127.0.0.1:'+str(http.server_port)
        with urlopen(base+'/api/ebay-live/status')as response:status=json.load(response)
        self.assertTrue(status['configured']);self.assertNotIn('production-secret',json.dumps(status))
        for headers,payload,code in [({}, {'pin':'long-private-pin'},403),({'X-RetroHQ-Action':'seller-oauth','Sec-Fetch-Site':'cross-site'},{'pin':'long-private-pin'},403),({'X-RetroHQ-Action':'seller-oauth'},{'pin':'wrong'},403),({'X-RetroHQ-Action':'seller-oauth'},[],403)]:
            with patch.object(live,'snapshot')as read:
                with self.assertRaises(HTTPError)as exc:urlopen(Request(base+'/api/ebay-live/snapshot',data=json.dumps(payload).encode(),headers=headers))
                self.assertEqual(exc.exception.code,code);read.assert_not_called()
        with patch.object(live,'snapshot',return_value={'ok':True,'environment':'production','listings':[],'orders':[]}),patch.object(sandbox,'list_orders')as other:
            with urlopen(Request(base+'/api/ebay-live/snapshot',data=b'{"pin":"long-private-pin"}',headers={'X-RetroHQ-Action':'seller-oauth'}))as response:self.assertEqual(json.load(response)['environment'],'production')
            other.assert_not_called()
        with patch.object(live,'complete_authorisation',return_value={'ok':False})as callback,patch.object(sandbox,'complete_authorisation')as other:
            with urlopen(base+'/ebay/live/callback?state=bad&code=PRIVATE_CODE')as response:self.assertIn('ebayLive=error',response.url)
            callback.assert_called_once();other.assert_not_called()

    def test_catalogue_chooser_exposes_candidates_without_promoting_a_platform(self):
        data={'results':[{'hits':[{'boxId':'PS5','boxName':'Silent Hill 2','categoryName':'Playstation5 Software'},
                                     {'boxId':'PS2','boxName':'Silent Hill 2','categoryName':'Playstation2 Software'},
                                     {'boxId':'PAD','boxName':'PS4 controller, B','categoryName':'Playstation4 Controllers'}]}]}
        with patch.object(server,'urlopen',return_value=io.BytesIO(json.dumps(data).encode())):
            result=server.opportunity_cex('Silent Hill 2')
        self.assertEqual(len(result['candidates']),3)
        self.assertIn('Playstation5',result['candidates'][0]['category'])
        self.assertNotIn('cash',result['candidates'][0])
        self.assertNotIn('verified',result)

    def test_opportunities_require_real_cash_not_rate_estimates_and_keep_unknown_postage(self):
        self.assertIsNone(server.browse_shipping({}));self.assertEqual(server.browse_shipping({'shippingOptions':[{'shippingCost':{'value':'0','currency':'GBP'}}]}),0)
        with patch.object(server,'cex_detail',return_value={'boxId':'X','boxName':'Exact game','sellPrice':50,'buyPerc':50}):self.assertFalse(server.opportunity_cex('Game','X')['verified'])
        with patch.object(server,'cex_detail',return_value={'boxId':'X','boxName':'Exact game','sellPrice':50,'cashPriceCalculated':20}):
            quote=server.opportunity_cex('Game','X');self.assertTrue(quote['verified']);self.assertEqual(quote['cash'],20)

if __name__=='__main__':unittest.main()

