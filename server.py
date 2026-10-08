from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, urlencode, quote, unquote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from pathlib import Path
import json, os, time, threading, re, base64, statistics
import ebay_seller

ROOT = Path(__file__).resolve().parent
PC_PRODUCT = "https://www.pricecharting.com/api/product"
PC_PRODUCTS = "https://www.pricecharting.com/api/products"
_pc_lock = threading.Lock()
_pc_last_call = 0.0

CEX_SEARCH = "https://search.webuy.io/1/indexes/*/queries"
_cex_lock = threading.Lock()
_cex_last_call = 0.0

# eBay Browse API — UK active-listing evidence.
# Secrets stay server-side in Codespaces/environment variables.
_ebay_token_cache = {"token": None, "expires": 0}

def _ebay_base():
    return "https://api.sandbox.ebay.com" if os.environ.get("EBAY_ENV","production").lower()=="sandbox" else "https://api.ebay.com"

def ebay_access_token():
    client_id=os.environ.get("EBAY_CLIENT_ID","").strip()
    client_secret=os.environ.get("EBAY_CLIENT_SECRET","").strip()
    if not client_id or not client_secret:
        return {"ok":False,"status":"Credentials not loaded","detail":"Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in the server environment."}
    now=time.time()
    if _ebay_token_cache.get("token") and now < _ebay_token_cache.get("expires",0)-60:
        return {"ok":True,"token":_ebay_token_cache["token"]}
    basic=base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    body=urlencode({"grant_type":"client_credentials","scope":"https://api.ebay.com/oauth/api_scope"}).encode()
    req=Request(_ebay_base()+"/identity/v1/oauth2/token",data=body,headers={
        "Authorization":"Basic "+basic,
        "Content-Type":"application/x-www-form-urlencoded"
    },method="POST")
    try:
        with urlopen(req,timeout=12) as r:
            data=json.loads(r.read().decode())
        token=data.get("access_token")
        if not token: return {"ok":False,"status":"OAuth error","detail":"eBay did not return an application access token."}
        _ebay_token_cache.update(token=token,expires=now+int(data.get("expires_in",7200)))
        return {"ok":True,"token":token}
    except HTTPError as e:
        detail=e.read().decode(errors="ignore")[:500]
        return {"ok":False,"status":f"eBay OAuth HTTP {e.code}","detail":detail}
    except Exception as e:
        return {"ok":False,"status":"eBay OAuth unavailable","detail":str(e)}

def ebay_browse_search(query, limit=12):
    if not (query or "").strip():
        return {"ok":False,"status":"No query","detail":"Enter an item to search eBay UK."}
    auth=ebay_access_token()
    if not auth.get("ok"): return auth
    params=urlencode({
        "q":query.strip(),
        "limit":max(1,min(int(limit),20)),
        "filter":"itemLocationCountry:GB"
    })
    req=Request(_ebay_base()+"/buy/browse/v1/item_summary/search?"+params,headers={
        "Authorization":"Bearer "+auth["token"],
        "X-EBAY-C-MARKETPLACE-ID":"EBAY_GB",
        "Accept":"application/json"
    })
    try:
        with urlopen(req,timeout=15) as r:
            data=json.loads(r.read().decode())
        items=[]
        prices=[]
        for x in data.get("itemSummaries",[]) or []:
            p=x.get("price") or {}
            currency=p.get("currency")
            value=_num(p.get("value"))
            if value is not None and currency=="GBP": prices.append(value)
            items.append({
                "itemId":x.get("itemId"),"title":x.get("title"),"price":value,"currency":currency,
                "condition":x.get("condition"),"buyingOptions":x.get("buyingOptions",[]),
                "itemWebUrl":x.get("itemWebUrl"),"seller":(x.get("seller") or {}).get("username")
            })
        return {
            "ok":True,"status":"Live","marketplace":"EBAY_GB","count":len(items),
            "total":data.get("total"),"items":items,
            "medianAsking":round(statistics.median(prices),2) if prices else None,
            "lowAsking":min(prices) if prices else None,"highAsking":max(prices) if prices else None
        }
    except HTTPError as e:
        detail=e.read().decode(errors="ignore")[:700]
        return {"ok":False,"status":f"eBay Browse HTTP {e.code}","detail":detail}
    except Exception as e:
        return {"ok":False,"status":"eBay Browse unavailable","detail":str(e)}

def _first(d, *keys):
    for k in keys:
        if d.get(k) not in (None, ""):
            return d.get(k)
    return None

def _num(v):
    try: return round(float(v), 2)
    except (TypeError, ValueError): return None

def identity_attributes(text):
    t=(text or "").lower()
    attrs={}
    for v in ("super slim","slim","elite","arcade"):
        if v in t: attrs["revision"]=v
    m=re.search(r"\b(\d+)\s*(gb|tb)\b",t)
    if m: attrs["storage"]=(m.group(1)+m.group(2)).lower()
    for v in ("scarlet red","indigo","glacier","purple","black","white","silver","red","blue","pink"):
        if v in t: attrs["colour"]=v
    return attrs

