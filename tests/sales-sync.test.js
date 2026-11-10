const test=require('node:test'), assert=require('node:assert/strict');
const S=require('../sales-sync.js');
const line=(extra={})=>({orderId:'O1',lineItemId:'L1',sku:'SKU',listingId:'LIST',quantity:1,price:30,currency:'GBP',eligible:true,paymentStatus:'PAID',cancelState:'NONE',date:'2026-10-11',...extra});
const stock=(extra={})=>({items:[{id:1,title:'Unit',ebaySku:'SKU',ebayListingId:'LIST',status:'Listed',buy:10,processingCosts:2,timeline:[],...extra}]});
test('paid sale preserves costs, flags unknown profit and remains idempotent after reload',()=>{
 const state=stock(); S.ingest(state,[line()]); const row=state.ebaySync.lines[0];
 assert.equal(S.propose(state,row).status,'Ready to import'); S.apply(state,row.key,[1]);
 const loaded=JSON.parse(JSON.stringify(state)); S.ingest(loaded,[line()]);
 assert.equal(loaded.ebaySync.lines.length,1); assert.throws(()=>S.apply(loaded,row.key,[1]));
 assert.equal(loaded.items[0].buy,10); assert.equal(loaded.items[0].processingCosts,2);
 assert.equal(S.economics(loaded.items[0]).profit,null);
 S.confirmCosts(loaded.items[0],{feeValue:3,shipping:4,packaging:1,shippingRevenue:2});
 assert.equal(S.economics(loaded.items[0]).profit,12);
});
test('pending payment, currency, fractional qty, refunds and cancellation cannot sell stock',()=>{
 for(const change of [{paymentStatus:'PENDING'},{cancelState:'CANCELED'},{currency:'USD'},{quantity:1.5},{refundDetected:true},{price:null}]){
  const state=stock(); S.ingest(state,[line(change)]); assert.throws(()=>S.apply(state,state.ebaySync.lines[0].key,[1])); assert.equal(state.items[0].sale,undefined);
 }
});
test('unmatched titles, duplicate links and conflicting SKU/listing IDs require review',()=>{
 const state=stock({ebaySku:'OTHER',ebayListingId:'OTHER'}); S.ingest(state,[line({title:'Unit'})]);
 assert.equal(S.propose(state,state.ebaySync.lines[0]).status,'Needs matching');
 state.items.push({id:2,ebaySku:'SKU',ebayListingId:'OTHER',status:'Listed'});
 assert.match(S.propose(state,state.ebaySync.lines[0]).status,/Conflicting/);
 const duplicates=stock(); duplicates.items.push({...duplicates.items[0],id:2}); S.ingest(duplicates,[line()]);
 assert.match(S.propose(duplicates,duplicates.ebaySync.lines[0]).status,/duplicate/);
});
test('multi-unit lines allocate pennies exactly and require enough distinct available units',()=>{
 const state=stock(); state.items.push({...state.items[0],id:2,timeline:[]}); S.ingest(state,[line({quantity:2,price:30.01})]);
 const row=state.ebaySync.lines[0]; assert.throws(()=>S.apply(state,row.key,[1,1]));
 S.apply(state,row.key,[1,2]); assert.equal(state.items.reduce((n,i)=>n+Math.round(i.sale.price*100),0),3001);
});
test('stock cannot be consumed twice by two orders',()=>{
 const state=stock(); S.ingest(state,[line(),line({orderId:'O2'})]);
 S.apply(state,state.ebaySync.lines[0].key,[1]); assert.throws(()=>S.apply(state,state.ebaySync.lines[1].key,[1]));
});
test('refund flags review without restoring stock; physical restore is explicit and tombstoned',()=>{
 const state=stock(); S.ingest(state,[line()]); const row=state.ebaySync.lines[0]; S.apply(state,row.key,[1]);
 S.ingest(state,[line({refundDetected:true})]); assert.equal(state.items[0].status,'Sold'); assert.equal(row.review,true);
 S.restore(state,row.key,'All units returned'); assert.equal(state.items[0].status,'Needs testing');
 S.ingest(state,[line()]); assert.throws(()=>S.apply(state,row.key,[1])); assert.equal(state.items[0].sale,null);
});
test('changed price invalidates confirmed profit and unchanged sync does not regress local dispatch',()=>{
 const state=stock(); S.ingest(state,[line()]); const row=state.ebaySync.lines[0]; S.apply(state,row.key,[1]);
 state.items[0].status='Dispatched'; S.ingest(state,[line()]); assert.equal(state.items[0].status,'Dispatched');
 S.ingest(state,[line({price:31})]); assert.equal(row.review,true); assert.equal(state.items[0].sale.price,30);
 assert.equal(S.economics(state.items[0]).profit,null);
});
test('storage reloads ledger with stock and rejects stale writers and quota failure',()=>{
 const mem=new Map(), local={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)};
 const first=S.storage(local), stale=S.storage(local), state=stock(); first.save(state);
 assert.deepEqual(S.storage(local).load(),state); assert.throws(()=>stale.save(stock()),/Another tab/);
 const bad=S.storage({getItem:()=>null,setItem:()=>{throw Error('Quota');}}); assert.throws(()=>bad.save(state),/Quota/);
});
test('fee corrections invalidate profit and require explicit acceptance without restoring stock',()=>{
 const state=stock(); S.ingest(state,[line({orderLineCount:1,orderFee:3,orderShipping:2})]); const row=state.ebaySync.lines[0]; S.apply(state,row.key,[1]);
 assert.equal(state.items[0].sale.feeValue,3);
 S.ingest(state,[line({orderLineCount:1,orderFee:5,orderShipping:2})]); assert.equal(row.review,true);
 S.acceptChange(state,row.key); assert.equal(state.items[0].sale.feeValue,5);assert.equal(row.review,false);
 assert.equal(state.items[0].sale.costsConfirmed,false);assert.equal(state.items[0].status,'Sold');
 S.ingest(state,[line({refundDetected:true})]);assert.throws(()=>S.acceptChange(state,row.key));
});
test('already fulfilled order imports as dispatched and unsupported saved data is not reset',()=>{
 const state=stock();S.ingest(state,[line({fulfillmentStatus:'FULFILLED'})]);S.apply(state,state.ebaySync.lines[0].key,[1]);
 assert.equal(state.items[0].status,'Dispatched');
 const bad=S.storage({getItem:()=>'{broken'});assert.throws(()=>bad.load());
});
