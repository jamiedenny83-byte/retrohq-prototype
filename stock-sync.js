/* Stock setup and daily sync orchestration. Connectors never own separate stock. */
(function(root){
'use strict';
const L=typeof module!=='undefined'&&module.exports?require('./live-inventory'):root.RetroLive;
const copy=x=>JSON.parse(JSON.stringify(x)),pair=l=>JSON.stringify([l.listingId,l.sku||'']);
const linked=(s,l)=>s.items.filter(i=>L.available(i)&&i.liveListingId===l.listingId&&(i.liveSku||'')===l.sku);
function check(state){
 const r=state.liveEbay?.stockReview;
 if(r){L.validateSnapshot(r.snapshot);if(typeof r.initial!=='boolean'||!Array.isArray(r.choices))throw Error('Invalid stock review.');
  const seen=new Set();for(const c of r.choices){const id=c.kind+':'+c.key;if(!['listing','order'].includes(c.kind)||typeof c.key!=='string'||seen.has(id)||!['link','new','keep','later'].includes(c.action)||!Array.isArray(c.itemIds)||c.itemIds.some(id=>!Number.isSafeInteger(id))||new Set(c.itemIds).size!==c.itemIds.length||c.addRemaining!=null&&typeof c.addRemaining!=='boolean'||c.additionalUnits!=null&&(!Number.isSafeInteger(c.additionalUnits)||c.additionalUnits<0))throw Error('Invalid stock review choice.');seen.add(id);}
 }
 if(state.liveEbay?.stockSetup&&(state.liveEbay.stockSetup.completed!==true||!Number.isFinite(Date.parse(state.liveEbay.stockSetup.completedAt))))throw Error('Invalid stock setup history.');
 if(state.liveEbay?.stockDeferredListings!=null&&(!Array.isArray(state.liveEbay.stockDeferredListings)||state.liveEbay.stockDeferredListings.some(x=>typeof x!=='string')))throw Error('Invalid deferred stock review.');
 return state;
}
function rows(state){
 const r=state.liveEbay?.stockReview;if(!r)return [];
 const result=[];
 for(const l of r.snapshot.listings){const units=linked(state,l);if(r.initial||state.liveEbay.stockDeferredListings?.includes(pair(l))||l.quantity!==null&&l.quantity>units.length)result.push({kind:'listing',key:pair(l),record:l,linkedIds:units.map(i=>i.id),needed:l.quantity===null?null:Math.max(0,l.quantity-units.length),soldElsewhere:state.items.filter(i=>i.sale&&i.liveListingId===l.listingId&&(i.liveSku||'')===l.sku&&!['eBay','eBay Live'].includes(i.sale.channel)).length});}
 for(const l of r.snapshot.orders)if(L.valid(l)&&/^\d+$/.test(l.listingId)&&!state.liveEbay.ledger.some(x=>x.key===L.key(l)))result.push({kind:'order',key:L.key(l),record:l,linkedIds:[],needed:l.quantity});
 return result.map(x=>({...x,choice:r.choices.find(c=>c.kind===x.kind&&c.key===x.key)||null}));
}
function begin(state,snapshot){
 L.check(state);L.validateSnapshot(snapshot);check(state);
 if(state.liveEbay?.checkedAt&&Date.parse(snapshot.checkedAt)<Date.parse(state.liveEbay.checkedAt))throw Error('Refresh eBay before reviewing an older snapshot.');
 const next=copy(state),live=next.liveEbay||(next.liveEbay={listings:[],orders:[],ledger:[]});
 // Every fresh fetch invalidates decisions made against old prices/quantities.
 live.stockReview={snapshot:copy(snapshot),initial:!live.stockSetup?.completed,choices:[]};return check(next);
}
function daily(state,snapshot){
 if(!state.liveEbay?.stockSetup?.completed)return begin(state,snapshot);
 let next=L.reconcile(state,snapshot,{deferNew:true});next=begin(next,snapshot);return next;
}
function choose(state,kind,key,action,itemIds=[],addRemaining=false){
 L.check(state);check(state);const next=copy(state),r=next.liveEbay?.stockReview,row=rows(next).find(x=>x.kind===kind&&x.key===key);
 if(!r||!row)throw Error('Refresh this stock review first.');
 if(!['link','new','keep','later'].includes(action)||action==='keep'&&(kind!=='listing'||row.needed!==0||row.record.quantity!==row.linkedIds.length))throw Error('Review the exact quantity first.');
 if(action==='new'&&row.needed===null)throw Error('eBay quantity is unknown. Leave this for later and verify it.');
 if(action==='link'){
  if(!itemIds.length||new Set(itemIds).size!==itemIds.length||itemIds.some(id=>!L.available(next.items.find(i=>i.id===id)||{})))throw Error('Choose available physical units.');
  if(kind==='order'&&(itemIds.length>row.record.quantity||!addRemaining&&itemIds.length!==row.record.quantity))throw Error('Choose exactly the sold quantity.');
  for(const id of itemIds){const i=next.items.find(i=>i.id===id);if(!i||i.liveListingId&&(i.liveListingId!==row.record.listingId||(i.liveSku||'')!==row.record.sku))throw Error('A selected unit is linked to another listing / variation.');}
 }
 let additionalUnits=action==='new'?row.needed:0;
 if(action==='link'&&addRemaining){if(row.record.quantity===null)throw Error('Check the unknown eBay quantity first.');if(kind==='order')additionalUnits=row.record.quantity-itemIds.length;else{let draft=copy(next);draft.liveEbay.listings=copy(r.snapshot.listings);draft=L.link(draft,row.record.listingId,row.record.sku,itemIds);additionalUnits=Math.max(0,row.record.quantity-linked(draft,row.record).length);}}
 r.choices=r.choices.filter(c=>!(c.kind===kind&&c.key===key));r.choices.push({kind,key,action,itemIds:action==='link'?itemIds.slice():[],addRemaining:action==='link'&&addRemaining,additionalUnits:additionalUnits||0});return check(next);
}
function summary(state){
 const list=rows(state);return {initial:!!state.liveEbay?.stockReview?.initial,total:list.length,reviewed:list.filter(x=>x.choice).length,newStock:list.filter(x=>x.kind==='listing'&&x.choice).reduce((n,x)=>n+(x.choice.additionalUnits||0),0),newSoldUnits:list.filter(x=>x.kind==='order'&&x.choice).reduce((n,x)=>n+(x.choice.additionalUnits||0),0),deferred:list.filter(x=>x.choice?.action==='later').length};
}
function apply(state){
 L.check(state);check(state);const review=state.liveEbay?.stockReview;if(!review)throw Error('Fetch an eBay snapshot first.');if(state.liveEbay.checkedAt&&Date.parse(review.snapshot.checkedAt)<Date.parse(state.liveEbay.checkedAt))throw Error('This review is older than the latest sync. Refresh it first.');
 if(review.snapshot.listingTruncated||review.snapshot.orderTruncated)throw Error('This snapshot is partial. Refresh the full snapshot before confirming stock.');
 const list=rows(state);if(list.some(x=>!x.choice))throw Error('Choose a decision for every row, including Leave for later.');
 let next=copy(state);const snapshot=review.snapshot;
 // Explicit links use the reviewed snapshot, never title similarity.
 Object.assign(next.liveEbay,{listings:copy(snapshot.listings),orders:copy(snapshot.orders),checkedAt:snapshot.checkedAt});
 for(const x of list.filter(x=>x.kind==='listing'&&x.choice.action==='link'))next=L.link(next,x.record.listingId,x.record.sku,x.choice.itemIds);
 for(const x of list.filter(x=>x.kind==='order'&&x.choice.action==='link'))next=L.apply(next,x.key,x.choice.itemIds,x.choice.addRemaining);
 const approvedListings=list.filter(x=>x.kind==='listing'&&(x.choice.action==='new'||x.choice.action==='link'&&x.choice.addRemaining)).map(x=>x.key);
 const approvedOrders=list.filter(x=>x.kind==='order'&&x.choice.action==='new').map(x=>x.key);
 const deferredOrders=list.filter(x=>x.kind==='order'&&x.choice.action==='later').map(x=>x.key);
 for(const x of list.filter(x=>x.kind==='listing'&&(x.choice.action==='new'||x.choice.action==='link'&&x.choice.addRemaining)))if(Math.max(0,x.record.quantity-linked(next,x.record).length)!==x.choice.additionalUnits)throw Error('A sale allocation changes the available-stock quantity. Review current stock and historical sold units separately.');
 next=L.reconcile(next,snapshot,{deferNew:true,approvedListings,approvedOrders,deferredOrders,forceNewOrders:approvedOrders});
 for(const x of list.filter(x=>x.kind==='order'&&x.choice.action==='new'))if(!next.liveEbay.ledger.some(r=>r.key===x.key))throw Error('The sold variation could not be identified. Match exact stock or leave it for later.');
 for(const x of list.filter(x=>x.kind==='listing'&&['link','keep','new'].includes(x.choice.action)))if(linked(next,x.record).length!==x.record.quantity)throw Error('Listing '+x.record.listingId+': linked units do not equal eBay quantity. Adjust the links or leave it for later.');
 next.liveEbay.stockSetup={completed:true,completedAt:state.liveEbay.stockSetup?.completedAt||snapshot.checkedAt,lastReviewedAt:snapshot.checkedAt};
 const audit=next.liveEbay.stockReviewHistory||(next.liveEbay.stockReviewHistory=[]);audit.push({date:snapshot.checkedAt,initial:review.initial,decisions:copy(review.choices)});
 next.liveEbay.stockDeferredListings=list.filter(x=>x.kind==='listing'&&x.choice.action==='later').map(x=>x.key);
 delete next.liveEbay.stockReview;
 // Keep deferred/unmatched records in a resumable review without re-importing them.
 next=begin(next,snapshot);next.liveEbay.stockReview.initial=false;
 if(!rows(next).length)delete next.liveEbay.stockReview;
 return check(L.check(next));
}
const api={check,rows,begin,daily,choose,summary,apply};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetroStockSync=api;
})(typeof globalThis!=='undefined'?globalThis:this);