def canonical_identity(query, pc, intent):
    # Once the user confirms a PriceCharting candidate, this becomes RetroHQ's locked identity.
    combined=" ".join(x for x in (query, pc.get("product"), pc.get("console")) if x)
    attrs=identity_attributes(combined)
    return {"type":intent.get("type"),"family":intent.get("family"),"platform":intent.get("platform"),
            "label":intent.get("label"),"confirmedProduct":pc.get("product"),"confirmedConsole":pc.get("console"),
            "attributes":attrs}

def identity_attributes(text):
    """Extract variant attributes without allowing broad terms to overwrite specific ones."""
    t=(text or "").lower(); attrs={}
    if "super slim" in t: attrs["revision"]="super slim"
    elif re.search(r"\bslim\b", t): attrs["revision"]="slim"
    elif re.search(r"\belite\b", t): attrs["revision"]="elite"
    elif re.search(r"\barcade\b", t): attrs["revision"]="arcade"
    m=re.search(r"\b(\d+)\s*(gb|tb)\b",t)
    if m: attrs["storage"]=(m.group(1)+m.group(2)).lower()
    if "scarlet red" in t: attrs["colour"]="scarlet red"
    elif "indigo" in t: attrs["colour"]="indigo"
    elif "glacier" in t: attrs["colour"]="glacier"
    else:
        for v in ("purple","black","white","silver","red","blue","pink"):
            if re.search(r"\b"+re.escape(v)+r"\b", t): attrs["colour"]=v; break
    return attrs

def canonical_identity(query, pc, intent):
    confirmed_attrs=identity_attributes(" ".join(x for x in (pc.get("product"),pc.get("console")) if x))
    query_attrs=identity_attributes(query); attrs=dict(confirmed_attrs)
    for k,v in query_attrs.items(): attrs.setdefault(k,v)
    return {"type":intent.get("type"),"family":intent.get("family"),"platform":intent.get("platform"),
            "label":intent.get("label"),"confirmedProduct":pc.get("product"),"confirmedConsole":pc.get("console"),
            "pricechartingProductId":pc.get("id"),"attributes":attrs}

def cex_grade_from_title(title):
    low=(title or "").lower()
    if re.search(r"\bdiscounted\b", low): return "Discounted"
    if re.search(r"\bunboxed\b", low): return "Unboxed"
    if re.search(r"\bboxed\b", low): return "Boxed"
    return None

def cex_identity_quality(title, identity):
    hay=(title or "").lower(); attrs=identity.get("attributes") or {}; conflicts=[]; matches=[]
    rev=attrs.get("revision")
    if rev:
        if rev=="super slim":
            if "super slim" in hay: matches.append(rev)
            else: conflicts.append("revision")
        elif rev=="slim":
            if "super slim" in hay: conflicts.append("revision")
            elif re.search(r"\bslim\b", hay): matches.append(rev)
            else: conflicts.append("revision")
        elif rev in hay: matches.append(rev)
        else: conflicts.append("revision")
    storage=attrs.get("storage")
    if storage:
        compact=hay.replace(" ","")
        if storage in compact: matches.append(storage)
        elif re.search(r"\b\d+\s*(?:gb|tb)\b",hay): conflicts.append("storage")
        else: conflicts.append("storage")
    colour=attrs.get("colour")
    if colour:
        terms={"scarlet red":["scarlet red","red"],"indigo":["indigo","purple"],"glacier":["glacier"]}.get(colour,[colour])
        if any(x in hay for x in terms): matches.append(colour)
        elif any(x in hay for x in ("red","blue","black","white","silver","pink","purple","indigo","glacier")): conflicts.append("colour")
        else: conflicts.append("colour")
    return matches,conflicts

def _cex_candidate_score(title, category, search_query, intent, identity, grade=None):
    hay=(title+" "+category).lower(); qwords=set(normalize_words(search_query)); words=set(normalize_words(title+" "+category))
    score=2*len(qwords & words)
    if intent.get("type")=="hardware":
        if any(x in hay for x in ("software"," games","accessor","case","controller","cable","charger","adapter","headset")): return None
        if not any(x in hay for x in ("console","consoles","system","handheld","gameboy","game boy")): return None
        score+=15
    if any(x in hay for x in intent.get("excludeConsoleTerms",[])): return None
    platform=identity.get("platform") or intent.get("platform") or ""
    if platform=="Original Xbox":
        if "xbox" not in hay or any(x in hay for x in ("xbox 360","xbox one","xbox series")): return None
        score+=20
    elif platform:
        allowed=intent.get("allowedConsoleTerms",[])
        if allowed and not any(x in hay for x in allowed): return None
        score+=12
    matches,conflicts=cex_identity_quality(title,identity)
    if conflicts: return None
    score+=8*len(matches)
    if grade:
        actual=cex_grade_from_title(title)
        if actual==grade: score+=12
        elif actual: return None
    return score

