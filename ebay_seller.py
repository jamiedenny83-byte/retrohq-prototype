"""Sandbox-only eBay Seller OAuth for RetroHQ's internal Codespaces prototype.

Refresh credentials are stored outside the web root in a user-private file.
No token is returned to the browser. This is not a multi-user production auth system.
"""
import base64
import hmac
import json
import os
from pathlib import Path
import secrets
import tempfile
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

SCOPES = (
    "https://api.ebay.com/oauth/api_scope/sell.inventory",
    "https://api.ebay.com/oauth/api_scope/sell.account",
    "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
)
_lock = threading.RLock()
_pending = {}
_access = {"token": None, "expires": 0}
_STATE_LIFETIME = 600


def _sandbox():
    return os.environ.get("EBAY_ENV", "production").strip().lower() == "sandbox"


def _store_path():
    # Intentionally outside the repo and its static web server.
    return Path.home() / ".config" / "retrohq" / "ebay_seller_sandbox.json"


def _read_store():
    path = _store_path()
    if path.is_symlink() or not path.is_file():
        return None
    try:
        if path.stat().st_mode & 0o077:
            return None  # refuse insecurely permissioned token files
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("environment") != "sandbox" or not data.get("refresh_token"):
            return None
        return data
    except (OSError, ValueError):
        return None


def _write_store(data):
    path = _store_path()
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(path.parent, 0o700)
    temp_name = None
    try:
        with tempfile.NamedTemporaryFile("w", dir=str(path.parent), prefix=".seller-", delete=False, encoding="utf-8") as f:
            temp_name = f.name
            os.chmod(temp_name, 0o600)
            json.dump(data, f)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp_name, path)
        os.chmod(path, 0o600)
    finally:
        if temp_name and os.path.exists(temp_name):
            os.unlink(temp_name)


def configuration():
    missing = []
    for key, label in (
        ("EBAY_CLIENT_ID", "EBAY_CLIENT_ID"),
        ("EBAY_CLIENT_SECRET", "EBAY_CLIENT_SECRET"),
        ("EBAY_RUNAME", "EBAY_RUNAME"),
        ("RETROHQ_ADMIN_PIN", "RETROHQ_ADMIN_PIN"),
    ):
        if not os.environ.get(key, "").strip():
            missing.append(label)
    if not _sandbox():
        missing.append("EBAY_ENV=sandbox")
    pin = os.environ.get("RETROHQ_ADMIN_PIN", "")
    # Diagnostic reveals only whether the Codespaces secret is usable,
    # never its value or length.
    pin_status = ("Missing" if not pin else
                  "Too short — set at least 8 characters" if len(pin) < 8 else
                  "Has leading or trailing whitespace" if pin != pin.strip() else
                  "Ready")
    if pin and len(pin) < 8:
        missing.append("RETROHQ_ADMIN_PIN must be at least 8 characters")
    saved = _read_store() if _sandbox() else None
    connected = bool(saved and saved.get("refresh_expires_at", 0) > time.time())
    return {
        "environment": os.environ.get("EBAY_ENV", "production"),
        "configured": not missing,
        "missing": missing,
        "pinStatus": pin_status,
        "connected": connected,
        "status": "Connected" if connected else ("Configuration needed" if missing else "Not connected"),
    }


def admin_pin_valid(candidate):
    expected = os.environ.get("RETROHQ_ADMIN_PIN", "")
    return bool(expected and len(expected) >= 8 and isinstance(candidate, str) and
                hmac.compare_digest(candidate, expected))


def admin_pin_error():
    """Return a safe, actionable error without exposing the PIN or its length."""
    status = configuration()["pinStatus"]
    if status == "Missing":
        return "RETROHQ_ADMIN_PIN is not loaded. Restart the entire Codespace after saving the secret."
    if status.startswith("Too short"):
        return "RETROHQ_ADMIN_PIN is too short. Set at least 8 characters in Codespaces secrets, then restart the Codespace."
    if status == "Has leading or trailing whitespace":
        return "PIN did not match. The saved Codespaces secret contains surrounding spaces. Check the secret and restart the Codespace."
    return "PIN did not match the Codespaces secret. Check the exact value, then restart the Codespace if you recently changed it."


def _basic_header():
    client = os.environ["EBAY_CLIENT_ID"]
    secret = os.environ["EBAY_CLIENT_SECRET"]
    return "Basic " + base64.b64encode((client + ":" + secret).encode()).decode("ascii")


