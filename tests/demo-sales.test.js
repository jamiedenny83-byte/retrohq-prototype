const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../demo-sales.js'),S=require('../sales-sync.js');
const seed=()=>D.seed({settings:{offerPct:45},items:[]});
test('demo state and storage remain separate from the saved workspace through reset',()=>{
 const values=new Map();const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const live=S.storage(storage);live.save({items:[{id:1,title:'Private stock'}]});
 const before=storage.getItem('retrohq.sandbox.v84');
 const demo=S.storage(storage,D.storageKey);const state=seed();
 S.ingest(state,D.orders('paid'));S.apply(state,state.ebaySync.lines[0].key,[1]);demo.save(state);
 assert.equal(S.storage(storage,D.storageKey).load().items[0].status,'Sold');
 demo.save(seed());assert.equal(storage.getItem('retrohq.sandbox.v84'),before);
 assert.equal(S.storage(storage,D.storageKey).load().ebaySync.lines.length,0);
});
test('sample paid order uses normal matching, costs and duplicate protection',()=>{
 const state=seed();S.ingest(state,D.orders('paid'));const row=state.ebaySync.lines[0];
 assert.deepEqual(S.propose(state,row).items.map(i=>i.id),[1]);S.apply(state,row.key,[1]);
 S.confirmCosts(state.items[0],{feeValue:10,shipping:4,packaging:1,shippingRevenue:3});
 assert.equal(S.economics(state.items[0]).profit,31);
 S.ingest(state,D.orders('repeat'));assert.equal(state.ebaySync.lines.length,1);
 assert.throws(()=>S.apply(state,row.key,[1]));
});
test('unmatched and multi-unit samples exercise manual selection and penny allocation',()=>{
 const state=seed();S.ingest(state,D.orders('unmatched'));const row=state.ebaySync.lines[0];
 assert.equal(S.propose(state,row).status,'Needs matching');S.apply(state,row.key,[2]);
 S.ingest(state,D.orders('multi'));const multi=state.ebaySync.lines[1];
 assert.deepEqual(S.propose(state,multi).items.map(i=>i.id),[3,4]);S.apply(state,multi.key,[3,4]);
 assert.equal(Math.round(state.items[2].sale.price*100)+Math.round(state.items[3].sale.price*100),3001);
});
test('refund and cancellation retain sold stock until explicit return, errors retain state',()=>{
 for(const scenario of ['refund','cancel']){
  const state=seed();S.ingest(state,D.orders('paid'));const row=state.ebaySync.lines[0];S.apply(state,row.key,[1]);
  S.ingest(state,D.orders(scenario));assert.equal(row.review,true);assert.equal(state.items[0].status,'Sold');
  const before=JSON.stringify(state);assert.throws(()=>D.orders('error'));assert.equal(JSON.stringify(state),before);
  S.restore(state,row.key,'Demo physical return');S.ingest(state,D.orders('repeat'));assert.throws(()=>S.apply(state,row.key,[1]));
 }
});
