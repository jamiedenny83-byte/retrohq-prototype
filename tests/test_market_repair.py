"""Offline tests for independent CeX valuation and provider truthfulness."""
import json
import os
from http.server import ThreadingHTTPServer
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import urlopen
from pathlib import Path

import server


class FakeResponse:
    def __init__(self, data):
        self.data = json.dumps(data).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def read(self):
        return self.data


class MarketRepairTests(unittest.TestCase):
    def setUp(self):
        env = patch.dict(os.environ, {"PRICECHARTING_API_TOKEN": "", "EBAY_ENV": "sandbox"})
        env.start()
        self.addCleanup(env.stop)
        server._cex_health.update(checked=False, ok=False, status="Not tested")

    def _cex_hit(self, title, product_id="PS3SLIM320UN"):
        return {"boxName": title, "boxId": product_id,
                "categoryName": "PlayStation 3 Consoles",
                "sellPrice": 110, "cashPrice": 40, "exchangePrice": 60}

    def test_cex_live_search_returns_actual_gbp_prices(self):
        q = "PS3 Slim 320GB"
        intent = server.infer_intent(q)
        identity = server.cex_fallback_identity(q, intent)
        self.assertEqual(identity["attributes"]["storage"], "320gb")
        hits = [self._cex_hit("PlayStation 3 Slim 320GB Console Unboxed")]
        with patch.object(server, "urlopen", return_value=FakeResponse({"results": [{"hits": hits}]})):
            result = server.cex_search(q, intent, grade="Unboxed", identity=identity)
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["retail"], 110)
        self.assertEqual(result["cash"], 40)
        self.assertEqual(result["voucher"], 60)
        self.assertGreaterEqual(result["score"], 40)
        self.assertEqual(server._cex_health["status"], "Responding")

    def test_close_hardware_variants_require_selection(self):
        q = "PS3 Slim 320GB"
        intent = server.infer_intent(q)
        hits = [self._cex_hit("PlayStation 3 Slim 320GB Console Unboxed"),
                self._cex_hit("PlayStation 3 Slim 320GB Console Unboxed Black", "PS3SLIM320BLACK")]
        with patch.object(server, "urlopen", return_value=FakeResponse({"results": [{"hits": hits}]})):
            result = server.cex_search(q, intent, grade="Unboxed",
                                       identity=server.cex_fallback_identity(q, intent))
        self.assertFalse(result["ok"])
        self.assertEqual(result["status"], "CeX variant needed")
        self.assertEqual(len(result["variants"]), 2)

    def test_cex_http_failure_is_not_reported_as_live(self):
        error = HTTPError("https://search.webuy.io", 403, "Forbidden", {}, None)
        with patch.object(server, "urlopen", side_effect=error):
            result = server.cex_search("PS3 Slim 320GB", server.infer_intent("PS3 Slim 320GB"))
        self.assertFalse(result["ok"])
        self.assertEqual(result["status"], "CeX unavailable")
        self.assertFalse(server._cex_health["ok"])
        self.assertEqual(server._cex_health["status"], "Unavailable (HTTP 403)")

    def _request(self, q, cex_result, extra=""):
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.H)
        worker = threading.Thread(target=httpd.serve_forever, daemon=True)
        worker.start()
        self.addCleanup(httpd.server_close)
        self.addCleanup(httpd.shutdown)
        base = "http://127.0.0.1:{}".format(httpd.server_port)
        ebay = {"ok": True, "count": 0, "total": 0, "items": [],
                "medianAsking": None, "lowAsking": None, "highAsking": None}
        with patch.object(server, "ebay_browse_search", return_value=ebay), \
             patch.object(server, "cex_search", return_value=cex_result):
            from urllib.parse import urlencode
            with urlopen(base + "/api/market-search?" + urlencode({"q": q, "cexGrade": "Unboxed"}) + extra,
                         timeout=4) as response:
                return json.loads(response.read())

    def test_verified_cex_hardware_values_without_pricecharting(self):
        result = self._request("PS3 Slim 320GB", {
            "ok": True, "score": 62, "product": "PlayStation 3 Slim 320GB Console Unboxed",
            "productId": "PS3SLIM320UN", "retail": 110, "cash": 40, "voucher": 60,
            "grade": "Unboxed", "selectedByUser": False,
        })
        self.assertEqual(result["marketValue"], 110)
        self.assertEqual(result["confidence"], "uk-retail-benchmark")
        self.assertEqual(result["lockedIdentity"]["source"], "cex-strong")
        self.assertEqual([x for x in result["evidence"] if x["provider"] == "eBay UK"][0]["status"], "Sandbox only")
        self.assertEqual([x for x in result["evidence"] if x["provider"] == "PriceCharting"][0]["status"], "PriceCharting token missing")

    def test_game_cex_price_needs_exact_confirmation(self):
        base = {"ok": True, "score": 40, "product": "Silent Hill 2 PS2",
                "productId": "SH2PS2", "retail": 70, "cash": 30, "voucher": 42,
                "grade": None, "selectedByUser": False}
        first = self._request("Silent Hill 2 PS2", base)
        self.assertIsNone(first["marketValue"])
        self.assertEqual(first["confidence"], "unavailable")
        confirmed = self._request("Silent Hill 2 PS2", dict(base, selectedByUser=True), "&cexId=SH2PS2")
        self.assertEqual(confirmed["marketValue"], 70)
        self.assertEqual(confirmed["lockedIdentity"]["source"], "cex-confirmed")

    def test_no_provider_does_not_invent_zero_value(self):
        result = self._request("Unknown collectible", {"ok": False, "status": "CeX unavailable", "detail": "HTTP 403"})
        self.assertIsNone(result["marketValue"])
        self.assertEqual(result["confidence"], "unavailable")

    def test_production_ebay_browse_keys_are_separate_from_sandbox_seller(self):
        with patch.dict(os.environ, {
            "EBAY_CLIENT_ID": "seller-sandbox-id",
            "EBAY_CLIENT_SECRET": "seller-sandbox-secret",
            "EBAY_MARKET_CLIENT_ID": "market-production-id",
            "EBAY_MARKET_CLIENT_SECRET": "market-production-secret",
            "EBAY_ENV": "sandbox",
        }):
            server._ebay_token_cache.update(token=None, expires=0, client=None, environment=None)
            with patch.object(server, "urlopen", return_value=FakeResponse({
                "access_token": "production-browse-token", "expires_in": 7200,
            })) as mocked:
                auth = server.ebay_access_token()
            self.assertTrue(auth["ok"])
            self.assertEqual(auth["environment"], "production")
            self.assertEqual(auth["base"], "https://api.ebay.com")
            self.assertEqual(mocked.call_args.args[0].full_url,
                             "https://api.ebay.com/identity/v1/oauth2/token")
            self.assertNotIn("seller-sandbox-id", str(mocked.call_args))
            self.assertNotIn("seller-sandbox-secret", str(mocked.call_args))

    def test_quick_capture_has_live_lookup_and_null_benchmark_guard(self):
        js = (Path(__file__).resolve().parent.parent / "app.js").read_text()
        self.assertIn("window.findCandidates=async()=>", js)
        self.assertIn("if(s.benchmark==null||!Number.isFinite(benchmark))", js)
        self.assertIn("window.quickCaptureSelectCeX=", js)


if __name__ == "__main__":
    unittest.main()