def _token_request(params):
    request = Request(
        "https://api.sandbox.ebay.com/identity/v1/oauth2/token",
        data=urlencode(params).encode("utf-8"),
        headers={
            "Authorization": _basic_header(),
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=15) as response:
            result = json.loads(response.read().decode("utf-8"))
        if not result.get("access_token"):
            return {"ok": False, "status": "eBay did not issue an access token."}
        return {"ok": True, "data": result}
    except HTTPError as exc:
        # Never return the raw response, token, or grant code to the browser.
        return {"ok": False, "status": "eBay rejected the token request (HTTP {}).".format(exc.code)}
    except (URLError, TimeoutError, OSError, ValueError):
        return {"ok": False, "status": "eBay token service unavailable."}


def start_authorisation():
    config = configuration()
    if not config["configured"]:
        return {"ok": False, "status": "Missing setup: " + ", ".join(config["missing"])}
    state = secrets.token_urlsafe(32)
    with _lock:
        now = time.time()
        for key, expiry in list(_pending.items()):
            if expiry < now:
                _pending.pop(key, None)
        _pending[state] = now + _STATE_LIFETIME
    params = {
        "client_id": os.environ["EBAY_CLIENT_ID"],
        "redirect_uri": os.environ["EBAY_RUNAME"],
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "state": state,
        "prompt": "login",
    }
    return {
        "ok": True,
        "authorizeUrl": "https://auth.sandbox.ebay.com/oauth2/authorize?" + urlencode(params),
        "expiresIn": _STATE_LIFETIME,
    }


def complete_authorisation(state, code=None, error=None):
    with _lock:
        expiry = _pending.pop(state, None)
    if not expiry or expiry < time.time():
        return {"ok": False, "status": "The connection attempt expired. Please start again."}
    if error:
        return {"ok": False, "status": "Seller declined or eBay cancelled authorisation."}
    if not code or not _sandbox():
        return {"ok": False, "status": "Missing authorisation code or incorrect environment."}
    result = _token_request({
        "grant_type": "authorization_code",
        "code": code,  # already URL-decoded by parse_qs
        "redirect_uri": os.environ["EBAY_RUNAME"],
    })
    if not result["ok"]:
        return result
    data = result["data"]
    if not data.get("refresh_token"):
        return {"ok": False, "status": "eBay did not issue a refresh token. Reconnect the seller."}
    now = time.time()
    with _lock:
        _write_store({
            "environment": "sandbox",
            "refresh_token": data["refresh_token"],
            "refresh_expires_at": now + int(data.get("refresh_token_expires_in", 0)),
            "connected_at": now,
            "scopes": list(SCOPES),
        })
        _access.update(token=data["access_token"], expires=now + int(data.get("expires_in", 7200)))
    return {"ok": True, "status": "Sandbox Seller connected."}


def _user_token():
    if not _sandbox():
        return {"ok": False, "status": "Seller integration is Sandbox-only."}
    with _lock:
        now = time.time()
        if _access["token"] and _access["expires"] > now + 90:
            return {"ok": True, "token": _access["token"]}
        saved = _read_store()
        if not saved or saved.get("refresh_expires_at", 0) <= now:
            return {"ok": False, "status": "No valid saved seller connection. Connect again."}
        result = _token_request({
            "grant_type": "refresh_token",
            "refresh_token": saved["refresh_token"],
            "scope": " ".join(SCOPES),
        })
        if not result["ok"]:
            return result
        data = result["data"]
        _access.update(token=data["access_token"], expires=now + int(data.get("expires_in", 7200)))
        if data.get("refresh_token"):
            saved["refresh_token"] = data["refresh_token"]
            saved["refresh_expires_at"] = now + int(data.get("refresh_token_expires_in", 0))
            _write_store(saved)
        return {"ok": True, "token": _access["token"]}


def _read_seller_endpoint(path, token):
    request = Request(
        "https://api.sandbox.ebay.com" + path,
        headers={
            "Authorization": "Bearer " + token,
            "Accept": "application/json",
            "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB",
        },
    )
    try:
        with urlopen(request, timeout=15) as response:
            data = json.loads(response.read().decode("utf-8"))
        return {"ok": True, "count": len(data.get("inventoryItems", data.get("orders", [])) or []),
                "total": data.get("total")}
    except HTTPError as exc:
        return {"ok": False, "status": "eBay returned HTTP {}.".format(exc.code)}
    except (URLError, TimeoutError, OSError, ValueError):
        return {"ok": False, "status": "eBay API unavailable."}


def _order_money(value):
    """Amounts in the Fulfillment response are quoted in the listing currency."""
    if not isinstance(value,dict) or value.get("currency")!="GBP": return None
    try:
        from decimal import Decimal
        amount=Decimal(str(value.get("value")))
        if not amount.is_finite() or amount<0: return None
        return float(amount.quantize(Decimal("0.01")))
    except (ValueError,TypeError,ArithmeticError):
        return None


def normalize_orders(orders):
    """Expose only order reconciliation fields. No buyer identity or addresses."""
    items=[]
    for order in orders:
        if not isinstance(order,dict): raise ValueError("Invalid order")
        oid=str(order.get("orderId") or "")
        if not oid: raise ValueError("Missing order identity")
        for field in ("cancelStatus", "paymentSummary", "pricingSummary"):
            if order.get(field) is not None and not isinstance(order[field], dict):
                raise ValueError("Invalid order details")
        payment=str(order.get("orderPaymentStatus") or "UNKNOWN")
        cancellation=str((order.get("cancelStatus") or {}).get("cancelState") or "UNKNOWN")
        fulfillment=str(order.get("orderFulfillmentStatus") or "UNKNOWN")
        created=str(order.get("creationDate") or "")[:10]
        lines = order.get("lineItems") or []
        if not isinstance(lines, list): raise ValueError("Invalid order lines")
        order_refunds = bool((order.get("paymentSummary") or {}).get("refunds"))
        for line in lines:
            if not isinstance(line, dict):
                raise ValueError("Invalid order line")
            lid=str(line.get("lineItemId") or "")
            if not lid: raise ValueError("Missing order line identity")
            # A supplied but invalid discounted value must not fall back to a larger price.
            price=_order_money(line.get("discountedLineItemCost") if "discountedLineItemCost" in line else line.get("lineItemCost"))
            raw_quantity = line.get("quantity")
            quantity = raw_quantity if type(raw_quantity) is int and raw_quantity > 0 else 0
            refund_detected = order_refunds or bool(line.get("refunds"))
            items.append({
                "key":oid+":"+lid,"orderId":oid,"lineItemId":lid,
                "sku":str(line.get("sku") or ""),"listingId":str(line.get("legacyItemId") or line.get("listingId") or ""),
                "title":str(line.get("title") or "")[:180],
                "quantity":quantity,"price":price,"currency":"GBP" if price is not None else None,
                "paymentStatus":payment,"cancelState":cancellation,
                "fulfillmentStatus":fulfillment,"date":created,
                "refundDetected":refund_detected,
                "orderFee":_order_money(order.get("totalMarketplaceFee")),
                "orderShipping":_order_money((order.get("pricingSummary") or {}).get("deliveryCost")),
                "orderLineCount":len(lines),
                "eligible":payment=="PAID" and cancellation in ("NONE","NOT_REQUESTED") and
                  not refund_detected and quantity>0 and price is not None,
                "feeStatus":"Order-level evidence only; confirm allocation, postage and packaging separately",
            })
    unique = {}
    for item in items:
        identity = (item["orderId"], item["lineItemId"])
        if identity in unique and unique[identity] != item:
            raise ValueError("Order changed during pagination; retry")
        unique[identity] = item
    return list(unique.values())


def list_orders(limit=100):
    """Sandbox-only read of checkout-complete orders; never publishes or modifies listings."""
    token=_user_token()
    if not token["ok"]: return {"ok":False,"status":token.get("status","Seller not connected")}
    limit=min(100,max(1,int(limit)))
    try:
        raw=[]
        truncated=False
        # Bound work to 1,000 orders; never follow an upstream URL with our bearer token.
        # eBay's default creation-date window is used, and disclosed to the user.
        for page in range(10):
            request=Request("https://api.sandbox.ebay.com/sell/fulfillment/v1/order?"+
                            urlencode({"limit":limit,"offset":page*limit}),
                            headers={"Authorization":"Bearer "+token["token"],
                                     "Accept":"application/json",
                                     "X-EBAY-C-MARKETPLACE-ID":"EBAY_GB"})
            with urlopen(request,timeout=20) as response:
                data=json.loads(response.read().decode("utf-8"))
            if not isinstance(data,dict): raise ValueError("Invalid response")
            batch=data.get("orders") or []
            if not isinstance(batch,list): raise ValueError("Invalid orders response")
            raw.extend(batch)
            truncated=bool(data.get("next") or ((data.get("total") or 0)>len(raw)))
            if not truncated: break
            if not batch: raise ValueError("Pagination made no progress")
        return {"ok":True,"environment":"sandbox","orders":normalize_orders(raw),
                "sampledOrders":len(raw),"totalOrders":data.get("total"),
                "truncated":truncated,
                "note":"Read-only orders in eBay's default creation-date window. Older orders and returns require Seller Hub verification."}
    except HTTPError as exc:
        return {"ok":False,"status":"eBay Fulfillment orders HTTP {}.".format(exc.code)}
    except (URLError,TimeoutError,OSError,ValueError,TypeError):
        return {"ok":False,"status":"eBay Sandbox orders temporarily unavailable."}


def test_connection():
    """Read-only smoke test; never creates listings or orders."""
    token = _user_token()
    if not token["ok"]:
        return token
    return {
        "ok": True,
        "environment": "sandbox",
        "inventory": _read_seller_endpoint("/sell/inventory/v1/inventory_item?limit=5", token["token"]),
        "orders": _read_seller_endpoint("/sell/fulfillment/v1/order?limit=5", token["token"]),
    }
