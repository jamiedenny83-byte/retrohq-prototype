const {test}=require('node:test'),assert=require('node:assert/strict');
const B=require('../workspace-backup'),S=require('../sales-sync'),D=require('../demo-sales');
const sample=()=>D.seed({settings:{offerPct:45,storeCreditBonus:15,greenMargin:45,yellowMargin:30,fees:{eBay:{type:'percent',value:12.8}}}});
test('backup restores purchase details and complete duplicate ledger',()=>{
 const state=sample();S.ingest(state,D.orders('paid'));S.apply(state,state.ebaySync.lines[0].key,[1]);
 const parsed=B.parse(B.pack(state,'demo'),'demo');assert.deepEqual(parsed.state,state);assert.equal(parsed.sales,1);
 assert.throws(()=>S.apply(parsed.state,parsed.state.ebaySync.lines[0].key,[1]));
 assert.equal(parsed.state.items[0].buy,35);assert.equal(parsed.state.items[0].shelf,'1');
});
test('legacy files supported and demo cannot overwrite saved workspace',()=>{
 const state=sample();assert.equal(B.parse(JSON.stringify({version:1,state}),'demo').legacy,true);
 assert.throws(()=>B.parse(B.pack(state,'demo'),'saved'));
 assert.throws(()=>B.parse(B.pack(state,'saved'),'saved'));
});
test('invalid files, unsafe text, duplicate IDs and missing ledger are rejected',()=>{
 for(const mutate of [s=>s.items.push(s.items[0]),s=>s.items[0].title='<img src=x onerror=alert(1)>',s=>s.items[0].buy=-1,s=>s.settings=null,s=>s.items[0].timeline=null,s=>{S.ingest(s,D.orders('paid'));S.apply(s,s.ebaySync.lines[0].key,[1]);s.ebaySync.lines=[];}]){
  const state=sample();mutate(state);assert.throws(()=>B.parse(B.pack(state,'demo'),'demo'));
 }
 assert.throws(()=>B.parse('{','demo'));assert.throws(()=>B.parse(JSON.stringify({version:999}),'demo'));
});
test('failed recovery write or final save preserves stock; successful restore retains recovery',()=>{
 for(const failAt of ['recovery','save',null]){
  const data=new Map();const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>{if(failAt==='recovery'&&k.endsWith('.before-restore'))throw Error('quota');data.set(k,v);}};
  const key='retrohq.demo.v84',workspace=S.storage(storage,key),state=sample();workspace.save(state);const before=data.get(key);
  const next=sample();next.items[0].buy=40;
  if(failAt==='save')assert.throws(()=>B.restore(storage,{save(){throw Error('quota');}},key,next));
  else if(failAt==='recovery')assert.throws(()=>B.restore(storage,workspace,key,next));
  else{B.restore(storage,workspace,key,next);assert.equal(data.get(key+'.before-restore'),before);assert.equal(workspace.load().items[0].buy,40);}
  if(failAt)assert.equal(data.get(key),before);
 }
});
