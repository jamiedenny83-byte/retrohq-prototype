from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from pathlib import Path
import json, os, time, threading

ROOT = Path(__file__).resolve().parent
PC_PRODUCT = "https://www.pricecharting.com/api/product"
PC_PRODUCTS = "https://www.pricecharting.com/api/products"
_pc_lock = threading.Lock()
_pc_last_call = 0.0

def pc_money(v):
    try: return round(int(v) / 100.0, 2)
    except (TypeError, ValueError): return None

def pc_call(url, params):
    global _pc_last_call
    token = os.environ.get("PRICECHARTING_API_TOKEN", "").strip()
    if not token:
        return {"status":"error","error-message":"Set PRICECHARTING_API_TOKEN in the server environment."}
    params = {"t": token, **params}
    with _pc_lock:
        wait = 1.05 - (time.monotonic() - _pc_last_call)
        if wait > 0: time.sleep(wait)
        req = Request(url + "?" + urlencode(params), headers={"User-Agent":"RetroHQ-Internal-PoC/0.5"})
        try:
            with urlopen(req, timeout=12) as resp: return json.loads(resp.read().decode("utf-8"))
        except HTTPError as e:
            try: return {"status":"error","error-message":json.loads(e.read().decode("utf-8")).get("error-message", str(e))}
            except Exception: return {"status":"error","error-message":str(e)}
        except (URLError, TimeoutError, json.JSONDecodeError) as e:
            return {"status":"error","error-message":str(e)}
        finally: _pc_last_call = time.monotonic()

def normalize_words(s):
    import re
    return [w for w in re.sub(r"[^a-z0-9]+"," ",(s or "").lower()).split() if w]

def infer_intent(query):
    q=" ".join(normalize_words(query))
    intent={"type":"unknown","platform":None,"ambiguous":False,"label":None}
    hardware_words=("console","handheld","system")
    if any(w in q.split() for w in hardware_words): intent["type"]="hardware"
    aliases=[
      (("xbox original","original xbox"),"Xbox","Original Xbox"),
      (("xbox 360",),"Xbox 360","Xbox 360"),
      (("xbox one",),"Xbox One","Xbox One"),
      (("xbox series s",),"Xbox Series X","Xbox Series S"),
      (("xbox series x",),"Xbox Series X","Xbox Series X"),
      (("gameboy advance","game boy advance"),"GameBoy Advance","Game Boy Advance"),
      (("gameboy color","game boy color"),"GameBoy Color","Game Boy Color"),
      (("gameboy","game boy"),"GameBoy","Game Boy"),
    ]
    for phrases,platform,label in aliases:
        if any(ph in q for ph in phrases):
            intent.update(platform=platform,label=label)
            # Platform name by itself normally means the hardware in reseller shorthand.
            if intent["type"]=="unknown" and q in phrases: intent["type"]="hardware"
            break
    if q in ("xbox console","xbox system","xbox"):
        intent.update(type="hardware",platform=None,label="Xbox",ambiguous=True)
    return intent

def candidate_score(query, c, intent):
    q=set(normalize_words(query)); name=set(normalize_words(c.get("product-name"))); con=set(normalize_words(c.get("console-name")))
    score=2*len(q & name)+len(q & con)
    pn=(c.get("product-name") or "").lower(); cn=(c.get("console-name") or "").lower()
    if intent.get("platform"):
        target=intent["platform"].lower().replace("gameboy","game boy")
        hay=(pn+" "+cn).replace("gameboy","game boy")
        if target in hay: score+=8
        else: score-=8
    if intent.get("type")=="hardware":
        accessory=("case","cover","charger","cable","adapter","controller","stand","screen protector","battery","memory card")
        gameish=("pokemon","lego ","adventures","edition game")
        hardware=("console","system","handheld","game boy advance","xbox")
        if any(x in pn for x in accessory): score-=12
        if any(x in pn for x in gameish): score-=8
        if any(x in pn for x in hardware): score+=5
    return score

