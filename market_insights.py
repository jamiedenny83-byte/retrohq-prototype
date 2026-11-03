"""Bounded current readings for the internal market watchlist, never invented history."""
from datetime import datetime, timezone
from copy import deepcopy
import re
import threading
import time
import math
import unicodedata

_cache = {}
_lock = threading.Lock()


def exact_candidate(query, candidates, platforms_for, words_for):
    """Auto-resolve only a unique full title/platform, with explicit region respected."""
    if not platforms_for or not words_for: return None
    platforms=platforms_for(query)
    if len(platforms)!=1: return None
    platform=next(iter(platforms))
    aliases={'PlayStation 2':r'(?:ps\s*2|play\s*station\s*2)','PlayStation 3':r'(?:ps\s*3|play\s*station\s*3)',
        'PlayStation 4':r'(?:ps\s*4|play\s*station\s*4)','PlayStation 5':r'(?:ps\s*5|play\s*station\s*5)',
        'Game Boy Advance':r'(?:game\s*boy\s*advance|gba)','Game Boy Color':r'(?:game\s*boy\s*colou?r|gbc)',
        'GameCube':r'game\s*cube','Nintendo 64':r'(?:nintendo\s*64|n\s*64)',
        'Xbox 360':r'xbox\s*360','Xbox One':r'xbox\s*one'}
    if platform not in aliases: return None
    wanted=re.sub(r'\b'+aliases[platform]+r'\b',' ',query,flags=re.I)
    wanted=re.sub(r'\b(?:pal|ntsc|uk|usa|us|japan|japanese)\b',' ',wanted,flags=re.I)
    def words(value):
        value=unicodedata.normalize('NFKD',str(value or '')).encode('ascii','ignore').decode()
        return [x for x in words_for(value) if x!='the']
    exact=[c for c in candidates if platforms_for(c['platform'])=={platform} and words(wanted)==words(c['title'])]
    if re.search(r'\b(?:pal|uk)\b',query,re.I): exact=[c for c in exact if re.search(r'\bpal\b',c['platform'],re.I)]
    elif not re.search(r'\b(?:ntsc|usa|us|japan|japanese)\b',query,re.I):
        pal=[c for c in exact if re.search(r'\bpal\b',c['platform'],re.I)]
        if pal: exact=pal
    else: return None  # Regional searches outside PAL need a deliberate edition choice.
    unique={c['id']:c for c in exact}
    return next(iter(unique.values())) if len(unique)==1 else None


def observation(query, product_id, grade, pc_call, pc_detail, browse, intent_for, allowed, products_url,
                platforms_for=None, words_for=None):
    query = str(query or '').strip()
    product_id = str(product_id or '').strip()
    if not 2 <= len(query) <= 180 or any(ord(c) < 32 for c in query):
        return {'ok': False, 'status': 'Enter a specific item and platform (2–180 characters).'}
    if grade not in ('loose', 'cib', 'new') or product_id and not re.fullmatch(r'\d{1,16}', product_id):
        return {'ok': False, 'status': 'Invalid catalogue identity or completeness.'}
    key = (query, product_id, grade)
    with _lock:
        cached = _cache.get(key)
        if cached and time.monotonic() - cached[0] < 21600:
            result = deepcopy(cached[1]); result['cached'] = True
            return result
    now = datetime.now(timezone.utc).isoformat()
    result = {'ok': True, 'checkedAt': now, 'query': query, 'grade': grade, 'candidates': [],
              'pricecharting': {'ok': False, 'status': 'Catalogue match needed'},
              'ebay': {'ok': False, 'status': 'Market access unavailable'}}
    intent = intent_for(query)
    automatic=False
    try:
        if not product_id:
            data=pc_call(products_url,{'q':query})
            if data.get('status')=='success':
                candidates=[{'id':str(x.get('id')),'title':x.get('product-name'),'platform':x.get('console-name')}
                    for x in data.get('products',[])[:100] if re.fullmatch(r'\d{1,16}',str(x.get('id','')))
                    and isinstance(x.get('product-name'),str) and isinstance(x.get('console-name'),str) and allowed(x,intent)]
                chosen=exact_candidate(query,candidates,platforms_for,words_for)
                if chosen: product_id=chosen['id'];automatic=True
                else:
                    result['candidates']=candidates[:6]
                    result['pricecharting']['status']='Choose the exact catalogue edition' if candidates else 'No catalogue match'
            else: result['pricecharting']['status']='PriceCharting access unavailable — check the API subscription/token'
        if product_id:
            pc = pc_detail(product_id=product_id)
            if pc.get('ok') and str(pc.get('id')) == product_id and allowed(
                    {'product-name': pc.get('product'), 'console-name': pc.get('console')}, intent) and (not automatic or
                    exact_candidate(query,[{'id':product_id,'title':pc.get('product'),'platform':pc.get('console')}],platforms_for,words_for)):
                value = pc.get('prices', {}).get(grade + '-price')
                try:
                    volume = int(pc.get('salesVolume'))
                    if volume < 0: volume = None
                except (TypeError, ValueError, OverflowError): volume = None
                result['pricecharting'] = {'ok': isinstance(value, (float, int)) and math.isfinite(value) and value >= 0, 'status': 'Live' if value is not None else 'Price unavailable',
                    'productId': product_id, 'title': pc.get('product'), 'platform': pc.get('console'),
                    'value': value, 'currency': 'USD', 'annualVolume': volume, 'checkedAt': now,'autoMatched':automatic}
            else:
                result['pricecharting']['status'] = 'Catalogue unavailable or identity mismatch'
    except Exception:
        result['pricecharting']['status'] = 'PriceCharting unavailable; previous readings retained'
    # A stable keyword/completeness cohort, explicitly NOT exact-item sold comparables.
    cohort = query + {'loose': ' loose', 'cib': ' complete boxed', 'new': ' sealed new'}[grade]
    try:
        ebay = browse(cohort, 20)
        if ebay.get('ok') and ebay.get('environment') == 'production':
            # Use only fixed-price GBP asks; auctions, bundles and condition variation
            # may still affect a keyword sample, so this is labelled a search index.
            values = [x['price'] for x in ebay.get('items', []) if x.get('currency') == 'GBP'
                      and isinstance(x.get('price'), (int, float)) and math.isfinite(x['price']) and x['price'] >= 0
                      and 'FIXED_PRICE' in x.get('buyingOptions', [])]
            from statistics import median
            result['ebay'] = {'ok': len(values) >= 5, 'status': 'Live asking-price sample' if len(values) >= 5 else 'Too few fixed-price GBP listings (need 5)',
                'value': round(median(values), 2) if len(values) >= 5 else None, 'currency': 'GBP',
                'count': len(values), 'query': cohort, 'checkedAt': now,
                'basis': 'Keyword search median asking price; excludes postage; not completed sales or an exact-item valuation'}
        else:
            result['ebay']['status'] = 'Production Browse access required' if ebay.get('environment') == 'sandbox' else ebay.get('status', 'Browse unavailable')
            result['ebay']['detail']=ebay.get('detail','')
    except Exception:
        result['ebay']['status'] = 'eBay unavailable; previous readings retained'
    # Cache successful provider responses, retaining their ORIGINAL observation time.
    if result['pricecharting'].get('ok') or result['ebay'].get('ok') or result['candidates']:
        with _lock:
            if len(_cache) >= 100: _cache.pop(next(iter(_cache)))
            _cache[key] = (time.monotonic(), deepcopy(result))
    return result
