"""Read-only production eBay Seller OAuth for RetroHQ's internal Codespaces prototype.

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
    "https://api.ebay.com/oauth/api_scope",
    "https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly",
)
_lock = threading.RLock()
_pending = {}
_access = {"token": None, "expires": 0}
_STATE_LIFETIME = 600


def _enabled():
    return bool(os.environ.get("EBAY_LIVE_CLIENT_ID", "").strip())


def _store_path():
    # Intentionally outside the repo and its static web server.
    return Path.home() / ".config" / "retrohq" / "ebay_seller_production.json"


def _read_store():
    path = _store_path()
    if path.is_symlink() or not path.is_file():
        return None
    try:
        if os.name != "nt" and path.stat().st_mode & 0o077:
            return None  # refuse insecurely permissioned token files
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict) or data.get("environment") != "production" or not isinstance(data.get("refresh_token"), str) or not data.get("refresh_token") or not isinstance(data.get("refresh_expires_at"), (int, float)):
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
        ("EBAY_LIVE_CLIENT_ID", "EBAY_LIVE_CLIENT_ID"),
        ("EBAY_LIVE_CLIENT_SECRET", "EBAY_LIVE_CLIENT_SECRET"),
        ("EBAY_LIVE_RUNAME", "EBAY_LIVE_RUNAME"),
        ("RETROHQ_ADMIN_PIN", "RETROHQ_ADMIN_PIN"),
    ):
        if not os.environ.get(key, "").strip():
            missing.append(label)
    pin = os.environ.get("RETROHQ_ADMIN_PIN", "")
    # Diagnostic reveals only whether the Codespaces secret is usable,
    # never its value or length.
    pin_status = ("Missing" if not pin else
                  "Too short — set at least 8 characters" if len(pin) < 8 else
                  "Has leading or trailing whitespace" if pin != pin.strip() else
                  "Ready")
    if pin and len(pin) < 8:
        missing.append("RETROHQ_ADMIN_PIN must be at least 8 characters")
    saved = _read_store() if _enabled() else None
    connected = bool(saved and saved.get("refresh_expires_at", 0) > time.time())
    return {
        "environment": "production",
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
    client = os.environ["EBAY_LIVE_CLIENT_ID"]
    secret = os.environ["EBAY_LIVE_CLIENT_SECRET"]
    return "Basic " + base64.b64encode((client + ":" + secret).encode()).decode("ascii")


def _token_request(params):
    request = Request(
        "https://api.ebay.com/identity/v1/oauth2/token",
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
        if not isinstance(result, dict) or not isinstance(result.get("access_token"), str) or not result.get("access_token"):
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
        "client_id": os.environ["EBAY_LIVE_CLIENT_ID"],
        "redirect_uri": os.environ["EBAY_LIVE_RUNAME"],
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "state": state,
        "prompt": "login",
    }
    return {
        "ok": True,
        "authorizeUrl": "https://auth.ebay.com/oauth2/authorize?" + urlencode(params),
        "expiresIn": _STATE_LIFETIME,
    }


def complete_authorisation(state, code=None, error=None):
    with _lock:
        expiry = _pending.pop(state, None)
    if not expiry or expiry < time.time():
        return {"ok": False, "status": "The connection attempt expired. Please start again."}
    if error:
        return {"ok": False, "status": "Seller declined or eBay cancelled authorisation."}
    if not code or not _enabled():
        return {"ok": False, "status": "Missing authorisation code or incorrect environment."}
    result = _token_request({
        "grant_type": "authorization_code",
        "code": code,  # already URL-decoded by parse_qs
        "redirect_uri": os.environ["EBAY_LIVE_RUNAME"],
    })
    if not result["ok"]:
        return result
    data = result["data"]
    if not data.get("refresh_token"):
        return {"ok": False, "status": "eBay did not issue a refresh token. Reconnect the seller."}
    now = time.time()
    with _lock:
        _write_store({
            "environment": "production",
            "refresh_token": data["refresh_token"],
            "refresh_expires_at": now + int(data.get("refresh_token_expires_in", 0)),
            "connected_at": now,
            "scopes": list(SCOPES),
        })
        _access.update(token=data["access_token"], expires=now + int(data.get("expires_in", 7200)))
    return {"ok": True, "status": "Production seller connected for read-only calls."}


def _user_token():
    if not configuration()["configured"]:
        return {"ok": False, "status": "Production seller is not configured."}
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



# Only these read calls exist; no marketplace mutation route is exposed.
from datetime import datetime, timedelta, timezone
import xml.etree.ElementTree as ET
from ebay_seller import normalize_orders

def _read_bytes(request):
    with urlopen(request,timeout=25) as response:
        data=response.read(4_000_001)
    if len(data)>4_000_000: raise ValueError("Response too large")
    return data

def _active_page(xml):
    ns={"e":"urn:ebay:apis:eBLBaseComponents"};root=ET.fromstring(xml)
    if root.findtext("e:Ack",namespaces=ns) not in ("Success","Warning"): raise ValueError("eBay listing read failed")
    if any(e.findtext("e:SeverityCode",namespaces=ns)=="Error" for e in root.findall("e:Errors",ns)): raise ValueError("eBay listing read failed")
    def text(node,path,default=""): return node.findtext(path,default,namespaces=ns)
    rows=[]
    for item in root.findall("e:ActiveList/e:ItemArray/e:Item",ns):
        variants=item.findall("e:Variations/e:Variation",ns) or [item]
        for v in variants:
            price=v.find("e:StartPrice",ns) if v is not item else item.find("e:SellingStatus/e:CurrentPrice",ns)
            available=text(v,"e:QuantityAvailable",None)
            quantity=text(v,"e:Quantity",None);sold=text(v,"e:SellingStatus/e:QuantitySold","0")
            if not text(item,"e:ItemID").isdigit(): raise ValueError("Invalid listing identity")
            rows.append({"listingId":text(item,"e:ItemID"),"sku":text(v,"e:SKU"),"title":text(item,"e:Title"),
                         "price":float(price.text) if price is not None and price.text else None,
                         "currency":price.get("currencyID") if price is not None else None,
                         "quantity":int(available) if available is not None else max(0,int(quantity)-int(sold)) if quantity is not None else None,
                         "startDate":text(item,"e:ListingDetails/e:StartTime"),"status":"Active",
                         "url":"https://www.ebay.co.uk/itm/"+text(item,"e:ItemID")})
    return rows,int(root.findtext("e:ActiveList/e:PaginationResult/e:TotalNumberOfPages","1",namespaces=ns))

def snapshot():
    token=_user_token()
    if not token["ok"]:return token
    try:
        listings=[];listing_truncated=False
        for page in range(1,26):
            xml=('<?xml version="1.0" encoding="utf-8"?><GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents"><ActiveList><Include>true</Include><Pagination><EntriesPerPage>200</EntriesPerPage><PageNumber>'+str(page)+'</PageNumber></Pagination></ActiveList><HideVariations>false</HideVariations></GetMyeBaySellingRequest>').encode()
            request=Request("https://api.ebay.com/ws/api.dll",data=xml,headers={"Content-Type":"text/xml","X-EBAY-API-CALL-NAME":"GetMyeBaySelling","X-EBAY-API-SITEID":"3","X-EBAY-API-COMPATIBILITY-LEVEL":"1487","X-EBAY-API-IAF-TOKEN":token["token"]},method="POST")
            batch,pages=_active_page(_read_bytes(request));listings.extend(batch);listing_truncated=page<pages
            if not listing_truncated:break
            if not batch:raise ValueError("Listing pagination made no progress")
        since=(datetime.now(timezone.utc)-timedelta(days=30)).isoformat(timespec="seconds").replace("+00:00","Z")
        orders=[];order_truncated=False
        for page in range(10):
            params=urlencode({"limit":100,"offset":page*100,"filter":"lastmodifieddate:["+since+"..]"})
            request=Request("https://api.ebay.com/sell/fulfillment/v1/order?"+params,headers={"Authorization":"Bearer "+token["token"],"Accept":"application/json"})
            data=json.loads(_read_bytes(request))
            if not isinstance(data,dict):raise ValueError("Invalid order response")
            batch=data.get("orders") or []
            if not isinstance(batch,list):raise ValueError("Invalid order response")
            orders.extend(batch);order_truncated=bool(data.get("next") or (data.get("total",0)>len(orders)))
            if not order_truncated:break
            if not batch:raise ValueError("Order pagination made no progress")
        return {"ok":True,"environment":"production","listings":listings,"orders":normalize_orders(orders),"listingTruncated":listing_truncated,"orderTruncated":order_truncated,"checkedAt":datetime.now(timezone.utc).isoformat(),"note":"Active listings and orders modified in the last 30 days. Fees, refunds, older orders and physical returns require review. No marketplace changes sent."}
    except HTTPError as e:return {"ok":False,"status":"Production eBay read failed (HTTP {}).".format(e.code)}
    except (URLError,TimeoutError,OSError,ValueError,TypeError,ET.ParseError):return {"ok":False,"status":"Production eBay snapshot unavailable; keep the previous snapshot and retry."}
