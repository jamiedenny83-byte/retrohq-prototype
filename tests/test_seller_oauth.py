"""Offline regression tests for the RetroHQ Sandbox Seller OAuth bridge."""
import json
import os
from pathlib import Path
import stat
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen
from http.server import ThreadingHTTPServer

import ebay_seller
from server import H, ROOT


class SellerOAuthTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.store = Path(self.temp.name) / "retrohq" / "seller.json"
        p = patch.object(ebay_seller, "_store_path", return_value=self.store)
        p.start()
        self.addCleanup(p.stop)
        env = patch.dict(os.environ, {
            "EBAY_ENV": "sandbox",
            "EBAY_CLIENT_ID": "test-client",
            "EBAY_CLIENT_SECRET": "test-secret",
            "EBAY_RUNAME": "test-sandbox-runame",
            "RETROHQ_ADMIN_PIN": "long-private-pin",
        }, clear=True)
        env.start()
        self.addCleanup(env.stop)
        ebay_seller._pending.clear()
        ebay_seller._access.update(token=None, expires=0)

    def test_authorisation_uses_sandbox_runame_scopes_and_random_state(self):
        result = ebay_seller.start_authorisation()
        self.assertTrue(result["ok"])
        parsed = urlparse(result["authorizeUrl"])
        self.assertEqual(parsed.netloc, "auth.sandbox.ebay.com")
        query = parse_qs(parsed.query)
        self.assertEqual(query["redirect_uri"], ["test-sandbox-runame"])
        self.assertEqual(set(query["scope"][0].split()), set(ebay_seller.SCOPES))
        self.assertGreaterEqual(len(query["state"][0]), 32)
        self.assertNotIn("test-secret", result["authorizeUrl"])

    def test_invalid_state_is_rejected_without_token_exchange(self):
        with patch.object(ebay_seller, "_token_request") as request:
            result = ebay_seller.complete_authorisation("forged-state", "some-code")
        self.assertFalse(result["ok"])
        request.assert_not_called()

    def test_code_exchange_stores_refresh_only_and_refreshes_access(self):
        start = ebay_seller.start_authorisation()
        state = parse_qs(urlparse(start["authorizeUrl"]).query)["state"][0]
        response = {"ok": True, "data": {
            "access_token": "secret-short-lived-access",
            "refresh_token": "secret-long-lived-refresh",
            "expires_in": 7200,
            "refresh_token_expires_in": 100000,
        }}
        with patch.object(ebay_seller, "_token_request", return_value=response) as request:
            completed = ebay_seller.complete_authorisation(state, "url-decoded-code")
        self.assertTrue(completed["ok"])
        self.assertEqual(request.call_args.args[0]["redirect_uri"], "test-sandbox-runame")
        self.assertTrue(self.store.is_file())
        saved = self.store.read_text()
        self.assertIn("secret-long-lived-refresh", saved)
        self.assertNotIn("secret-short-lived-access", saved)
        self.assertEqual(stat.S_IMODE(self.store.stat().st_mode), 0o600)
        self.assertTrue(ebay_seller.configuration()["connected"])

        ebay_seller._access.update(token=None, expires=0)  # simulate server restart
        with patch.object(ebay_seller, "_token_request", return_value={
            "ok": True, "data": {"access_token": "refreshed-access", "expires_in": 7200}
        }) as request:
            token = ebay_seller._user_token()
        self.assertEqual(token["token"], "refreshed-access")
        self.assertEqual(request.call_args.args[0]["grant_type"], "refresh_token")
        self.assertEqual(request.call_args.args[0]["refresh_token"], "secret-long-lived-refresh")
        self.assertFalse(ebay_seller.complete_authorisation(state, "reuse-code")["ok"])

    def test_admin_pin_required_and_production_refused(self):
        self.assertFalse(ebay_seller.admin_pin_valid("wrong"))
        self.assertTrue(ebay_seller.admin_pin_valid("long-private-pin"))
        with patch.dict(os.environ, {"EBAY_ENV": "production"}):
            self.assertFalse(ebay_seller.start_authorisation()["ok"])
            self.assertFalse(ebay_seller._user_token()["ok"])

    def test_static_handler_blocks_hidden_files_and_traversal(self):
        handler = object.__new__(H)
        for path in ("/.git/config", "/.env", "/%2eenv", "/../private", "/%2e%2e/private"):
            self.assertEqual(Path(handler.translate_path(path)).name, "__not_found__")
        self.assertEqual(Path(handler.translate_path("/")).name, "index.html")

    def test_http_endpoints_do_not_expose_tokens_and_pin_is_required(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), H)
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        base = "http://127.0.0.1:{}".format(server.server_port)
        with urlopen(base + "/api/ebay-seller/status", timeout=3) as response:
            status = json.loads(response.read())
        self.assertFalse(status["connected"])
        self.assertTrue(status["configured"])
        self.assertNotIn("test-secret", json.dumps(status))

        request = Request(
            base + "/api/ebay-seller/start",
            data=json.dumps({"pin": "wrong"}).encode(),
            headers={"Content-Type": "application/json", "X-RetroHQ-Action": "seller-oauth"},
            method="POST",
        )
        with self.assertRaises(HTTPError) as error:
            urlopen(request, timeout=3)
        self.assertEqual(error.exception.code, 403)

        with self.assertRaises(HTTPError) as error:
            urlopen(base + "/.gitignore", timeout=3)
        self.assertEqual(error.exception.code, 404)


if __name__ == "__main__":
    unittest.main()
