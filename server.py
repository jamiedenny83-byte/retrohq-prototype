from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from pathlib import Path
import json, os, time, threading

ROOT = Path(__file__).resolve().parent
PC_BASE = "https://www.pricecharting.com/api/product"
_pc_lock = threading.Lock()
_pc_last_call = 0.0

def pc_money(v):
    try: return round(int(v) / 100.0, 2)
    except (TypeError, ValueError): return None

def pricecharting_lookup(query, barcode):
    global _pc_last_call
    token = os.environ.get("PRICECHARTING_API_TOKEN", "").strip()
    if not token:
        return {"ok": False, "status": "Token not loaded", "detail": "Set PRICECHARTING_API_TOKEN in the server environment."}
    params = {"t": token}
    if barcode: params["upc"] = barcode
    elif query: params["q"] = query
    else: return {"ok": False, "status": "No search supplied", "detail": "Enter a description or barcode."}
    # PriceCharting permits at most one API call per second. Serialize calls and leave a small safety margin.
    with _pc_lock:
        wait = 1.05 - (time.monotonic() - _pc_last_call)
        if wait > 0: time.sleep(wait)
        req = Request(PC_BASE + "?" + urlencode(params), headers={"User-Agent": "RetroHQ-Internal-PoC/0.4"})
        try:
            with urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except HTTPError as e:
            try: msg = json.loads(e.read().decode("utf-8")).get("error-message")
            except Exception: msg = str(e)
            return {"ok": False, "status": "PriceCharting error", "detail": msg}
        except (URLError, TimeoutError, json.JSONDecodeError) as e:
            return {"ok": False, "status": "Connection error", "detail": str(e)}
        finally:
            _pc_last_call = time.monotonic()
    if data.get("status") != "success":
        return {"ok": False, "status": "No match", "detail": data.get("error-message", "PriceCharting returned no usable match.")}
    fields = {k: pc_money(data.get(k)) for k in (
        "loose-price","cib-price","new-price","retail-loose-buy","retail-loose-sell",
        "retail-cib-buy","retail-cib-sell","retail-new-buy","retail-new-sell")}
    return {"ok": True, "id": data.get("id"), "product": data.get("product-name"),
            "console": data.get("console-name"), "upc": data.get("upc"),
            "salesVolume": data.get("sales-volume"), "prices": fields}

class H(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        clean = urlparse(path).path.lstrip("/")
        return str(ROOT / (clean or "index.html"))
    def send_json(self, body, status=200):
        raw = json.dumps(body).encode("utf-8")
        self.send_response(status); self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store"); self.send_header("Content-Length", str(len(raw)))
        self.end_headers(); self.wfile.write(raw)
    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/api/market-search":
            p = parse_qs(u.query); q = (p.get("q") or [""])[0].strip(); barcode = (p.get("barcode") or [""])[0].strip()
            pc = pricecharting_lookup(q, barcode)
            evidence = [
                {"provider":"eBay UK","status":"Waiting for API approval","detail":"Provider slot ready; no eBay figure invented."},
                {"provider":"CeX UK","status":"Connector in development","detail":"Sell / cash / voucher evidence will plug into this provider slot."}
            ]
            if pc.get("ok"):
                pr = pc["prices"]
                parts=[]
                for label,key in (("Loose","loose-price"),("CIB","cib-price"),("New","new-price"),("Retail CIB buy","retail-cib-buy"),("Retail CIB sell","retail-cib-sell")):
                    if pr.get(key) is not None: parts.append(f"{label} ${pr[key]:.2f}")
                if pc.get("salesVolume") not in (None, ""): parts.append(f"Annual sales volume {pc['salesVolume']}")
                evidence.append({"provider":"PriceCharting","status":"Live","currency":"USD","product":pc.get("product"),"console":pc.get("console"),
                                 "prices":pr,"salesVolume":pc.get("salesVolume"),"productId":pc.get("id"),
                                 "detail":f"Matched: {pc.get('product','Unknown')} — {pc.get('console','Unknown')}. " + " · ".join(parts)})
                method = "Live PriceCharting reference loaded. Values are USD reference evidence, not a UK valuation. RetroHQ UK Market Value remains uncalculated until UK evidence is connected or a manual override is entered."
            else:
                evidence.append({"provider":"PriceCharting","status":pc.get("status","Unavailable"),"detail":pc.get("detail","")})
                method = "No market value invented. PriceCharting did not return usable live evidence."
            self.send_json({"query":q,"barcode":barcode,"marketValue":None,"confidence":"reference-only" if pc.get("ok") else "unavailable","evidence":evidence,"method":method}); return
        if u.path == "/api/provider-status":
            self.send_json({"pricecharting": bool(os.environ.get("PRICECHARTING_API_TOKEN")), "ebay": False, "cex": False}); return
        super().do_GET()

if __name__ == "__main__":
    port=int(os.environ.get("PORT","8006"))
    print(f"RetroHQ Test 4 — Live Market Data: http://localhost:{port}")
    print("PriceCharting token:", "loaded" if os.environ.get("PRICECHARTING_API_TOKEN") else "MISSING")
    ThreadingHTTPServer(("0.0.0.0",port),H).serve_forever()
