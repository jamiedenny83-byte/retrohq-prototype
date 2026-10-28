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
 for(const t of state.transactions||[])if(t.source==='ebay-production'){
  const r=live?.ledger.find(r=>r.key===t.productionKey);
  if(!r||r.localTransactionId||t.id!=='ebay-production:'+r.imported.orderId+':'+r.imported.lineItemId||t.total!==cents(r.imported.price)||t.lines.length!==r.itemIds.length||t.lines.some(l=>!r.itemIds.includes(l.id))||t.outcome!==(r.outcome||null))throw Error('Imported receipt and order history disagree.');
 }
 for(const r of live?.ledger||[]){const units=r.itemIds.map(id=>state.items.find(i=>i.id===id));for(const i of units)if(!r.outcome&&i.sale.transactionId&&!state.transactions?.some(t=>t.id===i.sale.transactionId&&t.lines.some(l=>l.id===i.id)))throw Error('Imported sale lacks its receipt.');}
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
// Inventory is the shared foundation. The connector supplies events; no billing or
// marketplace writes are involved. A record represents one physical unit.
const pair=(i,l)=>i.liveListingId===l.listingId&&(i.liveSku||'')===l.sku;
const cents=n=>Math.round(n*100);
const plain=s=>String(s||'').replace(/[<>"`\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,180);
function importUnit(next,l,origin){
 if(++next.liveEbay.createdThisSync>2000)throw Error('More than 2,000 new units in one sync. No changes saved; review the listing quantities first.');
 const id=Math.max(0,...next.items.map(i=>i.id))+1;
 if(!Number.isSafeInteger(id))throw Error('Inventory identifiers are exhausted.');
 const i={id,title:plain(l.title)||'eBay item '+l.listingId,manufacturer:'',category:'Uncategorised',source:'eBay import',importedFrom:'ebay-production',importOrigin:origin,importedAt:next.liveEbay.checkedAt,buy:null,processingCosts:null,baseMarket:null,needsValuation:true,needsIdentification:true,condition:'Unknown',acquiredCondition:'Unknown',status:'Listed',location:'Unassigned',area:'',shelf:'',notes:'',photos:0,velocity:0,liveListingId:l.listingId,liveSku:l.sku,listing:{channel:'eBay Live',price:l.currency==='GBP'?l.price:null,date:(l.startDate||'').slice(0,10)},sale:null,timeline:[['Imported from eBay',next.liveEbay.checkedAt+' · listing '+l.listingId+' · purchase and preparation costs unknown']]};
 next.items.push(i);return i;
}
function receipt(next,row){
 const units=row.itemIds.map(id=>next.items.find(i=>i.id===id));
 // An exact already-recorded local checkout keeps its original receipt.
 if(row.localTransactionId){
  const t=next.transactions?.find(t=>t.id===row.localTransactionId);if(!t)throw Error('Original local receipt is missing.');
  let correction=false;const before=copy(t);
  for(const i of units){const l=t.lines.find(l=>l.id===i.id);if(!l)throw Error('Original receipt allocation is missing.');const price=cents(row.outcome?i.saleHistory.find(s=>s.productionKey===row.key).price:i.sale.price);if(l.price!==price){l.price=price;l.listedPrice=price+l.discount;correction=true;}}
  if(correction){(t.corrections||(t.corrections=[])).push({date:next.liveEbay.checkedAt,total:before.total,lines:before.lines});t.subtotal=t.lines.reduce((n,l)=>n+l.listedPrice,0);t.total=t.lines.reduce((n,l)=>n+l.price,0);if(t.total<t.credit)throw Error('Revenue correction requires trade-credit reconciliation.');t.due=t.total-t.credit;}
  t.review=next.liveEbay.ledger.some(r=>r.localTransactionId===t.id&&r.review&&!r.outcome);t.outcome=next.liveEbay.ledger.some(r=>r.localTransactionId===t.id&&r.outcome)?'returned':null;
  return;
 }
 const id='ebay-production:'+row.imported.orderId+':'+row.imported.lineItemId;
 const price=cents(row.imported.price),base=Math.floor(price/units.length);
 const knownFee=units.length===1&&row.imported.orderLineCount===1&&Number.isFinite(row.imported.orderFee);
 const fee=knownFee?cents(row.imported.orderFee):null;
 const t={id,source:'ebay-production',productionKey:row.key,date:row.imported.date,channel:'eBay Live',customerId:null,currency:'GBP',amountUnit:'pence',subtotal:price,discount:0,total:price,fee,credit:0,due:price,outcome:row.outcome||null,review:!!row.review,
  lines:units.map((i,n)=>({id:i.id,listedPrice:base+(n<price%units.length?1:0),discount:0,price:base+(n<price%units.length?1:0),fee:knownFee?fee:null,credit:0}))};
 next.transactions=next.transactions||[];
 const index=next.transactions.findIndex(x=>x.id===id);
 if(index>=0&&next.transactions[index].productionKey!==row.key)throw Error('Transaction identity conflict.');
 if(index>=0)next.transactions[index]=t;else next.transactions.push(t);
 if(!row.outcome)for(const i of units)i.sale.transactionId=id;
}
function recordedSale(next,l){
 const candidates=next.items.filter(i=>pair(i,l)&&i.sale&&!i.sale.productionKey&&!i.sale.externalKey&&['eBay','eBay Live'].includes(i.sale.channel));
 const exact=candidates.filter(i=>i.sale.date===l.date);
 if(!exact.length)return false;
 if(exact.length===l.quantity&&exact.reduce((n,i)=>n+cents(i.sale.price),0)===cents(l.price)){
  const txs=new Set(exact.map(i=>i.sale.transactionId).filter(Boolean));
  // Keep a genuine local checkout receipt; without one, add the normal imported receipt.
  if(txs.size>1){next.liveEbay.issues.push('Order '+l.orderId+': multiple local receipts need review.');return true;}
  for(const i of exact){i.sale.productionKey=key(l);i.timeline.push(['eBay sale reconciled',next.liveEbay.checkedAt+' · existing local sale retained']);}
  const row={key:key(l),imported:copy(l),latest:copy(l),itemIds:exact.map(i=>i.id),review:false,localTransactionId:[...txs][0]||null};
  next.liveEbay.ledger.push(row);receipt(next,row);
 }else next.liveEbay.issues.push('Order '+l.orderId+': an existing local eBay sale needs matching; no duplicate sale imported.');
 return true;
}
function syncInventory(state,snapshot){
 check(state);snapshotValid(snapshot);if(state.liveEbay?.checkedAt&&Date.parse(snapshot.checkedAt)<Date.parse(state.liveEbay.checkedAt))throw Error('An older snapshot cannot replace the latest inventory.');
 const next=copy(state),live=next.liveEbay||(next.liveEbay={listings:[],orders:[],ledger:[]});
 const previous=live.inventoryBaseline||null;
 Object.assign(live,{listings:copy(snapshot.listings),orders:copy(snapshot.orders),checkedAt:snapshot.checkedAt,partial:!!(snapshot.listingTruncated||snapshot.orderTruncated),note:snapshot.note||'',issues:[],createdThisSync:0});
 const consumed=new Map();
 for(const l of [...live.orders].sort((a,b)=>String(b.createdAt||b.date).localeCompare(String(a.createdAt||a.date)))){
  const row=live.ledger.find(r=>r.key===key(l));
  if(row){row.latest=copy(l);if(!row.outcome){if(changed(l,row.imported)){row.review=true;for(const id of row.itemIds)next.items.find(i=>i.id===id).sale.reviewNeeded=true;}
    else if(l.fulfillmentStatus==='FULFILLED')for(const id of row.itemIds){const i=next.items.find(i=>i.id===id);if(['Sold','Packaged'].includes(i.status)){i.status='Dispatched';i.sale.status='Dispatched';}}
   }receipt(next,row);continue;}
  if(live.partial||!valid(l)||!/^\d+$/.test(l.listingId))continue;
  if(!l.sku&&live.listings.some(x=>x.listingId===l.listingId&&x.sku)){live.issues.push('Order '+l.orderId+': variation identity is missing. Match it manually.');continue;}
  if(recordedSale(next,l))continue;
  // Bootstrap orders predate the current remaining stock. Never consume that
  // stock a second time. Thereafter only newly created orders consume linked units;
  // a previously unseen older order is imported as historical stock instead.
  const current=previous&&l.date>previous.checkedAt.slice(0,10);
  const sameDay=previous&&l.createdAt&&Date.parse(l.createdAt)>Date.parse(previous.checkedAt);
  const priorQuantity=previous?.quantities?.find(x=>x.listingId===l.listingId&&x.sku===l.sku)?.quantity;
  const remaining=live.listings.find(x=>x.listingId===l.listingId&&x.sku===l.sku)?.quantity??0;
  const decline=Number.isSafeInteger(priorQuantity)?Math.max(0,priorQuantity-remaining):0;
  const observedSale=decline-(consumed.get(listingKey(l))||0)>=l.quantity;
  const units=current||sameDay||observedSale?next.items.filter(i=>available(i)&&pair(i,l)).slice(0,l.quantity):[];
  consumed.set(listingKey(l),(consumed.get(listingKey(l))||0)+units.length);
  while(units.length<l.quantity)units.push(importUnit(next,l,'order'));
  allocate(next,l,units.map(i=>i.id));receipt(next,live.ledger.at(-1));
 }
 if(!live.partial){
  for(const l of live.listings){
   const units=next.items.filter(i=>available(i)&&pair(i,l));
   if(l.quantity===null){live.issues.push('Listing '+l.listingId+': quantity unknown; no stock created.');continue;}
   const prior=previous?.quantities?.find(x=>x.listingId===l.listingId&&x.sku===l.sku);
   // Initial stock and later explicit quantity increases can add units. An
   // unchanged remote quantity must never recreate a locally sold/unlinked unit.
   const allowance=prior&&prior.quantity!==null?Math.max(0,l.quantity-(prior.quantity??l.quantity)):l.quantity;
   const add=Math.min(allowance,Math.max(0,l.quantity-units.length));
   for(let n=0;n<add;n++)importUnit(next,l,'listing');
   const linked=next.items.filter(i=>available(i)&&pair(i,l));
   for(const i of linked){i.liveSnapshot={...copy(l),checkedAt:live.checkedAt};i.listing={channel:'eBay Live',price:l.currency==='GBP'?l.price:null,date:i.listing?.date||(l.startDate||'').slice(0,10)};}
   if(linked.length!==l.quantity)live.issues.push('Listing '+l.listingId+' / '+plain(l.sku||'no SKU')+': eBay has '+l.quantity+' available; RetroHQ has '+linked.length+'. Check orders, restocking and other-channel sales. Stock was not deleted or recreated.');
  }
  for(const i of next.items.filter(i=>available(i)&&i.liveListingId))if(!live.listings.some(l=>pair(i,l))){i.liveSnapshot={status:'Not in active snapshot — verify on eBay',checkedAt:live.checkedAt};live.issues.push('Item '+i.id+': listing no longer active. Verify physical stock; it is retained.');}
  live.inventoryBaseline={checkedAt:live.checkedAt,quantities:[...(previous?.quantities||[]).filter(p=>!live.listings.some(l=>pair({liveListingId:p.listingId,liveSku:p.sku},l))),...live.listings.map(l=>({listingId:l.listingId,sku:l.sku,quantity:l.quantity}))]};
 }else live.issues.push('Partial snapshot: new inventory and sales imports paused. Existing order changes still require review.');
 delete live.createdThisSync;
 return check(next);
}

function link(state,listingId,sku,ids){check(state);const next=copy(state),matches=next.liveEbay?.listings.filter(l=>l.listingId===listingId&&l.sku===sku)||[];if(matches.length!==1)throw Error('Refresh the exact listing / variation first.');if(!ids.length||new Set(ids).size!==ids.length)throw Error('Select physical stock.');
 const placeholders=next.items.filter(i=>pair(i,{listingId,sku})&&available(i)&&!ids.includes(i.id)&&i.importOrigin==='listing'&&i.buy===null&&i.processingCosts===null&&!i.editHistory?.length&&!i.notes&&i.timeline.length===1&&!i.valuation&&!i.photoData&&!i.photos&&!i.identity&&!i.saleHistory?.length&&!i.returns?.length);
 const incoming=ids.filter(id=>{const i=next.items.find(i=>i.id===id);return i&&!pair(i,{listingId,sku});});
 const replace=placeholders.slice(0,incoming.length);
 next.items=next.items.filter(i=>!replace.includes(i));
 for(const id of ids){const i=next.items.find(i=>i.id===id);if(!i||!available(i))throw Error('Only available stock can be linked.');if(i.liveListingId&&(i.liveListingId!==listingId||(i.liveSku||'')!==sku))throw Error('Unlink the old listing / variation first.');i.liveListingId=listingId;i.liveSku=sku;i.status='Listed';i.listing=i.listing||{channel:'eBay Live',price:matches[0].currency==='GBP'?matches[0].price:null,date:(matches[0].startDate||'').slice(0,10)};(i.timeline||(i.timeline=[])).push(['eBay Live linked',new Date().toISOString()+' · listing '+listingId]);}return next;
}
function unlink(state,id){check(state);const next=copy(state),i=next.items.find(i=>i.id===id);if(!i||!available(i))throw Error('Only available stock can be unlinked.');delete i.liveListingId;delete i.liveSku;delete i.liveSnapshot;i.timeline.push(['eBay Live unlinked',new Date().toISOString()]);return next;}
function apply(state,orderKey,ids){check(state);const next=copy(state),l=next.liveEbay?.orders.find(l=>key(l)===orderKey);if(!l)throw Error('Refresh this order first.');allocate(next,l,ids);receipt(next,next.liveEbay.ledger.at(-1));return check(next);}
function replaceImportedSale(state,orderKey,ids){
 check(state);const next=copy(state),r=next.liveEbay?.ledger.find(r=>r.key===orderKey);
 if(!r||r.outcome||r.review||r.localTransactionId||ids.length!==r.itemIds.length||new Set(ids).size!==ids.length)throw Error('Select exactly the imported sale quantity, with no order changes pending.');
 const old=r.itemIds.map(id=>next.items.find(i=>i.id===id)),units=ids.map(id=>next.items.find(i=>i.id===id));
 if(old.some(i=>i.importOrigin!=='order'||i.importedFrom!=='ebay-production'||i.buy!==null||i.processingCosts!==null||i.editHistory?.length||i.saleHistory?.length)||units.some(i=>!i||!available(i)||(i.liveListingId&&!pair(i,r.imported))))throw Error('Only untouched imported sales can be matched to available owned stock.');
 for(const [n,i]of units.entries()){const from=old[n];i.sale=copy(from.sale);i.status=from.status;i.liveListingId=r.imported.listingId;i.liveSku=r.imported.sku;if(from.saleCostHistory)i.saleCostHistory=copy(from.saleCostHistory);i.timeline.push(['eBay sale matched',next.liveEbay.checkedAt+' · order '+r.imported.orderId+' · owned purchase costs retained']);}
 next.items=next.items.filter(i=>!old.includes(i));r.itemIds=ids.slice();receipt(next,r);return check(next);
}
function acceptChange(state,orderKey){check(state);const next=copy(state),r=next.liveEbay?.ledger.find(r=>r.key===orderKey);if(!r||r.outcome||!valid(r.latest)||['quantity','sku','listingId'].some(k=>r.latest[k]!==r.imported[k]))throw Error('Quantity, identity, refund or cancellation changes require Seller Hub review.');
 const cents=Math.round(r.latest.price*100);for(const [n,id]of r.itemIds.entries()){const i=next.items.find(i=>i.id===id);(i.saleCostHistory||(i.saleCostHistory=[])).push({date:new Date().toISOString(),before:copy(i.sale)});Object.assign(i.sale,{price:(Math.floor(cents/r.itemIds.length)+(n<cents%r.itemIds.length?1:0))/100,date:r.latest.date,feeValue:r.itemIds.length===1&&r.latest.orderLineCount===1?r.latest.orderFee:null,shippingRevenue:r.itemIds.length===1&&r.latest.orderLineCount===1?r.latest.orderShipping:null,reviewNeeded:false,costsConfirmed:false});}r.imported=copy(r.latest);r.review=false;receipt(next,r);return check(next);
}
function restore(state,orderKey){check(state);const next=copy(state),r=next.liveEbay?.ledger.find(r=>r.key===orderKey);if(!r||r.outcome||!r.review)throw Error('Only a reviewed imported order can be physically returned.');for(const id of r.itemIds){const i=next.items.find(i=>i.id===id);(i.saleHistory||(i.saleHistory=[])).push({...copy(i.sale),outcome:'Returned',returnDate:new Date().toISOString()});i.sale=null;i.listing=null;i.status='Needs repair';i.needsValuation=true;delete i.liveListingId;delete i.liveSku;delete i.liveSnapshot;i.timeline.push(['eBay Live physical return',new Date().toISOString()+' · inspect and reconcile refund before resale']);}r.outcome='returned';receipt(next,r);return check(next);}
const api={key,valid,available,check,reconcile:syncInventory,link,unlink,apply,replaceImportedSale,acceptChange,restore};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetroLive=api;
})(typeof globalThis!=='undefined'?globalThis:this);
