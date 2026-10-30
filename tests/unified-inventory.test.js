const {test}=require('node:test'),assert=require('node:assert/strict');
const L=require('../live-inventory'),B=require('../workspace-backup'),C=require('../checkout'),I=require('../item-management'),O=require('../operations'),D=require('../demo-sales');
const seed=()=>({...D.seed({settings:{offerPct:45,storeCreditBonus:15,greenMargin:45,yellowMargin:30,fees:{eBay:{type:'percent',value:12.8}}}}),items:[],transactions:[]});
const listing=(x={})=>({listingId:'123',sku:'RED',title:'Game <special> "edition"',quantity:2,price:25,currency:'GBP',startDate:'2026-10-01T12:00:00Z',...x});
const line=(x={})=>({orderId:'O1',lineItemId:'L1',listingId:'123',sku:'RED',title:'Game',eligible:true,paymentStatus:'PAID',cancelState:'NONE',refundDetected:false,currency:'GBP',quantity:1,price:20.01,date:'2026-10-28',createdAt:'2026-10-28T13:00:00Z',orderFee:2,orderShipping:3,orderLineCount:1,fulfillmentStatus:'NOT_STARTED',...x});
const snap=(orders=[],listings=[listing()],checkedAt='2026-10-28T12:00:00Z',x={})=>({ok:true,environment:'production',checkedAt,listings,orders,...x});
const roundtrip=s=>B.parse(B.pack(s,'saved'),'saved').state;