def _cex_prices(h):
    return {"retail":_num(_first(h,"sellPrice","price_sell","sale_price")),
            "cash":_num(_first(h,"cashPrice","price_cash","trade_in_cash_price")),
            "voucher":_num(_first(h,"exchangePrice","price_exchange","trade_in_voucher_price"))}

def cex_detail(product_id):
    global _cex_last_call
    if not product_id: return None
    with _cex_lock:
        wait=0.35-(time.monotonic()-_cex_last_call)
        if wait>0: time.sleep(wait)
        req=Request("https://wss2.cex.uk.webuy.io/v3/boxes/{}/detail".format(quote(str(product_id),safe="")),
                    headers={"User-Agent":"RetroHQ-Internal-PoC/0.8.1 (+internal testing)"})
        try:
            with urlopen(req,timeout=12) as resp: data=json.loads(resp.read().decode("utf-8"))
        except (HTTPError,URLError,TimeoutError,json.JSONDecodeError): return None
        finally: _cex_last_call=time.monotonic()
    payload=((data.get("response") or {}).get("data") or {})
    details=payload.get("boxDetails") or payload.get("boxes") or []
    return details[0] if details else None

def cex_search(query, intent=None, limit=40, grade=None, identity=None, selected_product_id=None):
    global _cex_last_call
    if not query: return {"ok":False,"status":"No query","detail":"No confirmed identity supplied to CeX."}
    intent=intent or {}; identity=identity or {}; qlow=(query or "").lower()
    if not grade:
        for g in ("discounted","unboxed","boxed"):
            if re.search(r"\b"+g+r"\b",qlow): grade=g.title(); break
    platform=identity.get("platform") or intent.get("platform") or ""
    aliases={"Original Xbox":"Xbox Console","Xbox 360":"Xbox 360 Console","Xbox One":"Xbox One Console",
      "Xbox Series S":"Xbox Series S Console","Xbox Series X":"Xbox Series X Console",
      "PlayStation 2":"PlayStation 2 Console","PlayStation 3":"PlayStation 3 Console","PlayStation 4":"PlayStation 4 Console",
      "PlayStation 5":"PlayStation 5 Console","Game Boy Advance":"Gameboy Advance Console","Game Boy Color":"Gameboy Color Console"}
    search_query=aliases.get(platform,query); attrs=identity.get("attributes") or {}
    for val in (attrs.get("revision"),attrs.get("storage"),attrs.get("colour")):
        if val and val.lower() not in search_query.lower(): search_query+=" "+val
    if grade and grade.lower() not in search_query.lower(): search_query+=" "+grade

    def exact_result(h, selected=False):
        title=str(_first(h,"boxName","name","title","productName") or "Unknown")
        category=str(_first(h,"categoryName","categoryFriendlyName","category","superCatName") or "")
        actual=cex_grade_from_title(title); sc=_cex_candidate_score(title,category,search_query,intent,identity,actual)
        if sc is None: return {"ok":False,"status":"CeX selection rejected","detail":"The selected CeX catalogue record conflicts with the locked RetroHQ identity."}
        prices=_cex_prices(h)
        return {"ok":True,"score":sc,"product":title,"productId":_first(h,"boxId","box_id","objectID","id"),
          **prices,"stock":_first(h,"ecomQuantityOnHand","stock","stockOnline","online_quantity","collectionQuantity"),
          "outOfEcomStock":_first(h,"outOfEcomStock","out_of_ecom_stock"),"category":category,"grade":actual,
          "candidateCount":1,"matchQuality":"Confirmed exact CeX record" if selected else "Exact/strong",
          "identity":identity,"selectedByUser":selected}

    if selected_product_id:
        h=cex_detail(selected_product_id)
        if h: return exact_result(h,True)

    params=urlencode({"query":search_query,"hitsPerPage":limit})
    payload=json.dumps({"requests":[{"indexName":"prod_cex_uk","params":params}]}).encode("utf-8")
    with _cex_lock:
        wait=1.05-(time.monotonic()-_cex_last_call)
        if wait>0: time.sleep(wait)
        req=Request(CEX_SEARCH,data=payload,headers={"Content-Type":"application/json","User-Agent":"RetroHQ-Internal-PoC/0.8.1 (+internal testing)"},method="POST")
        try:
            with urlopen(req,timeout=12) as resp: data=json.loads(resp.read().decode("utf-8"))
        except (HTTPError,URLError,TimeoutError,json.JSONDecodeError) as e:
            return {"ok":False,"status":"CeX unavailable","detail":str(e)}
        finally: _cex_last_call=time.monotonic()
    hits=((data.get("results") or [{}])[0].get("hits") or [])
    ranked=[]
    for h in hits:
        title=str(_first(h,"boxName","name","title","productName") or "")
        category=str(_first(h,"categoryName","categoryFriendlyName","category","superCatName") or "")
        sc=_cex_candidate_score(title,category,search_query,intent,identity,grade)
        if sc is not None: ranked.append((sc,h))
    ranked.sort(key=lambda x:x[0],reverse=True)
    if selected_product_id:
        for _,cand in ranked:
            pid=str(_first(cand,"boxId","box_id","objectID","id") or "")
            if pid==str(selected_product_id): return exact_result(cand,True)
        return {"ok":False,"status":"CeX exact match unavailable","detail":"The selected CeX record could not be refreshed. Choose a CeX match again."}
    if not ranked or ranked[0][0]<12:
        return {"ok":False,"status":"No confident CeX match","detail":"CeX returned no candidate that passed RetroHQ's locked product identity checks."}
    if intent.get("type")=="hardware" and not grade:
        variants=[]; seen=set(); best=ranked[0][0]
        for sc,cand in ranked[:16]:
            if sc<best-5: continue
            nm=str(_first(cand,"boxName","name","title","productName") or ""); pid=str(_first(cand,"boxId","box_id","objectID","id") or "")
            if not pid or pid in seen: continue
            seen.add(pid); prices=_cex_prices(cand)
            variants.append({"productId":pid,"grade":cex_grade_from_title(nm) or "CeX variant","product":nm,**prices})
            if len(variants)>=6: break
        if len(variants)>1:
            return {"ok":False,"status":"CeX variant needed","detail":"Multiple credible CeX catalogue records match the locked product. Choose the exact CeX record to continue.","variants":variants}
    return exact_result(ranked[0][1],False)

