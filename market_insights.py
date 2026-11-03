"""Bounded current readings for the internal market watchlist, never invented history."""
from datetime import datetime, timezone
from copy import deepcopy
import re
import threading
import time
import math

_cache = {}
_lock = threading.Lock()


def observation(query, product_id, grade, pc_call, pc_detail, browse, intent_for, allowed, products_url):
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
    try:
        if product_id:
            pc = pc_detail(product_id=product_id)
            if pc.get('ok') and str(pc.get('id')) == product_id and allowed(
                    {'product-name': pc.get('product'), 'console-name': pc.get('console')}, intent):
                value = pc.get('prices', {}).get(grade + '-price')
                try:
                    volume = int(pc.get('salesVolume'))
                    if volume < 0: volume = None
                except (TypeError, ValueError, OverflowError): volume = None
                result['pricecharting'] = {'ok': isinstance(value, (float, int)) and math.isfinite(value) and value >= 0, 'status': 'Live' if value is not None else 'Price unavailable',
                    'productId': product_id, 'title': pc.get('product'), 'platform': pc.get('console'),
                    'value': value, 'currency': 'USD', 'annualVolume': volume, 'checkedAt': now}
            else:
                result['pricecharting']['status'] = 'Catalogue unavailable or identity mismatch'
        else:
            data = pc_call(products_url, {'q': query})
            if data.get('status') == 'success':
                result['candidates'] = [{'id': str(x.get('id')), 'title': x.get('product-name'), 'platform': x.get('console-name')}
                    for x in data.get('products', []) if re.fullmatch(r'\d{1,16}', str(x.get('id', ''))) and allowed(x, intent)][:6]
                result['pricecharting']['status'] = 'Choose the exact catalogue edition' if result['candidates'] else 'No catalogue match'
            else:
                result['pricecharting']['status'] = 'PriceCharting access unavailable — check the API subscription/token'
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
    except Exception:
        result['ebay']['status'] = 'eBay unavailable; previous readings retained'
    # Cache successful provider responses, retaining their ORIGINAL observation time.
    if result['pricecharting'].get('ok') or result['ebay'].get('ok') or result['candidates']:
        with _lock:
            if len(_cache) >= 100: _cache.pop(next(iter(_cache)))
            _cache[key] = (time.monotonic(), deepcopy(result))
    return result