test('bootstrap creates available units and historical sales separately; all share normal inventory and receipts',()=>{
 const old=seed(),s=L.reconcile(old,snap([line({quantity:2,price:30.01})]));
 assert.equal(old.items.length,0);assert.equal(s.items.length,4);assert.equal(s.items.filter(C.available).length,2);
 assert.equal(s.items.filter(i=>i.sale).length,2);assert.equal(s.transactions.length,1);assert.equal(s.transactions[0].total,3001);
 assert.deepEqual(s.transactions[0].lines.map(l=>l.price),[1501,1500]);assert.equal(s.transactions[0].fee,null);
 for(const i of s.items){assert.equal(i.buy,null);assert.equal(i.processingCosts,null);assert.equal(i.needsValuation,false);assert.equal(i.valuation.finalValue,25);assert.equal(i.valuation.source,'eBay listing price');assert.equal(O.economics(i).profit,null);}
 assert.ok(!s.items.some(i=>/[<>"]/.test(i.title)));assert.deepEqual(roundtrip(s),s);
 assert.deepEqual(L.reconcile(s,snap([line({quantity:2,price:30.01})])),s);
});
test('new paid order consumes the same linked unit and preserves purchase/location; repeat/reload has no duplicates',()=>{
 let s=L.reconcile(seed(),snap());const id=s.items[0].id;
 s.items[0]=I.edit(s.items[0],{buy:8,processingCosts:1,value:30,valueChanged:true,area:'A',shelf:'2',notes:'Verified',offerPct:45},'2026-10-28');
 s=L.reconcile(s,snap([line()],[listing({quantity:1})],'2026-10-28T14:00:00Z'));
 const sold=s.items.find(i=>i.id===id);assert.equal(sold.buy,8);assert.equal(sold.location,'A / 2');assert.equal(sold.sale.price,20.01);
 assert.equal(s.items.length,2);assert.equal(s.items.filter(C.available).length,1);assert.equal(s.transactions.length,1);
 assert.deepEqual(L.reconcile(roundtrip(s),snap([line()],[listing({quantity:1})],'2026-10-28T14:00:00Z')),s);
});
test('unchanged eBay quantity does not recreate stock sold through RetroHQ; discrepancies are visible',()=>{
 let s=L.reconcile(seed(),snap());s=C.complete(s,{channel:'eBay',lines:[{id:s.items[0].id,price:20.01}],discountType:'fixed',discount:0,feeType:'fixed',feeValue:2,credit:0},'LOCAL','2026-10-28');
 s=L.reconcile(s,snap([],[listing()],'2026-10-28T14:00:00Z'));assert.equal(s.items.length,2);assert.equal(s.items.filter(C.available).length,1);assert.ok(s.liveEbay.issues.some(x=>x.includes('eBay has 2')));
 s=L.reconcile(s,snap([line()],[listing({quantity:1})],'2026-10-28T15:00:00Z'));
 assert.equal(s.items.length,2);assert.equal(s.transactions.length,1);assert.equal(s.items.filter(i=>i.sale).length,1);assert.equal(s.liveEbay.ledger.length,1);assert.deepEqual(roundtrip(s),s);
});
test('a conflicting previously recorded local eBay sale is held instead of counted twice',()=>{
 let s=L.reconcile(seed(),snap());s=C.complete(s,{channel:'eBay',lines:[{id:s.items[0].id,price:35}],discountType:'fixed',discount:0,feeType:'fixed',feeValue:2,credit:0},'LOCAL','2026-10-28');
 s=L.reconcile(s,snap([line()],[listing({quantity:1})],'2026-10-28T15:00:00Z'));assert.equal(s.transactions.length,1);assert.equal(s.items.filter(i=>i.sale).length,1);assert.equal(s.liveEbay.ledger.length,0);assert.ok(s.liveEbay.issues.some(x=>x.includes('no duplicate sale')));
});
test('quantity increases add only the extra units, reductions and missing listings retain physical stock',()=>{
 let s=L.reconcile(seed(),snap());s=L.reconcile(s,snap([],[listing({quantity:3})],'2026-10-28T14:00:00Z'));assert.equal(s.items.length,3);
 s=L.reconcile(s,snap([],[listing({quantity:1})],'2026-10-28T15:00:00Z'));assert.equal(s.items.length,3);assert.ok(s.liveEbay.issues.length);
 s=L.reconcile(s,snap([],[],'2026-10-28T16:00:00Z'));assert.equal(s.items.length,3);assert.ok(s.liveEbay.issues.length);
});
test('partial, unpaid, cancelled, non-GBP and ambiguous variation orders never create a sale',()=>{
 assert.equal(L.reconcile(seed(),snap([line()],undefined,undefined,{orderTruncated:true})).items.length,0);
 for(const patch of [{paymentStatus:'PENDING'},{refundDetected:true},{cancelState:'CANCELED'},{currency:'USD'},{sku:''}]){
  const s=L.reconcile(seed(),snap([line(patch)]));assert.equal(s.items.filter(i=>i.sale).length,0);assert.equal(s.transactions.length,0);
 }
});
test('late historical orders do not consume current available units and missing quantities are not fabricated',()=>{
 let s=L.reconcile(seed(),snap());s=L.reconcile(s,snap([line({createdAt:'2026-09-01T12:00:00Z',date:'2026-09-01'})],[listing()],'2026-10-28T14:00:00Z'));
 assert.equal(s.items.length,3);assert.equal(s.items.filter(C.available).length,2);
 assert.equal(L.reconcile(seed(),snap([],[listing({quantity:null})])).items.length,0);
});
test('refunds preserve sold records until physical return and never re-import returned sales',()=>{
 let s=L.reconcile(seed(),snap([line()]));s=L.reconcile(s,snap([line({refundDetected:true})]));assert.equal(s.items.filter(i=>i.sale).length,1);
 s=L.restore(s,L.key(line()));assert.equal(s.items.filter(i=>i.sale).length,0);assert.equal(s.transactions[0].outcome,'returned');
 s=L.reconcile(roundtrip(s),snap([line()]));assert.equal(s.items.filter(i=>i.sale).length,0);assert.equal(s.transactions.length,1);
});
test('existing owned records explicitly replace untouched imported placeholders without losing acquisition evidence',()=>{
 let s=L.reconcile(seed(),snap());const owned=D.seed({settings:seed().settings}).items[0];owned.id=100;owned.source='Private seller';s.items.push(owned);
 s=L.link(s,'123','RED',[100]);assert.equal(s.items.filter(i=>L.available(i)&&i.liveListingId==='123').length,2);assert.equal(s.items.length,2);assert.equal(s.items.find(i=>i.id===100).buy,35);assert.deepEqual(roundtrip(s),s);
});
test('editing imported sold costs retains sale identity, and unknown cost basis never becomes free stock',()=>{
 let s=L.reconcile(seed(),snap([line()]));const i=s.items.find(i=>i.sale),before=structuredClone(i.sale);
 const n=I.edit(i,{buy:5,processingCosts:0,value:null,valueChanged:false,area:'',shelf:'',notes:'',offerPct:45},'2026-10-28');assert.deepEqual(n.sale,before);assert.equal(n.buy,5);
 assert.throws(()=>I.edit(i,{buy:5,value:100,valueChanged:true},'2026-10-28'));
 const stock=s.items.find(C.available),pending=I.edit(stock,{buy:'',processingCosts:'',value:'',valueChanged:false,area:'',shelf:'',notes:'',offerPct:45},'2026-10-28');assert.equal(pending.buy,null);assert.equal(pending.processingCosts,null);
 s.items[s.items.indexOf(i)]=n;assert.deepEqual(roundtrip(s),s);
});
test('receipt corruption, duplicate identities and excessive import leave original state intact',()=>{
 const s=L.reconcile(seed(),snap([line()]));for(const change of [n=>n.transactions[0].total++,n=>n.transactions[0].productionKey='other',n=>n.transactions.splice(0,1)]){const n=structuredClone(s);change(n);assert.throws(()=>B.validate(n));}
 const empty=seed();assert.throws(()=>L.reconcile(empty,snap([],[listing({quantity:2001})])));assert.equal(empty.items.length,0);
});
test('an imported historical sale can be explicitly matched to owned stock while retaining real costs and one receipt',()=>{
 let s=L.reconcile(seed(),snap([line()]));const owned=D.seed({settings:seed().settings}).items[0];owned.id=100;owned.source='Private seller';s.items.push(owned);
 const n=L.replaceImportedSale(s,L.key(line()),[100]);assert.equal(n.items.length,s.items.length-1);assert.equal(n.items.find(i=>i.id===100).buy,35);assert.equal(n.items.find(i=>i.id===100).sale.price,20.01);assert.deepEqual(n.transactions[0].lines.map(l=>l.id),[100]);assert.deepEqual(roundtrip(n),n);assert.throws(()=>L.replaceImportedSale(n,L.key(line()),[100]));
});
test('a newly known quantity imports stock; disappeared/reappearing listings never resurrect a locally sold unit',()=>{
 let s=L.reconcile(seed(),snap([],[listing({quantity:null})]));s=L.reconcile(s,snap([],[listing({quantity:1})],'2026-10-28T13:00:00Z'));assert.equal(s.items.length,1);
 s=C.complete(s,{channel:'eBay',lines:[{id:s.items[0].id,price:20}],discountType:'fixed',discount:0,feeType:'fixed',feeValue:2,credit:0},'LOCAL','2026-10-28');
 s=L.reconcile(s,snap([],[],'2026-10-28T14:00:00Z'));s=L.reconcile(s,snap([],[listing({quantity:1})],'2026-10-28T15:00:00Z'));assert.equal(s.items.length,1);assert.equal(s.items.filter(C.available).length,0);assert.ok(s.liveEbay.issues.length);assert.throws(()=>L.reconcile(s,snap()));
});
test('an older pending order becoming paid consumes the observed quantity reduction',()=>{
 let s=L.reconcile(seed(),snap([line({paymentStatus:'PENDING',createdAt:'2026-10-27T10:00:00Z',date:'2026-10-27'})]));
 s=L.reconcile(s,snap([line({createdAt:'2026-10-27T10:00:00Z',date:'2026-10-27'})],[listing({quantity:1})],'2026-10-28T14:00:00Z'));assert.equal(s.items.length,2);assert.equal(s.items.filter(C.available).length,1);assert.equal(s.liveEbay.issues.length,0);
});
test('accepted external corrections update the original local checkout receipt without adding another sale',()=>{
 let s=L.reconcile(seed(),snap());s=C.complete(s,{channel:'eBay',lines:[{id:s.items[0].id,price:20.01}],discountType:'fixed',discount:0,feeType:'fixed',feeValue:2,credit:0},'LOCAL','2026-10-28');
 s=L.reconcile(s,snap([line()],[listing({quantity:1})],'2026-10-28T14:00:00Z'));
 s=L.reconcile(s,snap([line({price:22})],[listing({quantity:1})],'2026-10-28T15:00:00Z'));assert.equal(s.transactions[0].total,2001);
 s=L.acceptChange(s,L.key(line()));assert.equal(s.transactions.length,1);assert.equal(s.transactions[0].total,2200);assert.equal(s.transactions[0].corrections.length,1);assert.deepEqual(roundtrip(s),s);
});