# Test 8.1 — live replacement-cost evidence for essential console accessories.
# We only deduct a controller cost when CeX returns a credible platform-specific
# controller match. If evidence is weak or unavailable, RetroHQ leaves the
# adjustment unresolved instead of inventing a value.
_CONTROLLER_QUERIES = {
    "Original Xbox": ("Xbox Original Controller", ("xbox", "controller")),
    "Xbox 360": ("Xbox 360 Wireless Controller", ("xbox", "360", "controller")),
    "Xbox One": ("Xbox One Wireless Controller", ("xbox", "one", "controller")),
    "Xbox Series S": ("Xbox Series Wireless Controller", ("xbox", "controller")),
    "Xbox Series X": ("Xbox Series Wireless Controller", ("xbox", "controller")),
    "PlayStation 2": ("Playstation 2 Official Controller", ("playstation", "2", "controller")),
    "PlayStation 3": ("Playstation 3 Official DualShock 3 Controller", ("playstation", "3", "controller")),
    "PlayStation 4": ("Playstation 4 Official DualShock 4 Controller", ("playstation", "4", "controller")),
    "PlayStation 5": ("Playstation 5 DualSense Controller", ("playstation", "5", "controller")),
}

def cex_accessory_retail(platform, colour=None):
    spec=_CONTROLLER_QUERIES.get(platform)
    if not spec: return {"ok":False,"status":"No accessory profile","detail":"No controller replacement profile is defined for this platform."}
    query,required=spec
    colour=(colour or "").strip().lower()
    if colour: query += " " + colour
    params=urlencode({"query":query,"hitsPerPage":30})
    payload=json.dumps({"requests":[{"indexName":"prod_cex_uk","params":params}]}).encode("utf-8")
    global _cex_last_call
    with _cex_lock:
        wait=1.05-(time.monotonic()-_cex_last_call)
        if wait>0: time.sleep(wait)
        req=Request(CEX_SEARCH,data=payload,headers={"Content-Type":"application/json","User-Agent":"RetroHQ-Internal-PoC/0.8.1 (+internal testing)"},method="POST")
        try:
            with urlopen(req,timeout=12) as resp: data=json.loads(resp.read().decode("utf-8"))
        except (HTTPError,URLError,TimeoutError,json.JSONDecodeError) as e:
            return {"ok":False,"status":"CeX unavailable","detail":str(e)}
        finally: _cex_last_call=time.monotonic()
    hits=((data.get("results") or [{}])[0].get("hits") or [])
    ranked=[]
    for h in hits:
        title=str(_first(h,"boxName","name","title","productName") or "")
        low=title.lower()
        if "controller" not in low: continue
        if any(x in low for x in ("console with","console +","bundle","charger","cable","case")): continue
        # Require platform-specific evidence, accepting common catalogue aliases such as PS3.
        aliases={
          "Original Xbox":("original xbox","xbox original"),
          "Xbox 360":("xbox 360",),
          "Xbox One":("xbox one",),
          "Xbox Series S":("xbox series","series s","series x"),
          "Xbox Series X":("xbox series","series x","series s"),
          "PlayStation 2":("playstation 2","ps2"),
          "PlayStation 3":("playstation 3","ps3"),
          "PlayStation 4":("playstation 4","ps4"),
          "PlayStation 5":("playstation 5","ps5"),
        }.get(platform,())
        if aliases and not any(term in low for term in aliases): continue
        if colour:
            colour_terms={"scarlet red":("scarlet red","red"),"indigo":("indigo","purple"),"glacier":("glacier",)}.get(colour,(colour,))
            if not any(term in low for term in colour_terms): continue
        matched=1+sum(1 for term in required if term in low)+(2 if colour else 0)
        retail=_cex_prices(h).get("retail")
        if retail is None or retail<=0: continue
        score=matched*10 + 2*len(set(normalize_words(query)) & set(normalize_words(title)))
        if "official" in low: score+=5
        if "dualshock" in query.lower() and "dualshock" in low: score+=8
        if "dualsense" in query.lower() and "dualsense" in low: score+=8
        ranked.append((score,h,retail))
    ranked.sort(key=lambda x:x[0],reverse=True)
    if not ranked:
        return {"ok":False,"status":"No confident accessory match","detail":"RetroHQ could not find a controller price it trusts enough to deduct automatically."}
    score,h,retail=ranked[0]
    title=str(_first(h,"boxName","name","title","productName") or "Controller")
    return {"ok":True,"provider":"CeX UK","product":title,"retail":retail,"score":score,
            "detail":"Live CeX UK retail replacement benchmark for the required controller."}

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
        req = Request(url + "?" + urlencode(params), headers={"User-Agent":"RetroHQ-Internal-PoC/0.8.1"})
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
    intent={"type":"unknown","family":None,"platform":None,"label":None,"ambiguous":False,"providerQueries":[],"allowedConsoleTerms":[],"excludeConsoleTerms":[]}
    if any(w in q.split() for w in ("console","handheld","system")): intent["type"]="hardware"

    # RetroHQ console taxonomy: strong reseller shorthand is treated as identity evidence,
    # not weakened by a provider's broad text search.
    taxonomy=[
      (("original xbox","xbox original"),"Xbox","Original Xbox","hardware",["Xbox System","Original Xbox System"],["xbox"],["xbox 360","xbox one","xbox series"]),
      (("xbox series s",),"Xbox","Xbox Series S","hardware",["Xbox Series S Console","Xbox Series S System"],["xbox series x"], ["xbox 360","xbox one"]),
      (("xbox series x",),"Xbox","Xbox Series X","hardware",["Xbox Series X Console","Xbox Series X System"],["xbox series x"], ["xbox 360","xbox one"]),
      (("xbox one",),"Xbox","Xbox One","hardware",["Xbox One Console","Xbox One System"],["xbox one"],["xbox 360","xbox series"]),
      (("xbox 360",),"Xbox","Xbox 360","hardware",["Xbox 360 Console","Xbox 360 System"],["xbox 360"],["xbox one","xbox series"]),
      (("ps5","playstation 5"),"PlayStation","PlayStation 5","hardware",["PlayStation 5 Console","PS5 Console"],["playstation 5","ps5"],["playstation 4","ps4","playstation 3","ps3"]),
      (("ps4","playstation 4"),"PlayStation","PlayStation 4","hardware",["PlayStation 4 Console","PS4 Console"],["playstation 4","ps4"],["playstation 5","ps5","playstation 3","ps3"]),
      (("ps3","playstation 3"),"PlayStation","PlayStation 3","hardware",["PlayStation 3 System","PS3 System"],["playstation 3","ps3"],["playstation 4","ps4","playstation 2","ps2"]),
      (("ps2","playstation 2"),"PlayStation","PlayStation 2","hardware",["PlayStation 2 System","PS2 System"],["playstation 2","ps2"],["playstation 3","ps3"]),
      (("gameboy advance","game boy advance","gba"),"Nintendo","Game Boy Advance","hardware",["Game Boy Advance System","GameBoy Advance System"],["gameboy advance","game boy advance"],["gameboy color","game boy color","gameboy sp","game boy sp"]),
      (("gameboy color","game boy color","gbc"),"Nintendo","Game Boy Color","hardware",["Game Boy Color System","GameBoy Color System"],["gameboy color","game boy color"],["gameboy advance","game boy advance"]),
    ]
    # Prefer longest/specific phrases first.
    for phrases,family,label,typ,provider,allowed,excluded in taxonomy:
        if any(ph in q for ph in phrases):
            intent.update(type=typ,family=family,platform=label,label=label,providerQueries=provider,allowedConsoleTerms=allowed,excludeConsoleTerms=excluded)
            return intent

    if q in ("xbox","xbox console","xbox system"):
        intent.update(type="hardware",family="Xbox",label="Xbox",ambiguous=True)
        intent["refinements"]=[
          {"label":"Original Xbox","query":"Original Xbox"}, {"label":"Xbox 360","query":"Xbox 360"},
          {"label":"Xbox One","query":"Xbox One"}, {"label":"Xbox Series S","query":"Xbox Series S"},
          {"label":"Xbox Series X","query":"Xbox Series X"}
        ]
        return intent
    if q in ("playstation","playstation console","ps console"):
        intent.update(type="hardware",family="PlayStation",label="PlayStation",ambiguous=True)
        intent["refinements"]=[{"label":f"PlayStation {n}","query":f"PS{n}"} for n in range(1,6)]
        return intent
    return intent

