const {test}=require('node:test'),assert=require('node:assert/strict'),O=require('../operations'),L=require('../live-inventory'),D=require('../demo-sales'),B=require('../workspace-backup');
const line={orderId:'O1',lineItemId:'L1',listingId:'123',sku:'RED',title:'Sold game',eligible:true,paymentStatus:'PAID',cancelState:'NONE_REQUESTED',refundDetected:false,currency:'GBP',quantity:1,price:25,date:'2026-09-20',orderFee:null,orderShipping:0,orderLineCount:1,fulfillmentStatus:'FULFILLED'};
const snapshot={ok:true,environment:'production',checkedAt:'2026-10-30T12:00:00Z',orders:[line],listings:[]};
const seed=()=>{const s=D.seed({settings:{offerPct:45,storeCreditBonus:15,greenMargin:45,yellowMargin:30,fees:{eBay:{type:'percent',value:12.8}}}});s.items=[];s.transactions=[];return s;};
test('sale values show actual revenue and a separate default fee without inventing preparation or profit',()=>{
 const i={buy:null,processingCosts:null,sale:{channel:'eBay Live',price:25,feeValue:null,costsConfirmed:false}};
 const before=JSON.stringify(i),a=O.saleAmounts(i,{type:'percent',value:12.8});assert.equal(a.price,25);assert.equal(a.fee,3.2);assert.equal(a.estimated,true);assert.equal(JSON.stringify(i),before);assert.equal(O.economics(i).profit,null);
 assert.equal(O.saleAmounts(i,{type:'fixed',value:0}).fee,0);assert.equal(O.saleAmounts(i,{type:'percent',value:null}).fee,null);assert.equal(O.saleAmounts({...i,sale:{...i.sale,channel:'In Store EPOS'}},{type:'percent',value:12.8}).fee,null);
});
test('resync backfills missing defaults for old sold imports even when the listing is no longer active',()=>{
 let s=L.reconcile(seed(),snapshot,{deferNew:true,importSalesHistory:true});const id=s.items[0].id;s.items[0].sale.feeValue=null;delete s.items[0].sale.feeEstimated;delete s.items[0].sellingFeeEstimate;
 s=L.reconcile(s,snapshot,{deferNew:true,importSalesHistory:true,ordersOnly:true});assert.equal(s.items.length,1);assert.equal(s.items[0].id,id);assert.equal(s.items[0].sale.feeValue,12.8);assert.equal(s.items[0].sale.feeEstimated,true);assert.equal(s.items[0].processingCosts,null);assert.equal(s.items[0].buy,null);assert.equal(s.transactions.length,1);B.validate(s);
 s.settings.fees.eBay.value=15;s=L.reconcile(s,snapshot,{deferNew:true,importSalesHistory:true,ordersOnly:true});assert.equal(O.saleAmounts(s.items[0]).fee,3.75);
});
test('actual and manually recorded fees survive default changes and resync',()=>{
 const snap={...snapshot,orders:[{...line,orderFee:2}]};let s=L.reconcile(seed(),snap,{deferNew:true,importSalesHistory:true});s.settings.fees.eBay.value=50;s=L.reconcile(s,snap,{deferNew:true,importSalesHistory:true,ordersOnly:true});assert.equal(s.items[0].sale.feeValue,2);assert.equal(s.items[0].sale.feeType,'fixed');assert.equal(O.saleAmounts(s.items[0]).estimated,false);
 s.items[0].sale.feeValue=1.25;s.items[0].sale.costsConfirmed=true;s=L.reconcile(s,snap,{deferNew:true,importSalesHistory:true,ordersOnly:true});assert.equal(s.items[0].sale.feeValue,1.25);
});
