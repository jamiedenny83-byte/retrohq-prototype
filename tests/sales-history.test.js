const {test}=require('node:test'),assert=require('node:assert/strict'),L=require('../live-inventory'),S=require('../stock-sync'),B=require('../workspace-backup'),D=require('../demo-sales');
const seed=()=>D.seed({settings:{offerPct:45,storeCreditBonus:15,greenMargin:45,yellowMargin:30,fees:{eBay:{type:'percent',value:12.8}}}});
const line=(x={})=>({orderId:'O1',lineItemId:'L1',listingId:'123',sku:'RED',title:'Historical game',eligible:true,paymentStatus:'PAID',cancelState:'NONE_REQUESTED',refundDetected:false,currency:'GBP',quantity:1,price:30.01,date:'2026-09-20',createdAt:'2026-09-20T13:00:00Z',orderFee:2,orderShipping:3,orderLineCount:1,fulfillmentStatus:'FULFILLED',...x});
const snap=(orders=[],x={})=>({ok:true,environment:'production',checkedAt:'2026-10-30T12:00:00Z',listings:[{listingId:'123',sku:'RED',title:'Current copy',quantity:1,price:35,currency:'GBP'}],orders,...x});
test('real eBay cancellation status imports historical paid sales during inline stock fetch, once',()=>{
 const original=seed(),before=JSON.stringify(original),s=S.dailyInline(original,snap([line()]));assert.equal(JSON.stringify(original),before);
 assert.equal(s.items.filter(i=>i.sale).length,1);assert.equal(s.items.filter(L.available).length,original.items.filter(L.available).length);assert.equal(s.transactions.at(-1).total,3001);assert.equal(s.items.at(-1).status,'Dispatched');assert.equal(s.items.at(-1).buy,null);assert.equal(s.items.at(-1).sale.costsConfirmed,false);
 const again=S.dailyInline(s,snap([line()]));assert.equal(again.items.length,s.items.length);assert.equal(again.transactions.length,s.transactions.length);B.validate(again);assert.deepEqual(B.parse(B.pack(again,'demo'),'demo').state,again);
});
test('history-only backfill never uses an older sale to explain a current listing quantity decline',()=>{
 let s=L.reconcile(seed(),snap([],{checkedAt:'2026-10-29T12:00:00Z'}));const id=s.items.at(-1).id,baseline=structuredClone(s.liveEbay.inventoryBaseline);
 s=L.reconcile(s,snap([line()],{listings:[{...snap().listings[0],quantity:0}]}),{deferNew:true,importSalesHistory:true,ordersOnly:true});assert.ok(L.available(s.items.find(i=>i.id===id)));assert.deepEqual(s.liveEbay.inventoryBaseline,baseline);assert.equal(s.items.filter(i=>i.sale).length,1);
});
test('new exact linked sale consumes the existing physical unit with its cost retained',()=>{
 let s=L.reconcile(seed(),snap([],{checkedAt:'2026-10-29T12:00:00Z'}));const id=s.items.at(-1).id;s.items.at(-1).buy=12;
 s=S.dailyInline(s,snap([line({date:'2026-10-30',createdAt:'2026-10-30T11:00:00Z'})],{listings:[{...snap().listings[0],quantity:0}]}));assert.equal(s.items.find(i=>i.id===id).sale.price,30.01);assert.equal(s.items.find(i=>i.id===id).buy,12);assert.equal(s.liveEbay.ledger[0].itemIds[0],id);
});
test('paid financial history with missing listing or variation imports without consuming ambiguous stock',()=>{
 for(const change of [{listingId:''},{sku:''}]){const original=L.reconcile(seed(),snap()),count=original.items.filter(L.available).length,s=L.reconcile(original,snap([line(change)]),{deferNew:true,importSalesHistory:true,ordersOnly:true});assert.equal(s.items.filter(L.available).length,count);assert.equal(s.liveEbay.ledger.length,1);B.validate(s);}
});
test('unpaid, cancelled, refunded, non-GBP and partial responses do not create paid sales',()=>{
 for(const x of [{paymentStatus:'PENDING'},{cancelState:'CANCEL_REQUESTED'},{refundDetected:true},{currency:'USD'}])assert.equal(S.dailyInline(seed(),snap([line(x)])).items.filter(i=>i.sale).length,0);
 assert.equal(S.dailyInline(seed(),snap([line()],{orderTruncated:true})).items.filter(i=>i.sale).length,0);
});
