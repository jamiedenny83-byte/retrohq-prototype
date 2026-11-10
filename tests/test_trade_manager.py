import os
import unittest
from unittest.mock import patch

import trade_manager as manager


class TradeManagerTests(unittest.TestCase):
    def setUp(self):
        manager._sessions.clear()
        manager._failures.clear()

    def test_session_requires_password_and_expires_or_can_be_revoked(self):
        password = "test-manager-password"
        with patch.dict(os.environ, {"RETROHQ_MANAGER_PASSWORD": password}), patch.object(manager.time, "monotonic", return_value=100) as clock:
            self.assertEqual(manager.request({"action": "authorise", "token": "invented"})[1], 403)
            self.assertEqual(manager.request({"action": "login", "password": "wrong"})[1], 403)
            result, status = manager.request({"action": "login", "password": password})
            self.assertEqual(status, 200)
            self.assertNotIn(password, str(result))
            token = result["token"]
            self.assertEqual(manager.request({"action": "authorise", "token": token})[1], 200)
            clock.return_value += manager.SESSION_SECONDS
            self.assertEqual(manager.request({"action": "authorise", "token": token})[1], 403)
            token = manager.request({"action": "login", "password": password})[0]["token"]
            self.assertEqual(manager.request({"action": "logout", "token": token})[1], 200)
            self.assertEqual(manager.request({"action": "authorise", "token": token})[1], 403)

    def test_missing_secret_and_repeated_failed_attempts(self):
        with patch.dict(os.environ, {"RETROHQ_MANAGER_PASSWORD": ""}):
            self.assertEqual(manager.request({"action": "login", "password": "2468"})[1], 503)
        with patch.dict(os.environ, {"RETROHQ_MANAGER_PASSWORD": "test-manager-password"}):
            for _ in range(5):
                self.assertEqual(manager.request({"action": "login", "password": "wrong"})[1], 403)
            self.assertEqual(manager.request({"action": "login", "password": "wrong"})[1], 429)
