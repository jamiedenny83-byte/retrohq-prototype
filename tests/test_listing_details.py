import unittest
from unittest.mock import patch
import ebay_listing_details as d

def xml(item_id='123'):
    return ('<GetItemResponse xmlns="urn:ebay:apis:eBLBaseComponents"><Ack>Success</Ack><Item><ItemID>'+item_id+'</ItemID><Seller><Email>PRIVATE_SELLER</Email></Seller><Description>&lt;p&gt;Complete &amp;amp; tested&lt;/p&gt;&lt;script&gt;bad()&lt;/script&gt;</Description><ConditionID>5000</ConditionID><ConditionDisplayName>Very Good</ConditionDisplayName><PrimaryCategory><CategoryID>139973</CategoryID><CategoryName>Video Games</CategoryName></PrimaryCategory><PictureDetails><PictureURL>https://i.ebayimg.com/images/g/photo/s-l1600.jpg</PictureURL></PictureDetails><ItemSpecifics><NameValueList><Name>Brand</Name><Value>Nintendo</Value></NameValueList><NameValueList><Name>Platform</Name><Value>Game Boy Advance</Value></NameValueList></ItemSpecifics><Variations><Variation><SKU>RED</SKU><VariationSpecifics><NameValueList><Name>Colour</Name><Value>Red</Value></NameValueList></VariationSpecifics><VariationProductListingDetails><EAN>1234567890123</EAN></VariationProductListingDetails></Variation></Variations></Item></GetItemResponse>').encode()

class ListingDetailsTests(unittest.TestCase):
    def setUp(self):d._cache.clear();d._attempted.clear()
    def test_details_keep_description_condition_specifics_photos_and_exact_variation_without_private_data(self):
        rows=[{'listingId':'123','sku':'RED'},{'listingId':'123','sku':'BLUE'}];calls=[]
        def read(item_id):calls.append(item_id);return xml(item_id)
        self.assertEqual(d.enrich(rows,read,now=1),0);self.assertEqual(calls,['123'])
        red=rows[0]['details'];self.assertEqual(red['description'],'Complete & tested');self.assertEqual(red['brand'],'Nintendo');self.assertEqual(red['conditionName'],'Very Good');self.assertEqual(red['ean'],'1234567890123');self.assertEqual(red['variationSpecifics'][0]['values'],['Red']);self.assertNotIn('variationSpecifics',rows[1]['details']);self.assertNotIn('PRIVATE',str(rows));self.assertEqual(len(red['images']),1)
    def test_batch_limit_and_cache_resume_without_repeating_loaded_listings(self):
        rows=[{'listingId':str(i),'sku':''} for i in range(1,26)];calls=[]
        def read(item_id):calls.append(item_id);return xml(item_id)
        self.assertEqual(d.enrich(rows,read,now=1),5);self.assertEqual(len(calls),20);self.assertEqual(d.enrich(rows,read,now=2),0);self.assertEqual(len(calls),25);self.assertEqual(d.enrich(rows,read,now=3),0);self.assertEqual(len(calls),25)
    def test_bad_identity_and_network_failure_do_not_remove_listing_and_retry_other_rows_first(self):
        rows=[{'listingId':str(i),'sku':''} for i in range(1,26)]
        self.assertEqual(d.enrich(rows,lambda _:xml('wrong'),now=1),25)
        untried={x['listingId'] for x in rows}-set(d._attempted)
        calls=[]
        def read(item_id):calls.append(item_id);return xml(item_id)
        d.enrich(rows,read,now=2);self.assertEqual(set(calls[:5]),untried);self.assertEqual(len(rows),25)
    def test_description_has_no_active_html_and_is_bounded(self):
        self.assertEqual(d.plain('<style>secret</style><p>A <b>game</b></p>'),'A game');self.assertEqual(len(d.plain('x'*5000)),4000)
    def test_slow_metadata_batch_stops_before_trying_every_listing(self):
        rows=[{'listingId':str(i),'sku':''}for i in range(1,26)];calls=[]
        def read(item_id):calls.append(item_id);return xml(item_id)
        with patch.object(d.time,'monotonic',side_effect=[0,1,11]):pending=d.enrich(rows,read,now=1)
        self.assertEqual(len(calls),1);self.assertEqual(pending,24);self.assertEqual(len(rows),25)
