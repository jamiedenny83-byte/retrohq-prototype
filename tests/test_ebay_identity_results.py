import unittest
from unittest.mock import Mock, patch
import json
import market_overview as M
import server

class IdentityResultsTests(unittest.TestCase):
    def test_raw_browse_and_detail_links_remain_usable_through_the_full_search_path(self):
        class Reply:
            def __init__(self,data):self.data=data
            def __enter__(self):return self
            def __exit__(self,*_):pass
            def read(self,*_):return json.dumps(self.data).encode()
        item={'itemId':'v1|123456789|456','title':'Homer robot','itemWebUrl':'https://www.ebay.com/itm/Homer/123456789?hash=item:g:abc','price':{'currency':'GBP','value':'50'}}
        auth=Mock(return_value={'ok':True,'environment':'production','base':'https://api.ebay.com','token':'private-token'})
        with patch.object(server,'ebay_access_token',auth),patch.object(server,'urlopen',return_value=Reply({'total':1,'itemSummaries':[item]})):
            result=M.identity_search('Homersapien',server.ebay_browse_search)
        self.assertEqual(result['candidates'][0]['url'],'https://www.ebay.co.uk/itm/123456789?var=456')
        self.assertEqual(result['returned'],1)
        with patch.object(M,'urlopen',return_value=Reply(item)):
            detail=M.identity_detail(item['itemId'],auth)
        self.assertEqual(detail['url'],result['candidates'][0]['url'])
        self.assertNotIn('private-token',str(result)+str(detail))

    def test_real_listing_links_are_normalised_without_tracking_or_losing_variation(self):
        cases=[('https://www.ebay.co.uk/itm/123456789?hash=item123:g:AbC&itmmeta=abc','v1|123456789|0','https://www.ebay.co.uk/itm/123456789'),
               ('https://www.ebay.com/itm/WowWee-Homer-Robot/123456789?hash=item1:g:ABC','v1|123456789|456','https://www.ebay.co.uk/itm/123456789?var=456'),
               ('https://m.ebay.co.uk/itm/123456789/?var=456','v1|123456789|456','https://www.ebay.co.uk/itm/123456789?var=456')]
        for url,id,expected in cases:self.assertEqual(M.safe_listing_url(url,id),expected)

    def test_foreign_hosts_credentials_ports_and_mismatched_item_ids_are_still_rejected(self):
        for url in ['https://evil.test/itm/123456789','https://www.ebay.co.uk.evil.test/itm/123456789',
                    'https://user:pass@www.ebay.co.uk/itm/123456789','https://www.ebay.co.uk:8443/itm/123456789',
                    'javascript:alert(1)','http://www.ebay.co.uk/itm/123456789','https://www.ebay.co.uk/itm/999999999']:
            self.assertIsNone(M.safe_listing_url(url,'v1|123456789|0'))

    def test_listing_results_are_not_lost_and_filtered_counts_are_visible(self):
        sample={'ok':True,'environment':'production','total':3,'items':[
            {'itemId':'v1|123456789|0','title':'Homer robot','itemWebUrl':'https://www.ebay.com/itm/123456789?hash=item:g:abc','price':50,'currency':'GBP'},
            {'itemId':'v1|987654321|0','title':'Other Homer','itemWebUrl':'https://www.ebay.co.uk/itm/987654321?hash=item:g:def','price':60,'currency':'GBP'},
            {'itemId':'v1|111111111|0','title':'Unsafe','itemWebUrl':'https://evil.test/itm/111111111'}]}
        browse=Mock(return_value=sample);d=M.identity_search('Homersapien Homer',browse)
        self.assertEqual(len(d['candidates']),2);self.assertEqual(d['returned'],3);self.assertEqual(d['filtered']['links'],1)
        self.assertEqual(d['candidates'][0]['url'],'https://www.ebay.co.uk/itm/123456789');browse.assert_called_once()

    def test_bounded_broader_retry_only_follows_a_genuinely_empty_search(self):
        empty={'ok':True,'environment':'production','total':0,'items':[]};hit={'ok':True,'environment':'production','total':1,'items':[{'itemId':'v1|123456789|0','title':'Homer robot','itemWebUrl':'https://www.ebay.co.uk/itm/123456789'}]}
        browse=Mock(side_effect=[empty,hit]);d=M.identity_search('Homersapien Homer Simpson Remote Control Robot',browse)
        self.assertTrue(d['broadened']);self.assertEqual(d['searchedQuery'],'Homersapien Homer');self.assertEqual(len(d['attempts']),2);self.assertEqual(len(d['candidates']),1)
        browse=Mock(return_value={'ok':False,'status':'Authentication failed'});d=M.identity_search('Long toy query',browse);self.assertFalse(d['ok']);browse.assert_called_once()

    def test_genuine_zero_results_and_results_filtered_for_bad_fields_are_different(self):
        browse=Mock(return_value={'ok':True,'environment':'production','total':0,'items':[]});d=M.identity_search('Homersapien',browse)
        self.assertEqual(d['returned'],0);self.assertEqual(d['filtered'],{'ids':0,'links':0});self.assertFalse(d['broadened'])
        browse=Mock(return_value={'ok':True,'environment':'production','items':[{'itemId':'bad','itemWebUrl':'https://www.ebay.co.uk/itm/123456789'}]});d=M.identity_search('Homersapien Homer robot',browse)
        self.assertEqual(d['returned'],1);self.assertEqual(d['filtered']['ids'],1);browse.assert_called_once()
