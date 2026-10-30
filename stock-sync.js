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
 for(const l of r.snapshot.listings){const units=linked(state,l);if((r.initial&&units.length===0&&l.quantity!==0)||state.liveEbay.stockDeferredListings?.includes(pair(l))||l.quantity!==null&&l.quantity>units.length)result.push({kind:'listing',key:pair(l),record:l,linkedIds:units.map(i=>i.id),needed:l.quantity===null?null:Math.max(0,l.quantity-units.length),soldElsewhere:state.items.filter(i=>i.sale&&i.liveListingId===l.listingId&&(i.liveSku||'')===l.sku&&!['eBay','eBay Live'].includes(i.sale.channel)).length});}
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
function cleanSnapshot(snapshot){
 const s=copy(snapshot),groups=new Map();if(!Array.isArray(s.listings))throw Error('Invalid eBay listings.');
 for(const l of s.listings){L.validateSnapshot({...s,listings:[l],orders:[]});const k=pair(l);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(l);}
 s.duplicateListingGroups=[];s.listings=[];for(const [key,records]of groups)if(records.length>1)s.duplicateListingGroups.push({key,records,reason:'Repeated listing and variation in the same source snapshot'});else s.listings.push(records[0]);
 L.validateSnapshot(s);return s;
}
function candidates(state,row){
 const words=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(x=>x&&!['the','a','and','game','edition'].includes(x)),wanted=new Set(words(row.record.title));
 return state.items.filter(i=>L.available(i)&&(!i.liveListingId||i.liveListingId===row.record.listingId&&(i.liveSku||'')===row.record.sku)).map(i=>{const tokens=new Set(words(i.title)),overlap=[...tokens].filter(x=>wanted.has(x)).length;const exact=String(i.title).toLowerCase()===String(row.record.title).toLowerCase();return {item:i,score:i.stockSku&&i.stockSku===row.record.sku?3:exact?2:overlap/Math.max(wanted.size,tokens.size,1),exact};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.item.id-b.item.id);
}
function silo(state){
 const snap=state.liveEbay?.stockReview?.snapshot||state.liveEbay;
 const repeated=(snap?.duplicateListingGroups||[]).map(x=>({...x,type:'source'}));
 const existing=(snap?.listings||[]).filter(l=>linked(state,l).length>0&&l.quantity<=linked(state,l).length).map(l=>({key:pair(l),records:[l],type:'linked',reason:'Already linked; refresh only, never a second import'}));
 const held=state.items.filter(i=>i.importHold).map(i=>({key:'unit:'+i.id,item:i,type:'held',reason:i.importHold.reason,records:[]}));
 return [...repeated,...existing,...held];
}
function holdOverlaps(state,snapshot){
 if(snapshot.listingTruncated||snapshot.orderTruncated)return state;
 const next=copy(state),pristine=i=>i.importedFrom==='ebay-production'&&i.buy===null&&i.processingCosts===null&&!i.editHistory?.length&&!i.saleHistory?.length&&!i.photoData&&(!i.valuation||i.valuation.source==='eBay listing price')&&(!i.notes||i.notes===String(i.liveSnapshot?.details?.description||'').replace(/[<>"`\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,4000));
 for(const l of snapshot.listings){if(l.quantity===null)continue;const units=linked(next,l).sort((a,b)=>Number(pristine(a))-Number(pristine(b))||a.id-b.id);
  for(const i of units.slice(l.quantity))if(pristine(i))i.importHold={reason:'Possible duplicate import: exceeds the current eBay quantity',listingId:l.listingId,heldAt:snapshot.checkedAt};
 }
 return next;
}
function releaseHeld(state,id){
 const next=copy(state),i=next.items.find(i=>i.id===id);if(!i?.importHold||i.sale)throw Error('This stock unit cannot be released.');
 delete i.importHold;delete i.liveListingId;delete i.liveSku;if(i.liveSnapshot)i.liveSnapshot.status='Unlinked evidence after duplicate review';i.listing=null;i.status='Acquired';i.timeline.push(['Import review resolved','Confirmed as a separate physical unit; not linked to eBay.']);return check(L.check(next));
}
function applyOne(state,kind,key,action,ids=[],addRemaining=false){
 let draft=state;
 if(kind==='listing'&&action==='link'&&ids.length){draft=copy(state);const row=rows(draft).find(x=>x.kind===kind&&x.key===key);if(!row)throw Error('Refresh this listing first.');for(const i of linked(draft,row.record))if(!ids.includes(i.id))i.importHold={reason:'Unselected existing unit during listing overlap review',listingId:row.record.listingId,heldAt:draft.liveEbay.stockReview.snapshot.checkedAt};}
 let next=choose(draft,kind,key,action,ids,addRemaining);
 for(const row of rows(next))if(!(row.kind===kind&&row.key===key)){next.liveEbay.stockReview.choices=next.liveEbay.stockReview.choices.filter(c=>!(c.kind===row.kind&&c.key===row.key));next.liveEbay.stockReview.choices.push({kind:row.kind,key:row.key,action:'later',itemIds:[],addRemaining:false,additionalUnits:0});}
 next=apply(next);const audit=next.liveEbay.stockReviewHistory?.at(-1);if(audit)audit.decisions=audit.decisions.filter(c=>c.kind===kind&&c.key===key);
 if(action==='later'){next.liveEbay.inlineDeferred=next.liveEbay.inlineDeferred||[];const k=kind+':'+key;if(!next.liveEbay.inlineDeferred.includes(k))next.liveEbay.inlineDeferred.push(k);}else next.liveEbay.inlineDeferred=(next.liveEbay.inlineDeferred||[]).filter(k=>k!==kind+':'+key);
 return next;
}
function dailyInline(state,snapshot){
 const safe=cleanSnapshot(snapshot);
 let next=L.reconcile(state,safe,{deferNew:true,importSalesHistory:true});next=holdOverlaps(next,safe);
 next.liveEbay.salesHistoryVersion=1;next.liveEbay.inlineVersion=1;next.liveEbay.duplicateListingGroups=copy(safe.duplicateListingGroups);next=begin(next,safe);if(!rows(next).length)next.liveEbay.stockSetup=next.liveEbay.stockSetup||{completed:true,completedAt:safe.checkedAt};
 return next;
}

const api={check,rows,begin,daily,choose,summary,apply,cleanSnapshot,candidates,silo,releaseHeld,applyOne,dailyInline};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetroStockSync=api;
})(typeof globalThis!=='undefined'?globalThis:this);
