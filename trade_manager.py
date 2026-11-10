"""Short-lived authorisation for manager controls in the private workspace."""
import hashlib
import hmac
import os
import secrets
import threading
import time

SESSION_SECONDS = 15 * 60
_sessions = {}
_failures = []
_lock = threading.Lock()


def request(payload):
    password = os.environ.get("RETROHQ_MANAGER_PASSWORD", "")
    if len(password) < 12:
        return {"ok": False, "status": "Set RETROHQ_MANAGER_PASSWORD to at least 12 characters in Codespaces secrets and restart the Codespace."}, 503

    now = time.monotonic()
    signature = hashlib.sha256(password.encode()).digest()
    action = payload.get("action")
    with _lock:
        for token, (expiry, _) in list(_sessions.items()):
            if expiry <= now:
                del _sessions[token]
        if action == "login":
            _failures[:] = [when for when in _failures if now - when < 60]
            if len(_failures) >= 5:
                return {"ok": False, "status": "Too many attempts. Try again in a minute."}, 429
            supplied = payload.get("password")
            if not isinstance(supplied, str) or not hmac.compare_digest(password.encode(), supplied.encode("utf-8", errors="replace")):
                _failures.append(now)
                return {"ok": False, "status": "Incorrect manager password."}, 403
            _failures.clear()
            if len(_sessions) >= 32:
                del _sessions[next(iter(_sessions))]
            token = secrets.token_urlsafe(32)
            _sessions[token] = (now + SESSION_SECONDS, signature)
            return {"ok": True, "token": token, "expiresIn": SESSION_SECONDS}, 200
        if action not in ("authorise", "logout"):
            return {"ok": False, "status": "Unknown manager action."}, 400
        token = payload.get("token")
        session = _sessions.get(token) if isinstance(token, str) else None
        if not session or not hmac.compare_digest(session[1], signature):
            return {"ok": False, "status": "Manager session expired. Sign in again."}, 403
        if action == "logout":
            del _sessions[token]
        return {"ok": True}, 200
