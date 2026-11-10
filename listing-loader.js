/* One user action drains metadata batches; price/quantity snapshots are fetched once. */
(function(root){
'use strict';
async function complete(snapshot,request,progress=()=>{},cancelled=()=>false){
 const next=JSON.parse(JSON.stringify(snapshot)),rows=[...next.listings,...next.orders],key=x=>JSON.stringify([x.listingId,x.sku||'']);
 const known=new Map(rows.filter(x=>x.details).map(x=>[key(x),x]));
 for(const row of rows)if(!row.details&&known.has(key(row))){const d=known.get(key(row));row.details=d.details;row.detailsStatus=d.detailsStatus;row.detailsCheckedAt=d.detailsCheckedAt;}
 const pending=[...new Map(rows.filter(x=>/^\d+$/.test(x.listingId)&&!x.details).map(x=>[key(x),{listingId:x.listingId,sku:x.sku||''}])).values()];
 const total=new Set(rows.map(x=>x.listingId)).size;let attempted=0,error=null;
 while(pending.length&&!cancelled()){
  const ids=new Set(),batch=[];while(pending.length&&batch.length<100&&(ids.size<20||ids.has(pending[0].listingId))){const x=pending.shift();ids.add(x.listingId);batch.push(x);}
  const left=new Set(rows.filter(x=>!x.details).map(x=>x.listingId)).size;progress({done:total-left,total,attempted,pending:left});
  let response;try{response=await request(batch);}catch(e){error=e.message;break;}
  if(!response?.ok||!Array.isArray(response.details)){error=response?.status||'Some listing details are unavailable.';break;}
  const allowed=new Set(batch.map(key));for(const d of response.details){if(!allowed.has(key(d))||!d.details)continue;for(const row of rows.filter(x=>key(x)===key(d))){row.details=d.details;row.detailsStatus=d.detailsStatus;row.detailsCheckedAt=d.detailsCheckedAt;}}
  const retry=(Array.isArray(response.retryRows)?response.retryRows:[]).filter(x=>allowed.has(key(x)));
  if(retry.length===batch.length&&!response.details.some(x=>x.details)){error='Detail service made no progress; prices and quantities are retained.';break;}
  pending.push(...retry);attempted+=batch.length-retry.length;
 }
 next.detailsPending=new Set(rows.filter(x=>!x.details).map(x=>x.listingId)).size;
 next.detailsMessage=cancelled()?'Detail fetching stopped. Prices and quantities are ready to review.':error|| (next.detailsPending?'Some details are unavailable; all reachable batches were attempted.':'All available listing details loaded.');
 progress({done:total-next.detailsPending,total,attempted,pending:next.detailsPending,finished:true});return next;
}
const api={complete};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetroListingLoader=api;
})(typeof globalThis!=='undefined'?globalThis:this);
