"""Bounded, cached public listing metadata. Never return seller/buyer identities."""
from html.parser import HTMLParser
import time
import xml.etree.ElementTree as ET

_cache={}
_attempted={}
LIMIT=20

class _Plain(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.parts=[];self.hidden=0
    def handle_starttag(self,tag,attrs):
        if tag in ('script','style'):self.hidden+=1
        elif tag in ('br','p','div','li'):self.parts.append(' ')
    def handle_endtag(self,tag):
        if tag in ('script','style'):self.hidden=max(0,self.hidden-1)
    def handle_data(self,data):
        if not self.hidden:self.parts.append(data)

def plain(value,limit=4000):
    p=_Plain();p.feed(str(value or ''));return ' '.join(' '.join(p.parts).split())[:limit]

def parse(xml,item_id):
    ns={'e':'urn:ebay:apis:eBLBaseComponents'};root=ET.fromstring(xml)
    if root.findtext('e:Ack',namespaces=ns) not in ('Success','Warning'):raise ValueError('Listing details unavailable')
    item=root.find('e:Item',ns)
    if item is None or item.findtext('e:ItemID',namespaces=ns)!=item_id:raise ValueError('Listing detail identity mismatch')
    def text(path,default=''):return item.findtext(path,default,namespaces=ns)
    def specifics(node,path):
        return [{'name':str(x.findtext('e:Name','',namespaces=ns))[:80],'values':[str(v.text or '')[:256] for v in x.findall('e:Value',ns)[:8]]} for x in node.findall(path,ns)[:75]]
    attrs=specifics(item,'e:ItemSpecifics/e:NameValueList')
    brand=next((x['values'][0] for x in attrs if x['name'].lower() in ('brand','manufacturer') and x['values']),text('e:ProductListingDetails/e:BrandMPN/e:Brand'))
    urls=[str(x.text or '')[:1024] for x in item.findall('e:PictureDetails/e:PictureURL',ns)[:24]]
    if not urls and text('e:PictureDetails/e:GalleryURL'):urls=[text('e:PictureDetails/e:GalleryURL')[:1024]]
    variations=[{'sku':str(v.findtext('e:SKU','',namespaces=ns)),'specifics':specifics(v,'e:VariationSpecifics/e:NameValueList'),'ean':v.findtext('e:VariationProductListingDetails/e:EAN','',namespaces=ns),'upc':v.findtext('e:VariationProductListingDetails/e:UPC','',namespaces=ns)} for v in item.findall('e:Variations/e:Variation',ns)]
    return {'listingId':item_id,'subtitle':text('e:SubTitle')[:180],'categoryId':text('e:PrimaryCategory/e:CategoryID'),'categoryName':text('e:PrimaryCategory/e:CategoryName')[:512],
            'conditionId':text('e:ConditionID'),'conditionName':text('e:ConditionDisplayName')[:128],'conditionDescription':plain(text('e:ConditionDescription'),1600),
            'description':plain(text('e:Description')),'images':urls,'specifics':attrs,'brand':brand[:128],'ean':text('e:ProductListingDetails/e:EAN')[:32],
            'upc':text('e:ProductListingDetails/e:UPC')[:32],'mpn':text('e:ProductListingDetails/e:BrandMPN/e:MPN')[:128],'productId':text('e:ProductListingDetails/e:ProductReferenceID')[:64],
            'listingType':text('e:ListingType')[:64],'variations':variations,
            'dispatchDays':text('e:DispatchTimeMax')[:16],
            'shippingServices':[{'service':str(v.findtext('e:ShippingService','',namespaces=ns))[:128],'charge':str(v.findtext('e:ShippingServiceCost','',namespaces=ns))[:32],'currency':v.find('e:ShippingServiceCost',ns).get('currencyID','') if v.find('e:ShippingServiceCost',ns) is not None else ''} for v in item.findall('e:ShippingDetails/e:ShippingServiceOptions',ns)[:10]],
            'returns':{key:text('e:ReturnPolicy/e:'+key)[:128] for key in ('ReturnsAcceptedOption','ReturnsWithinOption','RefundOption','ShippingCostPaidByOption')}}

def enrich(rows,read,now=None):
    now=time.time() if now is None else now
    ids=list(dict.fromkeys(x['listingId'] for x in rows if str(x.get('listingId','')).isdigit()))
    # New/unattempted IDs precede cached refreshes; one failing listing cannot
    # starve the remainder. A later sync resumes the bounded batch.
    pending=[i for i in ids if i not in _cache or now-_cache[i]['at']>3600]
    pending.sort(key=lambda i:(_attempted.get(i,float('-inf')),i))
    deadline=time.monotonic()+10
    for item_id in pending[:LIMIT]:
        if time.monotonic()>deadline:break
        _attempted[item_id]=now
        try:_cache[item_id]={'at':now,'details':parse(read(item_id),item_id)}
        except Exception:pass  # Optional metadata failure must not discard stock/order evidence.
    while len(_cache)>5000:_cache.pop(next(iter(_cache)))
    for row in rows:
        entry=_cache.get(row.get('listingId'))
        if not entry:row['detailsStatus']='Pending / unavailable';continue
        detail=entry['details'];row['details']={k:v for k,v in detail.items() if k!='variations'}
        variation=next((x for x in detail['variations'] if x['sku']==row.get('sku') and x['sku']),None)
        if variation:row['details']={**row['details'],'variationSpecifics':variation['specifics'],'ean':variation['ean'] or detail['ean'],'upc':variation['upc'] or detail['upc']}
        row['detailsStatus']='Loaded';row['detailsCheckedAt']=entry['at']
    return sum(i not in _cache for i in ids)
