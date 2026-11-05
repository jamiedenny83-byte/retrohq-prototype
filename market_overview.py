"""Official category market feeds, independent of owned stock and watchlists."""
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.parse import urlencode, quote, urlparse, parse_qs
from urllib.error import HTTPError
import json
import math
import re
import statistics
import threading
import time
from copy import deepcopy
from item_identification import normalize_barcode

CATEGORIES={'games':('Video games','139973'),'consoles':('Consoles','139971'),
            'toys':('Toys & games','220')}
BASE_SCOPE='https://api.ebay.com/oauth/api_scope'
MARKETING_SCOPE=BASE_SCOPE+'/buy.marketing'
_cache={}
_lock=threading.Lock()

def amount(value):
    try:
        n=float(value)
        return round(n,2) if math.isfinite(n) and n>=0 else None
    except (ValueError,TypeError): return None

def safe_listing_url(value, item_id=None):
    """Validate the upstream item link, then strip tracking and canonicalise to UK."""
    if not isinstance(value,str) or len(value)>8192 or re.search(r'\s|[\x00-\x1f\x7f]',value):return None
    try:
        u=urlparse(value)
        if u.scheme!='https' or u.hostname not in ('ebay.co.uk','www.ebay.co.uk','m.ebay.co.uk','ebay.com','www.ebay.com','m.ebay.com'):return None
        if u.username is not None or u.password is not None or u.port not in (None,443):return None
        match=re.fullmatch(r'/itm/(?:[^/]+/)?(\d{6,20})/?',u.path)
        if not match:return None
        legacy=match.group(1);variation=None
        if item_id is not None:
            identity=re.fullmatch(r'v1\|(\d{6,20})\|(\d{1,20})',str(item_id))
            if not identity or identity.group(1)!=legacy:return None
            variation=identity.group(2)
        else:
            v=(parse_qs(u.query).get('var') or [''])[0]
            if re.fullmatch(r'\d{1,20}',v):variation=v
        return 'https://www.ebay.co.uk/itm/'+legacy+('?var='+variation if variation and int(variation)!=0 else '')
    except ValueError:return None

def identity_search(query,browse):
    """Read-only suggestions, with one broader retry only after a genuine zero."""
    attempts=[];searched=query
    tokens=re.findall(r'[\w]+',query)
    broader=' '.join(tokens[:2]) if len(tokens)>2 else None
    while True:
        d=browse(searched,12)
        if not d.get('ok') or d.get('environment')!='production':
            return {'ok':False,'status':d.get('status','Production eBay search unavailable'),
                'detail':d.get('detail','Live UK access is needed for item suggestions.')}
        items=d.get('items') or []
        attempts.append({'query':searched,'returned':len(items)})
        if items or len(attempts)==2 or not broader or broader.casefold()==query.casefold():break
        searched=broader
    candidates=[];filtered={'ids':0,'links':0}
    for x in items:
        identity=str(x.get('itemId',''))
        if not re.fullmatch(r'v1\|\d{6,20}\|\d{1,20}',identity):filtered['ids']+=1;continue
        url=safe_listing_url(x.get('itemWebUrl'),identity)
        if not url:filtered['links']+=1;continue
        candidates.append({'id':identity,'title':str(x.get('title','Item'))[:250],
            'condition':str(x.get('condition','Not supplied'))[:100],
            'asking':amount(x.get('price')) if x.get('currency')=='GBP' else None,'url':url})
    return {'ok':True,'source':'eBay UK active listings','candidates':candidates,'returned':len(items),
        'total':d.get('total'),'filtered':filtered,'query':query,'searchedQuery':searched,
        'broadened':len(attempts)>1,'attempts':attempts,
        'note':'Identification suggestions, not verified catalogue records or sold values. Check the physical item.'}

def read(path,params,token_fn,scope=BASE_SCOPE):
    auth=token_fn(scope)
    if not auth.get('ok') and scope==MARKETING_SCOPE and auth.get('status')=='eBay market authentication HTTP 400':
        return {'ok':False,'status':'eBay UK best-sellers access unavailable',
                'detail':'eBay rejected the Buy Marketing token request (HTTP 400). Check Buy Marketing production access for this application in the eBay developer portal.'}
    if not auth.get('ok'): return {'ok':False,'status':auth.get('status','Application access unavailable'),
        'detail':auth.get('detail','')+(' Best-selling products require the buy.marketing application scope and production approval; seller consent is unchanged.' if scope==MARKETING_SCOPE else '')}
    if auth.get('environment')!='production':return {'ok':False,'status':'Production market access required','detail':'Sandbox data cannot represent the live UK market.'}
    req=Request('https://api.ebay.com'+path+('?' + urlencode(params) if params else ''),headers={
        'Authorization':'Bearer '+auth['token'],'X-EBAY-C-MARKETPLACE-ID':'EBAY_GB','Accept':'application/json'})
    try:
        with urlopen(req,timeout=15) as r:
            raw=r.read(4_000_001)
        if len(raw)>4_000_000: return {'ok':False,'status':'Market response too large'}
        result=json.loads(raw.decode('utf-8'))
        return {'ok':True,'data':result}
    except HTTPError as e:
        return {'ok':False,'status':f'eBay market HTTP {e.code}',
            'detail':('The best-selling feed needs production Buy Marketing access and the buy.marketing application scope. Existing seller imports do not grant this access.' if scope==MARKETING_SCOPE else 'Check production Browse application access. Seller imports are a separate connection.')}
    except Exception:return {'ok':False,'status':'Market feed unavailable','detail':'Previous successful readings are retained. Try again later.'}

