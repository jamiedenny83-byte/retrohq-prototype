import json
import os
import threading
import unittest
from http.server import ThreadingHTTPServer
from unittest.mock import patch
from urllib.parse import parse_qs,urlparse
from urllib.error import URLError
from urllib.error import HTTPError
from urllib.request import Request,urlopen
import ebay_live as live
import server
from ebay_seller import normalize_orders
from test_production import order

class SalesHistoryTests(unittest.TestCase):
    def test_sales_endpoint_requires_pin_and_same_origin_action(self):
        http=ThreadingHTTPServer(('127.0.0.1',0),server.H);thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
        try:
            url='http://127.0.0.1:'+str(http.server_port)+'/api/ebay-live/orders'
            with patch.dict(os.environ,{'RETROHQ_ADMIN_PIN':'long-test-pin'}),patch.object(live,'sales_history',return_value={'ok':True,'orders':[]})as read:
                for headers,pin in [({},'long-test-pin'),({'X-RetroHQ-Action':'seller-oauth','Sec-Fetch-Site':'cross-site'},'long-test-pin'),({'X-RetroHQ-Action':'seller-oauth'},'wrong')]:
                    with self.assertRaises(HTTPError)as error:urlopen(Request(url,data=json.dumps({'pin':pin,'days':90}).encode(),headers=headers))
                    self.assertEqual(error.exception.code,403)
                read.assert_not_called()
                with urlopen(Request(url,data=json.dumps({'pin':'long-test-pin','days':365}).encode(),headers={'X-RetroHQ-Action':'seller-oauth'}))as response:self.assertTrue(json.load(response)['ok'])
                read.assert_called_once_with(365)
        finally:http.shutdown();http.server_close();thread.join()
    def test_actual_cancel_state_and_privacy_whitelist(self):
        o=order();o['cancelStatus']['cancelState']='NONE_REQUESTED'
        result=normalize_orders([o]);self.assertTrue(result[0]['eligible']);self.assertEqual(result[0]['cancelState'],'NONE_REQUESTED');self.assertNotIn('PRIVATE',json.dumps(result))
        for state in ['CANCEL_REQUESTED','CANCELED','UNKNOWN']:
            o['cancelStatus']['cancelState']=state;self.assertFalse(normalize_orders([o])[0]['eligible'])
    def test_history_reads_only_fulfillment_with_creation_date_and_pagination(self):
        requests=[]
        def read(req):
            requests.append(req);o=order();o['orderId']='O'+str(len(requests));o['cancelStatus']['cancelState']='NONE_REQUESTED'
            return json.dumps({'orders':[o],'total':2}).encode()
        with patch.object(live,'_user_token',return_value={'ok':True,'token':'PRIVATE_TOKEN'}),patch.object(live,'_read_bytes',side_effect=read):
            result=live.sales_history(365)
        self.assertTrue(result['ok']);self.assertEqual(len(result['orders']),2);self.assertFalse(result['orderTruncated']);self.assertNotIn('PRIVATE',json.dumps(result))
        for req in requests:
            self.assertEqual(urlparse(req.full_url).path,'/sell/fulfillment/v1/order');self.assertTrue(parse_qs(urlparse(req.full_url).query)['filter'][0].startswith('creationdate:['));self.assertEqual(req.get_method(),'GET')
    def test_bad_ranges_and_failed_read_do_not_return_partial_orders(self):
        with patch.object(live,'_user_token')as token:
            for days in [True,None,'90',0,731]:self.assertFalse(live.sales_history(days)['ok'])
            token.assert_not_called()
        with patch.object(live,'_user_token',return_value={'ok':True,'token':'PRIVATE'}),patch.object(live,'_read_bytes',side_effect=[json.dumps({'orders':[order()],'next':'yes'}).encode(),URLError('offline')]):
            result=live.sales_history();self.assertFalse(result['ok']);self.assertNotIn('orders',result)
