import unittest
from unittest.mock import Mock
import market_insights as m


class MarketInsightsTests(unittest.TestCase):
    def setUp(self):
        m._cache.clear()
        self.pc = Mock(return_value={'ok': True, 'id': '123', 'product': 'Game', 'console': 'PAL PS2', 'prices': {'cib-price': 20}, 'salesVolume': 40})
        self.search = Mock(return_value={'status': 'success', 'products': [{'id': '123', 'product-name': 'Game', 'console-name': 'PAL PS2'}]})
        self.browse = Mock(return_value={'ok': True, 'environment': 'production', 'items': [{'price': 30, 'currency': 'GBP', 'buyingOptions': ['FIXED_PRICE']}] * 5})

    def get(self, q='Game PS2', pid='123', grade='cib', allowed=lambda *_: True):
        return m.observation(q, pid, grade, self.search, self.pc, self.browse, lambda _: {}, allowed, 'https://example.invalid/products')

    def test_separate_reference_currency_and_fixed_ask_sample_with_original_cached_time(self):
        a = self.get(); b = self.get()
        self.assertTrue(a['pricecharting']['ok']); self.assertEqual(a['pricecharting']['currency'], 'USD')
        self.assertEqual(a['ebay']['value'], 30); self.assertEqual(a['ebay']['currency'], 'GBP')
        self.assertEqual(a['checkedAt'], b['checkedAt']); self.assertTrue(b['cached']); self.pc.assert_called_once()

    def test_sandbox_auctions_missing_prices_and_small_samples_do_not_produce_live_values(self):
        self.browse.return_value['environment'] = 'sandbox'
        self.assertFalse(self.get()['ebay']['ok']); m._cache.clear()
        self.browse.return_value.update(environment='production', items=[{'price': 1, 'currency': 'GBP', 'buyingOptions': ['AUCTION']}]*20)
        self.assertFalse(self.get()['ebay']['ok'])

    def test_candidates_need_explicit_edition_and_wrong_identity_cannot_supply_price(self):
        a = self.get(pid=''); self.assertFalse(a['pricecharting']['ok']); self.assertEqual(len(a['candidates']), 1)
        self.pc.assert_not_called()
        self.assertFalse(self.get(allowed=lambda *_: False)['pricecharting']['ok'])

    def test_invalid_input_cannot_issue_provider_calls_or_leak_failure_details(self):
        for q, pid, grade in [('', '123', 'cib'), ('Game', 'http://bad', 'cib'), ('Game', '123', 'bad')]:
            self.assertFalse(self.get(q, pid, grade)['ok'])
        self.pc.assert_not_called(); self.browse.assert_not_called()
        self.pc.side_effect = RuntimeError('private-token')
        self.assertNotIn('private-token', str(self.get()))

    def test_yearly_volume_strings_are_normalised_without_making_missing_volume_zero(self):
        self.pc.return_value['salesVolume'] = '123'
        self.assertEqual(self.get()['pricecharting']['annualVolume'], 123)
        m._cache.clear(); self.pc.return_value['salesVolume'] = None
        self.assertIsNone(self.get()['pricecharting']['annualVolume'])

    def test_route_uses_existing_read_connectors_without_seller_oauth_changes(self):
        import json
        import threading
        from http.server import ThreadingHTTPServer
        from urllib.request import urlopen
        from unittest.mock import patch
        import server
        http = ThreadingHTTPServer(('127.0.0.1', 0), server.H)
        worker = threading.Thread(target=http.serve_forever, daemon=True); worker.start()
        try:
            with patch.object(server.market_insights, 'observation', return_value={'ok': True, 'query': 'Game PS2'}) as call:
                with urlopen('http://127.0.0.1:'+str(http.server_port)+'/api/market-observation?q=Game%20PS2&id=123&grade=cib') as response:
                    self.assertTrue(json.load(response)['ok'])
                self.assertEqual(call.call_args.args[:3], ('Game PS2', '123', 'cib'))
        finally:
            http.shutdown(); worker.join(); http.server_close()