def overview(category,token_fn):
    if category not in CATEGORIES:return {'ok':False,'status':'Choose a supported market category.'}
    with _lock:
        cached=_cache.get(category)
        if cached and time.monotonic()-cached[0]<3600:return deepcopy(cached[1])
    label,cid=CATEGORIES[category];now=datetime.now(timezone.utc).isoformat()
    best=read('/buy/marketing/v1_beta/merchandised_product',{'category_id':cid,'metric_name':'BEST_SELLING','limit':10},token_fn,MARKETING_SCOPE)
    if best.get('ok'):
        products=[];seen=set()
        for x in best['data'].get('merchandisedProducts',[])[:100]:
            epid=str(x.get('epid',''))
            if not re.fullmatch(r'\d{1,30}',epid) or epid in seen:continue
            seen.add(epid);prices=[]
            for p in x.get('marketPriceDetails',[]) or []:
                a=p.get('estimatedStartPrice') or {};v=amount(a.get('value'))
                if a.get('currency')=='GBP' and v is not None: prices.append({'value':v,'condition':str(p.get('conditionGroup','Not specified'))[:100]})
            products.append({'epid':epid,'title':str(x.get('title','Product'))[:250],'prices':prices[:8]})
        best={'ok':True,'checkedAt':now,'status':'eBay UK best-selling products','products':products[:10],
              'basis':'Provider best-selling category order. Sales quantities and ranking period are not supplied; ratings/reviews are not sales.'}
    active=read('/buy/browse/v1/item_summary/search',{'category_ids':cid,'limit':50,
        'filter':'itemLocationCountry:GB,deliveryCountry:GB,buyingOptions:{FIXED_PRICE}'},token_fn)
    if active.get('ok'):
        prices={}
        listings=[]
        for item in active['data'].get('itemSummaries',[])[:50]:
            price=item.get('price') or {}
            value=amount(price.get('value'))
            identity=re.fullmatch(r'v1\|([0-9]{6,20})\|[0-9]{1,20}',str(item.get('itemId','')))
            if identity and price.get('currency')=='GBP' and value and 'FIXED_PRICE' in item.get('buyingOptions',[]):
                listing_id=identity.group(1)
                if listing_id in prices:
                    continue
                prices[listing_id]=value
                url=safe_listing_url(item.get('itemWebUrl'),item.get('itemId'))
                if url and len(listings)<10:
                    listings.append({'title':str(item.get('title') or 'Listing')[:250],
                                     'condition':str(item.get('condition') or '')[:100],
                                     'url':url,'value':value})
        values=sorted(prices.values())
        active={'ok':True,'checkedAt':now,'count':len(values),'currency':'GBP','median':None,'lower':None,'upper':None,'listings':listings}
        if len(values)>=8:
            middle=len(values)//2
            active.update(median=round(statistics.median(values),2),
                          lower=round(statistics.median(values[:middle]),2),
                          upper=round(statistics.median(values[-middle:]),2))
    result={'ok':True,'category':category,'label':label,'categoryId':cid,'marketplace':'EBAY_GB','checkedAt':now,'best':best,'active':active}
    if best.get('ok') and active.get('ok'):
        with _lock:_cache[category]=(time.monotonic(),deepcopy(result))
    return result

def identity_detail(item_id,token_fn):
    if not re.fullmatch(r'v1\|\d{6,20}\|\d{1,20}',str(item_id or '')):return {'ok':False,'status':'Choose an eBay search result first.'}
    result=read('/buy/browse/v1/item/'+quote(item_id,safe=''),{},token_fn)
    if not result.get('ok'):return result
    d=result['data'];aspects={}
    if d.get('itemId')!=item_id:return {'ok':False,'status':'The returned listing identity changed. Search again.'}
    for a in (d.get('localizedAspects') or [])[:100]:
        name=str(a.get('name','')).lower();value=a.get('value')
        if isinstance(value,str) and value.strip().lower() not in ('does not apply','unbranded','unknown','n/a'):aspects[name]=value.strip()[:180]
    text=lambda v:re.sub(r'[<>"`\x00-\x1f]','',str(v or ''))[:180]
    title=text(d.get('title'));url=safe_listing_url(d.get('itemWebUrl'),item_id)
    if not title or not url:return {'ok':False,'status':'No usable product identity in this listing.'}
    try: barcode=normalize_barcode(aspects.get('ean') or aspects.get('upc'))
    except ValueError: barcode=''
    return {'ok':True,'itemId':item_id,'title':title,'platform':text(aspects.get('model') or aspects.get('mpn')),
        'manufacturer':text(aspects.get('brand') or aspects.get('manufacturer')),'barcode':barcode,
        'url':url,'checkedAt':datetime.now(timezone.utc).isoformat(),'source':'eBay active listing — physical identity needs confirmation'}
