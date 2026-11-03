"""Official category market feeds, independent of owned stock and watchlists."""
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.parse import urlencode, quote
from urllib.error import HTTPError
import json
import math
import re
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

def safe_listing_url(value):
    return value if isinstance(value,str) and re.fullmatch(r'https://(?:www\.)?ebay\.co\.uk/itm/[a-zA-Z0-9/?&=._%+|\-]+',value) else None

def read(path,params,token_fn,scope=BASE_SCOPE):
    auth=token_fn(scope)
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
    high=read('/buy/browse/v1/item_summary/search',{'category_ids':cid,'sort':'-price','limit':20,
        'filter':'itemLocationCountry:GB,priceCurrency:GBP,buyingOptions:{FIXED_PRICE}'},token_fn)
    if high.get('ok'):
        items=[];seen=set()
        for x in high['data'].get('itemSummaries',[]):
            p=x.get('price') or {};v=amount(p.get('value'));id=str(x.get('itemId',''));url=safe_listing_url(x.get('itemWebUrl'))
            if p.get('currency')!='GBP' or v is None or not id or id in seen or not url or 'FIXED_PRICE' not in x.get('buyingOptions',[]):continue
            seen.add(id);items.append({'id':id,'title':str(x.get('title','Listing'))[:250],'value':v,'currency':'GBP','url':url,'condition':str(x.get('condition','Not supplied'))[:100]})
        high={'ok':True,'checkedAt':now,'status':'Highest UK asking prices','items':sorted(items,key=lambda x:x['value'],reverse=True)[:10],
              'basis':'Highest fixed-price asking listings returned for this category, excluding postage. Not sold prices, appraisals or guaranteed value; bundles/graded items may be included.'}
    result={'ok':True,'category':category,'label':label,'categoryId':cid,'marketplace':'EBAY_GB','checkedAt':now,'best':best,'high':high}
    if best.get('ok') and high.get('ok'):
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
    title=text(d.get('title'));url=safe_listing_url(d.get('itemWebUrl'))
    if not title or not url:return {'ok':False,'status':'No usable product identity in this listing.'}
    try: barcode=normalize_barcode(aspects.get('ean') or aspects.get('upc'))
    except ValueError: barcode=''
    return {'ok':True,'itemId':item_id,'title':title,'platform':text(aspects.get('model') or aspects.get('mpn')),
        'manufacturer':text(aspects.get('brand') or aspects.get('manufacturer')),'barcode':barcode,
        'url':url,'checkedAt':datetime.now(timezone.utc).isoformat(),'source':'eBay active listing — physical identity needs confirmation'}
