import copy
import io
import json
import os
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

import ebay_seller as seller


def order(**changes):
    value = {'orderId':'order-1', 'orderPaymentStatus':'PAID',
             'cancelStatus':{'cancelState':'NONE'}, 'orderFulfillmentStatus':'NOT_STARTED',
             'creationDate':'2026-10-11T12:00:00Z',
             'buyer':{'username':'private-buyer'},
             'lineItems':[{'lineItemId':'line-1', 'sku':'SKU1', 'legacyItemId':'1234',
                           'title':'Silent Hill 2', 'quantity':1,
                           'lineItemCost':{'value':'85.00','currency':'GBP'}}]}
    value.update(changes)
    return value


class SalesImportTests(unittest.TestCase):
    def test_paid_prices_ids_and_order_evidence_without_buyer_data(self):
        result = seller.normalize_orders([order(totalMarketplaceFee={'value':'4.99','currency':'GBP'},
                   pricingSummary={'deliveryCost':{'value':'3.50','currency':'GBP'}})])[0]
        self.assertTrue(result['eligible'])
        self.assertEqual(result['price'],85)
        self.assertEqual(result['listingId'],'1234')
        self.assertEqual(result['orderFee'],4.99)
        self.assertEqual(result['orderShipping'],3.5)
        self.assertNotIn('private-buyer',json.dumps(result))

    def test_pending_cancelled_refunded_or_unknown_cancel_are_not_eligible(self):
        for changes in [{'orderPaymentStatus':'PENDING'}, {'cancelStatus':{'cancelState':'CANCELED'}},
                        {'cancelStatus':{}}, {'paymentSummary':{'refunds':[{'refundId':'1'}]}}]:
            self.assertFalse(seller.normalize_orders([order(**changes)])[0]['eligible'])

    def test_invalid_quantity_currency_amount_and_discount_fail_closed(self):
        for field,value in [('quantity',1.5),('quantity',True),('quantity',0),('quantity',None),
                            ('lineItemCost',{'value':'NaN','currency':'GBP'}),
                            ('lineItemCost',{'value':'20','currency':'USD'}),
                            ('discountedLineItemCost',{'value':'oops','currency':'GBP'})]:
            raw=order(); raw['lineItems'][0][field]=value
            self.assertFalse(seller.normalize_orders([raw])[0]['eligible'])

    def test_line_refund_and_discounted_total_are_preserved(self):
        raw=order(); raw['lineItems'][0].update(quantity=2,discountedLineItemCost={'value':'80','currency':'GBP'})
        self.assertEqual(seller.normalize_orders([raw])[0]['price'],80)
        raw['lineItems'][0]['refunds']=[{'refundId':'refund'}]
        self.assertFalse(seller.normalize_orders([raw])[0]['eligible'])

    @patch.object(seller,'_user_token',return_value={'ok':True,'token':'test-only'})
    def test_pagination_is_get_only_and_ignores_untrusted_next_url(self, token):
        pages=[{'orders':[order()],'total':2,'next':'https://untrusted.invalid/steal'},
               {'orders':[order(orderId='order-2')],'total':2}]
        with patch.object(seller,'urlopen',side_effect=[io.BytesIO(json.dumps(p).encode()) for p in pages]) as fetch:
            result=seller.list_orders(limit=1)
        self.assertTrue(result['ok']); self.assertEqual(len(result['orders']),2)
        self.assertFalse(result['truncated'])
        for call in fetch.call_args_list:
            request=call.args[0]
            self.assertTrue(request.full_url.startswith('https://api.sandbox.ebay.com/sell/fulfillment/v1/order?'))
            self.assertEqual(request.get_method(),'GET')
        self.assertIn('offset=1',fetch.call_args_list[1].args[0].full_url)
        self.assertNotIn('test-only',json.dumps(result))

    @patch.object(seller,'_user_token',return_value={'ok':True,'token':'test-only'})
    def test_later_page_failure_does_not_offer_partial_sales(self, token):
        page={'orders':[order()],'total':2,'next':'next'}
        with patch.object(seller,'urlopen',side_effect=[io.BytesIO(json.dumps(page).encode()),OSError('offline')]):
            result=seller.list_orders(limit=1)
        self.assertFalse(result['ok']); self.assertNotIn('orders',result)

    def test_production_never_fetches_seller_orders(self):
        with patch.dict(os.environ,{'EBAY_ENV':'production'}), patch.object(seller,'urlopen') as fetch:
            self.assertFalse(seller.list_orders()['ok'])
        fetch.assert_not_called()

    def test_malformed_and_conflicting_duplicate_lines_fail_closed(self):
        for raw in [order(cancelStatus=[]), order(lineItems={"bad":1}), order(orderId=None)]:
            with self.assertRaises(ValueError): seller.normalize_orders([raw])
        self.assertEqual(len(seller.normalize_orders([order(),order()])),1)
        changed=order();changed['lineItems'][0]['quantity']=2
        with self.assertRaises(ValueError): seller.normalize_orders([order(),changed])

    @patch.object(seller,'_user_token',return_value={'ok':True,'token':'test-only'})
    def test_pagination_cap_is_disclosed(self, token):
        pages=[io.BytesIO(json.dumps({'orders':[order(orderId=str(n))], 'total':11, 'next':'next'}).encode()) for n in range(10)]
        with patch.object(seller,'urlopen',side_effect=pages): result=seller.list_orders(limit=1)
        self.assertTrue(result['ok']);self.assertTrue(result['truncated']);self.assertEqual(result['sampledOrders'],10)

    def test_order_http_endpoint_requires_pin_and_same_origin_header(self):
        # Exercise the real handler without network access or OAuth credentials.
        from server import H
        handler=object.__new__(H); handler.path='/api/ebay-seller/orders'
        handler.headers={'X-RetroHQ-Action':'seller-oauth','Sec-Fetch-Site':'cross-site'}
        with patch.object(handler,'send_json') as send, patch.object(seller,'list_orders') as fetch:
            handler.do_POST(); self.assertEqual(send.call_args.args[1],403); fetch.assert_not_called()
        handler.headers={'X-RetroHQ-Action':'seller-oauth','Content-Length':'15'}
        handler.rfile=io.BytesIO(b'{"pin":"wrong"}')
        with patch.dict(os.environ,{'RETROHQ_ADMIN_PIN':'test-private-pin'}), patch.object(handler,'send_json') as send, patch.object(seller,'list_orders') as fetch:
            handler.do_POST(); self.assertEqual(send.call_args.args[1],403); fetch.assert_not_called()


if __name__=='__main__': unittest.main()