def is_hardware_candidate(c):
    pn=(c.get("product-name") or "").lower()
    # Provider catalogue hardware normally carries System/Console/Handheld in product name.
    positive=(" system"," console","handheld","game boy advance","gameboy advance")
    negative=("case","carrying","cover","charger","cable","adapter","controller","stand","screen protector","battery","memory card","game only")
    return any(x in pn for x in positive) and not any(x in pn for x in negative)

def candidate_allowed(c,intent):
    pn=(c.get("product-name") or "").lower(); cn=(c.get("console-name") or "").lower(); hay=pn+" "+cn
    if intent.get("type")=="hardware" and not is_hardware_candidate(c): return False
    if any(x in hay for x in intent.get("excludeConsoleTerms",[])): return False
    allowed=intent.get("allowedConsoleTerms",[])
    if allowed and not any(x in hay for x in allowed): return False
    return True

def candidate_score(query, c, intent):
    q=set(normalize_words(query)); name=set(normalize_words(c.get("product-name"))); con=set(normalize_words(c.get("console-name")))
    score=2*len(q & name)+len(q & con)
    if intent.get("platform") and candidate_allowed(c,intent): score+=20
    # Useful variant attributes typed by the reseller should rise naturally.
    for attr in ("indigo","glacier","white","black","red","blue","silver","pink","purple","slim","super slim","elite","arcade","250gb","320gb","500gb","1tb"):
        if attr in " ".join(normalize_words(query)) and attr in (c.get("product-name") or "").lower(): score+=5
    return score

