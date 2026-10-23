/* Production mirror. All changes are cloned and must be saved atomically by the caller. */
(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const key=l=>JSON.stringify(['ebay','production',l.orderId,l.lineItemId]);
const available=i=>!i.sale&&!['Sold','Packaged','Dispatched','Delivered','Completed'].includes(i.status);
const identity=l=>obj(l)&&typeof l.orderId==='string'&&/^[a-zA-Z0-9._:-]+$/.test(l.orderId)&&typeof l.lineItemId==='string'&&/^[a-zA-Z0-9._:-]+$/.test(l.lineItemId);
const valid=l=>identity(l)&&l.eligible===true&&l.paymentStatus==='PAID'&&['NONE','NOT_REQUESTED'].includes(l.cancelState)&&l.refundDetected===false&&l.currency==='GBP'&&Number.isSafeInteger(l.quantity)&&l.quantity>0&&Number.isFinite(l.price)&&l.price>=0&&/^\d{4}-\d{2}-\d{2}$/.test(l.date)&&typeof l.listingId==='string'&&typeof l.sku==='string';
const listingKey=l=>JSON.stringify([l.listingId,l.sku||'']);
const changed=(a,b)=>!valid(a)||['price','quantity','sku','listingId','orderFee','orderShipping','date'].some(k=>a[k]!==b[k]);
function check(state){
 if(!obj(state)||!Array.isArray(state.items))throw Error('Invalid physical stock.');
 const live=state.liveEbay,seen=new Set(),allocated=new Set();
 if(live!=null){
  if(!obj(live)||!['listings','orders','ledger'].every(k=>Array.isArray(live[k])))throw Error('Invalid production history.');
  validateListings(live.listings);validateOrders(live.orders);
  for(const r of live.ledger){
   if(!obj(r)||(r.latest&&(!identity(r.latest)||key(r.latest)!==r.key))||!valid(r.imported)||r.key!==key(r.imported)||seen.has(r.key)||!Array.isArray(r.itemIds)||!r.itemIds.length||r.itemIds.length!==r.imported.quantity||new Set(r.itemIds).size!==r.itemIds.length||!['returned',undefined].includes(r.outcome))throw Error('Invalid live order allocation.');
   seen.add(r.key);let allocatedCents=0;
   for(const id of r.itemIds){const i=state.items.find(i=>i.id===id);if(!i)throw Error('Live order refers to missing stock.');
    if(r.outcome==='returned'){const history=i.saleHistory?.find(s=>s.productionKey===r.key&&s.outcome==='Returned');if(!history)throw Error('Live return history is missing.');allocatedCents+=Math.round(history.price*100);}
    else{if(allocated.has(id)||i.sale?.productionKey!==r.key)throw Error('Live ledger and stock disagree.');allocated.add(id);allocatedCents+=Math.round(i.sale.price*100);}
   }
   if(allocatedCents!==Math.round(r.imported.price*100))throw Error('Live revenue allocation does not agree.');
  }
 }
 for(const i of state.items)if(i.sale?.productionKey&&(!live||!live.ledger.some(r=>r.key===i.sale.productionKey&&!r.outcome&&r.itemIds.includes(i.id))))throw Error('Live sale lacks duplicate protection.');
 return state;
}
function validateListings(rows){
 const seen=new Set();for(const l of rows){if(!obj(l)||!/^\d+$/.test(l.listingId)||typeof l.sku!=='string'||typeof l.title!=='string'||seen.has(listingKey(l))||!(l.quantity===null||Number.isSafeInteger(l.quantity)&&l.quantity>=0)||!(l.price===null||Number.isFinite(l.price)&&l.price>=0))throw Error('Invalid or ambiguous listing snapshot.');seen.add(listingKey(l));}
}
function validateOrders(rows){
 const seen=new Set();for(const l of rows){if(!identity(l)||seen.has(key(l))||typeof l.sku!=='string'||typeof l.listingId!=='string'||!Number.isSafeInteger(l.quantity)||l.quantity<0||!(l.price===null||typeof l.price==='number'&&Number.isFinite(l.price)&&l.price>=0)||typeof l.date!=='string'||typeof l.refundDetected!=='boolean')throw Error('Invalid or repeated production order.');seen.add(key(l));}
}
function snapshotValid(s){
 if(!obj(s)||s.environment!=='production'||s.ok!==true||!Array.isArray(s.listings)||!Array.isArray(s.orders)||!Number.isFinite(Date.parse(s.checkedAt)))throw Error('Invalid production snapshot.');
 validateListings(s.listings);validateOrders(s.orders);
}

function allocate(next,l,ids){
 if(!valid(l)||!ids.length||ids.length!==l.quantity||new Set(ids).size!==ids.length)throw Error('Select exactly the paid order quantity.');
 const live=next.liveEbay,id=key(l);if(live.ledger.some(r=>r.key===id))throw Error('Order already imported.');
 const units=ids.map(id=>next.items.find(i=>i.id===id));
 if(units.some(i=>!i||!available(i)||(i.liveListingId&&(i.liveListingId!==l.listingId||(i.liveSku||'')!==l.sku))))throw Error('Stock is unavailable or linked to another listing / variation.');
 const cents=Math.round(l.price*100),base=Math.floor(cents/units.length);
 for(const [n,i]of units.entries()){
  i.liveListingId=l.listingId;i.liveSku=l.sku;
  i.sale={channel:'eBay Live',productionKey:id,price:(base+(n<cents%units.length?1:0))/100,date:l.date,feeType:'fixed',feeValue:l.quantity===1&&l.orderLineCount===1?l.orderFee:null,shipping:null,packaging:null,promotion:null,shippingRevenue:l.quantity===1&&l.orderLineCount===1?l.orderShipping:null,costsConfirmed:false,status:l.fulfillmentStatus==='FULFILLED'?'Dispatched':'Ready to dispatch'};
  i.status=l.fulfillmentStatus==='FULFILLED'?'Dispatched':'Sold';(i.timeline||(i.timeline=[])).push(['eBay Live sale',live.checkedAt+' · exact stock allocation · '+l.orderId]);
 }
 live.ledger.push({key:id,imported:copy(l),latest:copy(l),itemIds:ids.slice(),review:false});
}
function reconcile(state,snapshot){
 check(state);snapshotValid(snapshot);const next=copy(state),live=next.liveEbay||(next.liveEbay={listings:[],orders:[],ledger:[]});
 Object.assign(live,{listings:copy(snapshot.listings),orders:copy(snapshot.orders),checkedAt:snapshot.checkedAt,partial:!!(snapshot.listingTruncated||snapshot.orderTruncated),note:snapshot.note||''});
 for(const i of next.items){if(!i.liveListingId)continue;const matches=live.listings.filter(l=>l.listingId===i.liveListingId&&l.sku===(i.liveSku||''));i.liveSnapshot=matches.length===1?{...matches[0],checkedAt:live.checkedAt}:{status:live.partial?'Partial sync — check eBay':'Not in active snapshot — verify on eBay',checkedAt:live.checkedAt};}
 for(const l of live.orders){const id=key(l),row=live.ledger.find(r=>r.key===id);
  if(row){row.latest=copy(l);if(row.outcome)continue;if(changed(l,row.imported)){row.review=true;for(const i of next.items.filter(i=>row.itemIds.includes(i.id)))i.sale.reviewNeeded=true;}
   else if(l.fulfillmentStatus==='FULFILLED')for(const i of next.items.filter(i=>row.itemIds.includes(i.id)))if(['Sold','Packaged'].includes(i.status)){i.status='Dispatched';i.sale.status='Dispatched';}
   continue;
  }
  if(!valid(l)||live.partial||!l.listingId)continue;
  const units=next.items.filter(i=>available(i)&&i.liveListingId===l.listingId&&(i.liveSku||'')===l.sku);
  // A variation without SKU is never automatically allocated.
  if(!l.sku&&live.listings.some(x=>x.listingId===l.listingId&&x.sku))continue;
  if(units.length===l.quantity)allocate(next,l,units.map(i=>i.id));
 }
 return check(next);
}
function link(state,listingId,sku,ids){check(state);const next=copy(state),matches=next.liveEbay?.listings.filter(l=>l.listingId===listingId&&l.sku===sku)||[];if(matches.length!==1)throw Error('Refresh the exact listing / variation first.');if(!ids.length||new Set(ids).size!==ids.length)throw Error('Select physical stock.');
 for(const id of ids){const i=next.items.find(i=>i.id===id);if(!i||!available(i))throw Error('Only available stock can be linked.');if(i.liveListingId&&(i.liveListingId!==listingId||(i.liveSku||'')!==sku))throw Error('Unlink the old listing / variation first.');i.liveListingId=listingId;i.liveSku=sku;(i.timeline||(i.timeline=[])).push(['eBay Live linked',new Date().toISOString()+' · listing '+listingId]);}return next;
}
function unlink(state,id){check(state);const next=copy(state),i=next.items.find(i=>i.id===id);if(!i||!available(i))throw Error('Only available stock can be unlinked.');delete i.liveListingId;delete i.liveSku;delete i.liveSnapshot;i.timeline.push(['eBay Live unlinked',new Date().toISOString()]);return next;}
function apply(state,orderKey,ids){check(state);const next=copy(state),l=next.liveEbay?.orders.find(l=>key(l)===orderKey);if(!l)throw Error('Refresh this order first.');allocate(next,l,ids);return check(next);}
function acceptChange(state,orderKey){check(state);const next=copy(state),r=next.liveEbay?.ledger.find(r=>r.key===orderKey);if(!r||r.outcome||!valid(r.latest)||['quantity','sku','listingId'].some(k=>r.latest[k]!==r.imported[k]))throw Error('Quantity, identity, refund or cancellation changes require Seller Hub review.');
 const cents=Math.round(r.latest.price*100);for(const [n,id]of r.itemIds.entries()){const i=next.items.find(i=>i.id===id);(i.saleCostHistory||(i.saleCostHistory=[])).push({date:new Date().toISOString(),before:copy(i.sale)});Object.assign(i.sale,{price:(Math.floor(cents/r.itemIds.length)+(n<cents%r.itemIds.length?1:0))/100,date:r.latest.date,feeValue:r.itemIds.length===1&&r.latest.orderLineCount===1?r.latest.orderFee:null,shippingRevenue:r.itemIds.length===1&&r.latest.orderLineCount===1?r.latest.orderShipping:null,reviewNeeded:false,costsConfirmed:false});}r.imported=copy(r.latest);r.review=false;return check(next);
}
function restore(state,orderKey){check(state);const next=copy(state),r=next.liveEbay?.ledger.find(r=>r.key===orderKey);if(!r||r.outcome||!r.review)throw Error('Only a reviewed imported order can be physically returned.');for(const id of r.itemIds){const i=next.items.find(i=>i.id===id);(i.saleHistory||(i.saleHistory=[])).push({...copy(i.sale),outcome:'Returned',returnDate:new Date().toISOString()});i.sale=null;i.listing=null;i.status='Needs repair';i.needsValuation=true;delete i.liveListingId;delete i.liveSku;delete i.liveSnapshot;i.timeline.push(['eBay Live physical return',new Date().toISOString()+' · inspect and reconcile refund before resale']);}r.outcome='returned';return check(next);}
const api={key,valid,available,check,reconcile,link,unlink,apply,acceptChange,restore};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetroLive=api;
})(typeof globalThis!=='undefined'?globalThis:this);