def pc_detail(product_id=None, barcode=None, query=None):
    params={}
    if product_id: params["id"]=product_id
    elif barcode: params["upc"]=barcode
    elif query: params["q"]=query
    data=pc_call(PC_PRODUCT,params)
    if data.get("status")!="success": return {"ok":False,"status":"PriceCharting error","detail":data.get("error-message","No usable match")}
    fields={k:pc_money(data.get(k)) for k in ("loose-price","cib-price","new-price","retail-loose-buy","retail-loose-sell","retail-cib-buy","retail-cib-sell","retail-new-buy","retail-new-sell")}
    return {"ok":True,"id":data.get("id"),"product":data.get("product-name"),"console":data.get("console-name"),"genre":data.get("genre"),"upc":data.get("upc"),"salesVolume":data.get("sales-volume"),"prices":fields}

def pricecharting_lookup(query, barcode, selected_id=None):
    if selected_id: return {"mode":"matched","result":pc_detail(product_id=selected_id)}
    if barcode: return {"mode":"matched","result":pc_detail(barcode=barcode)}
    if not query: return {"mode":"error","result":{"ok":False,"status":"No search supplied","detail":"Enter a description or barcode."}}
    intent=infer_intent(query)
    data=pc_call(PC_PRODUCTS,{"q":query})
    if data.get("status")!="success": return {"mode":"error","result":{"ok":False,"status":"PriceCharting error","detail":data.get("error-message","No usable match")}}
    ranked=[]
    for c in data.get("products",[]):
        c=dict(c); c["score"]=candidate_score(query,c,intent); ranked.append(c)
    ranked.sort(key=lambda x:x["score"], reverse=True)
    top=ranked[:6]
    if not top: return {"mode":"error","result":{"ok":False,"status":"No match","detail":"No PriceCharting candidates found."}}
    # Ambiguous descriptions must be resolved by the reseller, not silently guessed.
    if intent.get("ambiguous"):
        return {"mode":"candidates","intent":intent,"candidates":top,"reason":"The description could refer to more than one generation. Choose the exact item."}
    # Require a meaningful score and separation from the next result before auto-accepting.
    best=top[0]; second=top[1]["score"] if len(top)>1 else -99
    if best["score"] < 8 or best["score"]-second < 3:
        return {"mode":"candidates","intent":intent,"candidates":top,"reason":"RetroHQ found possible matches but is not confident enough to choose for you."}
    detail=pc_detail(product_id=best.get("id"))
    # Final hardware guard using detailed genre where available.
    if detail.get("ok") and intent.get("type")=="hardware" and (detail.get("genre") or "").lower() not in ("","systems"):
        return {"mode":"candidates","intent":intent,"candidates":top,"reason":"The top provider result appears to be software/accessory data, so RetroHQ has not accepted it automatically."}
    return {"mode":"matched","intent":intent,"result":detail,"matchScore":best["score"]}

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
            p = parse_qs(u.query); q = (p.get("q") or [""])[0].strip(); barcode = (p.get("barcode") or [""])[0].strip(); selected_id=(p.get("id") or [""])[0].strip()
            lookup = pricecharting_lookup(q, barcode, selected_id)
            if lookup.get("mode") == "candidates":
                self.send_json({"query":q,"barcode":barcode,"marketValue":None,"confidence":"needs-confirmation","needsConfirmation":True,"intent":lookup.get("intent"),"candidates":lookup.get("candidates",[]),"reason":lookup.get("reason")}); return
            pc = lookup.get("result", {})
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
    print(f"RetroHQ Test 5 — Identification Engine: http://localhost:{port}")
    print("PriceCharting token:", "loaded" if os.environ.get("PRICECHARTING_API_TOKEN") else "MISSING")
    ThreadingHTTPServer(("0.0.0.0",port),H).serve_forever()