def pc_candidates_for(query,intent):
    searches=[]
    for x in intent.get("providerQueries",[]):
        if x not in searches: searches.append(x)
    if query not in searches: searches.append(query)
    seen={}; errors=[]
    for sq in searches[:3]:
        data=pc_call(PC_PRODUCTS,{"q":sq})
        if data.get("status")!="success": errors.append(data.get("error-message","Provider error")); continue
        for c in data.get("products",[]):
            c=dict(c)
            if not candidate_allowed(c,intent): continue
            c["score"]=candidate_score(query,c,intent)
            seen[str(c.get("id") or (c.get("product-name"),c.get("console-name")))]=c
        if len(seen)>=8: break
    ranked=sorted(seen.values(), key=lambda x:x.get("score",0), reverse=True)
    return ranked, errors

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
    if intent.get("ambiguous") and intent.get("refinements"):
        return {"mode":"refinements","intent":intent,"refinements":intent["refinements"],"reason":"RetroHQ recognises the console family, but the generation is not specific enough. Choose the generation first."}
    ranked,errors=pc_candidates_for(query,intent)
    top=ranked[:8]
    if not top:
        detail="No provider candidates passed RetroHQ's product-type and generation checks."
        if errors: detail += " Provider: " + errors[-1]
        return {"mode":"error","result":{"ok":False,"status":"No confident match","detail":detail},"intent":intent}
    # Test 8 counter flow: auto-lock a clearly dominant match. Ask only when
    # two or more candidates remain genuinely close.
    if len(top)>1:
        best_score=top[0].get("score",0); second_score=top[1].get("score",0)
        confident=best_score>=30 and (best_score-second_score)>=6
        if not confident:
            return {"mode":"candidates","intent":intent,"candidates":top,"reason":"RetroHQ found more than one credible match. One confirmation is needed before pricing."}
    detail=pc_detail(product_id=top[0].get("id"))
    if detail.get("ok") and intent.get("type")=="hardware" and (detail.get("genre") or "").lower() not in ("","systems"):
        return {"mode":"error","result":{"ok":False,"status":"Rejected mismatch","detail":"The provider detail was not hardware, so RetroHQ rejected it."},"intent":intent}
    return {"mode":"matched","intent":intent,"result":detail,"matchScore":top[0]["score"]}

