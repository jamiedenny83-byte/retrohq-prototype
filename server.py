from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from pathlib import Path
import json, os
ROOT=Path(__file__).resolve().parent
class H(SimpleHTTPRequestHandler):
 def translate_path(self,path):
  clean=urlparse(path).path.lstrip("/")
  return str(ROOT/(clean or "index.html"))
 def do_GET(self):
  u=urlparse(self.path)
  if u.path=="/api/market-search":
   p=parse_qs(u.query)
   body={"query":(p.get("q") or [""])[0],"marketValue":None,"confidence":"unavailable","evidence":[
    {"provider":"eBay UK","status":"Waiting for API credentials","detail":"Automatic connector prepared."},
    {"provider":"CeX UK","status":"Connector research pending","detail":"No unofficial value is being generated."},
    {"provider":"PriceCharting PAL","status":"Optional reference","detail":"Not configured."}],
    "method":"No market value calculated until an authenticated provider is connected."}
   self.send_response(200); self.send_header("Content-Type","application/json"); self.end_headers(); self.wfile.write(json.dumps(body).encode()); return
  super().do_GET()
if __name__=="__main__":
 port=int(os.environ.get("PORT","8006")); print(f"RetroHQ Test 3: http://localhost:{port}"); ThreadingHTTPServer(("0.0.0.0",port),H).serve_forever()
