import json,os,threading,unittest
from unittest.mock import patch
from http.server import ThreadingHTTPServer
from urllib.request import Request,urlopen
from urllib.error import HTTPError
import ebay_live as live
import server
from test_listing_details import xml

class DetailBatchTests(unittest.TestCase):
    def setUp(self):
        live._detail_rows.clear();live._detail_rows.update({('123','RED'),('456','BLUE')});live.ebay_listing_details._cache.clear();live.ebay_listing_details._attempted.clear()
    def test_detail_only_batch_is_scoped_to_snapshot_ids_and_excludes_seller_contacts(self):
        with patch.object(live,'_user_token',return_value={'ok':True,'token':'PRIVATE_TOKEN'}),patch.object(live,'_read_listing_detail',return_value=xml('123'))as read:
            result=live.listing_details([{'listingId':'123','sku':'RED'}]);self.assertTrue(result['ok']);self.assertEqual(read.call_count,1);self.assertEqual(result['details'][0]['details']['brand'],'Nintendo');self.assertNotIn('PRIVATE',json.dumps(result))
    def test_unrecognised_and_malformed_identities_make_no_provider_calls(self):
        with patch.object(live,'_user_token')as token:
            for rows in [None,[],[{'listingId':'789','sku':'RED'}],[{'listingId':'123','sku':[]}],['bad']]:self.assertFalse(live.listing_details(rows)['ok'])
            token.assert_not_called()
    def test_deadline_deferred_rows_are_returned_for_automatic_continuation(self):
        def enrich(rows,read):
            rows[0]['details']={'description':'Loaded'};live.ebay_listing_details._attempted['123']=1;return 1
        with patch.object(live,'_user_token',return_value={'ok':True,'token':'PRIVATE'}),patch.object(live.ebay_listing_details,'enrich',side_effect=enrich):
            result=live.listing_details([{'listingId':'123','sku':'RED'},{'listingId':'456','sku':'BLUE'}])
        self.assertEqual(result['retryRows'],[{'listingId':'456','sku':'BLUE'}])
    def test_http_batch_keeps_pin_and_same_origin_guards(self):
        http=ThreadingHTTPServer(('127.0.0.1',0),server.H);thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
        try:
            url='http://127.0.0.1:'+str(http.server_port)+'/api/ebay-live/listing-details'
            with patch.dict(os.environ,{'RETROHQ_ADMIN_PIN':'long-test-pin'}),patch.object(live,'listing_details',return_value={'ok':True,'details':[]})as read:
                for headers,pin in [({},'long-test-pin'),({'X-RetroHQ-Action':'seller-oauth','Sec-Fetch-Site':'cross-site'},'long-test-pin'),({'X-RetroHQ-Action':'seller-oauth'},'wrong')]:
                    with self.assertRaises(HTTPError)as error:urlopen(Request(url,data=json.dumps({'pin':pin,'rows':[{'listingId':'123','sku':'RED'}]}).encode(),headers=headers))
                    self.assertEqual(error.exception.code,403)
                read.assert_not_called()
                payload={'pin':'long-test-pin','rows':[{'listingId':'123','sku':'RED'}]*50}
                with urlopen(Request(url,data=json.dumps(payload).encode(),headers={'X-RetroHQ-Action':'seller-oauth'}))as response:self.assertTrue(json.load(response)['ok'])
                self.assertEqual(read.call_args.args[0],payload['rows'])
        finally:http.shutdown();http.server_close();thread.join()