class H(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Never serve hidden files, credentials or paths outside the project root.
        clean = unquote(urlparse(path).path).lstrip("/")
        parts = Path(clean).parts
        if any(part.startswith(".") for part in parts):
            return str(ROOT / "__not_found__")
        candidate = (ROOT / (clean or "index.html")).resolve()
        if not candidate.is_relative_to(ROOT.resolve()):
            return str(ROOT / "__not_found__")
        return str(candidate)
    def log_message(self, format, *args):
        # The OAuth callback query contains a one-use authorization code.
        if "/ebay/oauth/callback" in self.path:
            return
        super().log_message(format, *args)
    def send_json(self, body, status=200):
        raw = json.dumps(body).encode("utf-8")
        self.send_response(status); self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(raw))
        self.end_headers(); self.wfile.write(raw)
    def do_POST(self):
        u = urlparse(self.path)
        if u.path not in ("/api/ebay-seller/start", "/api/ebay-seller/test"):
            self.send_json({"ok": False, "status": "Not found."}, 404); return
        if self.headers.get("X-RetroHQ-Action") != "seller-oauth" or self.headers.get("Sec-Fetch-Site", "same-origin") != "same-origin":
            self.send_json({"ok": False, "status": "Request blocked."}, 403); return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > 1024:
                self.send_json({"ok": False, "status": "Invalid request size."}, 400); return
            payload = json.loads(self.rfile.read(size).decode("utf-8"))
        except (ValueError, UnicodeError):
            self.send_json({"ok": False, "status": "Invalid request."}, 400); return
        if not isinstance(payload, dict) or not ebay_seller.admin_pin_valid(payload.get("pin")):
            self.send_json({"ok": False, "status": "Invalid administrator PIN or PIN not configured."}, 403); return
        if u.path == "/api/ebay-seller/start":
            result = ebay_seller.start_authorisation()
        else:
            result = ebay_seller.test_connection()
        self.send_json(result, 200 if result.get("ok") else 400)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/ebay/oauth/callback":
            q = parse_qs(u.query)
            result = ebay_seller.complete_authorisation(
                (q.get("state") or [""])[0],
                (q.get("code") or [None])[0],
                (q.get("error") or [None])[0],
            )
            self.send_response(303)
            self.send_header("Location", "/?ebaySeller=" + ("connected" if result.get("ok") else "error"))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if u.path == "/api/ebay-seller/status":
            self.send_json(ebay_seller.configuration()); return
        if u.path == "/api/market-search":
            p = parse_qs(u.query); q=(p.get("q") or [""])[0].strip(); barcode=(p.get("barcode") or [""])[0].strip(); selected_id=(p.get("id") or [""])[0].strip(); cex_grade=(p.get("cexGrade") or [""])[0].strip() or None; cex_id=(p.get("cexId") or [""])[0].strip() or None
            lookup = pricecharting_lookup(q, barcode, selected_id)
            if lookup.get("mode") == "refinements":
                self.send_json({"query":q,"barcode":barcode,"marketValue":None,"confidence":"needs-refinement","needsRefinement":True,"intent":lookup.get("intent"),"refinements":lookup.get("refinements",[]),"reason":lookup.get("reason")}); return
            if lookup.get("mode") == "candidates":
                self.send_json({"query":q,"barcode":barcode,"marketValue":None,"confidence":"needs-confirmation","needsConfirmation":True,"intent":lookup.get("intent"),"candidates":lookup.get("candidates",[]),"reason":lookup.get("reason")}); return
            pc = lookup.get("result", {})
            identity = canonical_identity(q,pc,lookup.get("intent") or infer_intent(q)) if pc.get("ok") else None
            ebay = ebay_browse_search(q, 12)
            if ebay.get("ok"):
                evidence = [{"provider":"eBay UK","status":"Live","currency":"GBP","marketplace":"EBAY_GB",
                    "count":ebay.get("count"),"total":ebay.get("total"),"medianAsking":ebay.get("medianAsking"),
                    "lowAsking":ebay.get("lowAsking"),"highAsking":ebay.get("highAsking"),
                    "items":ebay.get("items",[])[:6],
                    "detail":f"Live UK active listings: {ebay.get('count',0)} sampled. Median asking £{ebay.get('medianAsking'):.2f}." if ebay.get("medianAsking") is not None else "Live UK active listings found; no GBP asking-price summary available."}]
            else:
                evidence = [{"provider":"eBay UK","status":ebay.get("status","Unavailable"),"detail":ebay.get("detail","")}]

            if pc.get("ok"):
                pr = pc["prices"]
                parts=[]
                for label,key in (("Loose","loose-price"),("CIB","cib-price"),("New","new-price"),("Retail CIB buy","retail-cib-buy"),("Retail CIB sell","retail-cib-sell")):
                    if pr.get(key) is not None: parts.append(f"{label} ${pr[key]:.2f}")
                if pc.get("salesVolume") not in (None, ""): parts.append(f"Annual sales volume {pc['salesVolume']}")
                evidence.append({"provider":"PriceCharting","status":"Live","currency":"USD","product":pc.get("product"),"console":pc.get("console"),
                                 "prices":pr,"salesVolume":pc.get("salesVolume"),"productId":pc.get("id"),
                                 "detail":f"Matched: {pc.get('product','Unknown')} — {pc.get('console','Unknown')}. " + " · ".join(parts)})
                cex = cex_search(q, lookup.get("intent") or infer_intent(q), grade=cex_grade, identity=identity, selected_product_id=cex_id)
                if cex.get("ok"):
                    cparts=[]
                    if cex.get("retail") is not None: cparts.append(f"retail £{cex['retail']:.2f}")
                    if cex.get("cash") is not None: cparts.append(f"cash £{cex['cash']:.2f}")
                    if cex.get("voucher") is not None: cparts.append(f"voucher £{cex['voucher']:.2f}")
                    evidence.append({"provider":"CeX UK","status":"Live","currency":"GBP","product":cex.get("product"),"productId":cex.get("productId"),"retail":cex.get("retail"),"cash":cex.get("cash"),"voucher":cex.get("voucher"),"stock":cex.get("stock"),"grade":cex.get("grade"),"matchQuality":cex.get("matchQuality"),"selectedByUser":cex.get("selectedByUser",False),"identity":identity,"detail":f"Matched: {cex.get('product')}. " + " · ".join(cparts)})
                    market_value = cex.get("retail")
                    method = "CeX UK retail is the identity-validated benchmark for the selected grade. RetroHQ then adjusts that benchmark for the actual item's known completeness. Cash and voucher trade-in are evidence only and are never used as market value."
                else:
                    evidence.append({"provider":"CeX UK","status":cex.get("status","Unavailable"),"detail":cex.get("detail",""),"variants":cex.get("variants",[])})
                    market_value = None
                    method = "Live PriceCharting reference loaded. CeX pricing is awaiting a grade choice where multiple catalogue records exist; uncertain evidence is excluded from UK Market Value."
            else:
                evidence.append({"provider":"PriceCharting","status":pc.get("status","Unavailable"),"detail":pc.get("detail","")})
                cex = cex_search(q, lookup.get("intent") or infer_intent(q), grade=cex_grade, selected_product_id=cex_id)
                if cex.get("ok"):
                    evidence.append({"provider":"CeX UK","status":"Live","currency":"GBP","product":cex.get("product"),"productId":cex.get("productId"),"retail":cex.get("retail"),"cash":cex.get("cash"),"voucher":cex.get("voucher"),"stock":cex.get("stock"),"grade":cex.get("grade"),"detail":f"Matched: {cex.get('product')}. CeX sells £{cex.get('sell'):.2f}" if cex.get("sell") is not None else f"Matched: {cex.get('product')}"})
                    market_value=None
                    method="CeX UK evidence loaded, but no single provider price is promoted to RetroHQ UK Market Value."
                else:
                    evidence.append({"provider":"CeX UK","status":cex.get("status","Unavailable"),"detail":cex.get("detail","")})
                    market_value=None
                    method = "No market value invented. Neither provider returned evidence that passed RetroHQ checks."
            self.send_json({"query":q,"barcode":barcode,"marketValue":market_value,"confidence":"uk-retail-benchmark" if market_value is not None else ("reference-only" if pc.get("ok") else "unavailable"),"evidence":evidence,"method":method,"lockedIdentity":identity,"pricechartingProductId":pc.get("id") if pc.get("ok") else None}); return
        if u.path == "/api/accessory-costs":
            p=parse_qs(u.query); platform=(p.get("platform") or [""])[0].strip(); colour=(p.get("colour") or [""])[0].strip()
            controller=cex_accessory_retail(platform,colour) if platform else {"ok":False,"status":"No platform","detail":"No platform supplied."}
            self.send_json({"platform":platform,"controller":controller,"cables":{"ok":False,"status":"Business allowance","detail":"Cable replacement uses the configurable RetroHQ business allowance until a reliable live component benchmark is connected."}}); return
        if u.path == "/api/ebay-search":
            p=parse_qs(u.query); q=(p.get("q") or [""])[0].strip()
            self.send_json(ebay_browse_search(q,12)); return
        if u.path == "/api/provider-status":
            self.send_json({"pricecharting": bool(os.environ.get("PRICECHARTING_API_TOKEN")),
                            "ebay": bool(os.environ.get("EBAY_CLIENT_ID") and os.environ.get("EBAY_CLIENT_SECRET")),
                            "ebayEnvironment":os.environ.get("EBAY_ENV","production"),
                            "cex": True}); return
        super().do_GET()

if __name__ == "__main__":
    port=int(os.environ.get("PORT","8006"))
    print(f"RetroHQ Test 8.3 — Sandbox Seller OAuth: http://localhost:{port}")
    print("PriceCharting token:", "loaded" if os.environ.get("PRICECHARTING_API_TOKEN") else "MISSING")
    print("eBay credentials:", "loaded" if os.environ.get("EBAY_CLIENT_ID") and os.environ.get("EBAY_CLIENT_SECRET") else "MISSING", "·", os.environ.get("EBAY_ENV","production"))
    ThreadingHTTPServer(("0.0.0.0",port),H).serve_forever()
