/* Live discovery uses public starter searches, independently of saved stock. */
(function(root){
'use strict';
const topics=[
 ['Games','PlayStation 2 game'],['Games','Game Boy Advance game'],['Games','Nintendo DS game'],
 ['Consoles','Nintendo Wii console'],['Consoles','PlayStation 2 console'],['Consoles','Nintendo DS console'],
 ['Accessories','Nintendo Wii Remote'],['Accessories','Sony DualShock controller'],['Accessories','Xbox controller']
];
const safeUrl=u=>typeof u==='string'&&u.length<=2048&&/^https:\/\/(?:www\.)?ebay\.co\.uk\/itm\/[a-zA-Z0-9/?&=._%+-]+$/.test(u);
function candidate(x,category,query){
 if(!x||!['Games','Consoles','Accessories'].includes(category)||!safeUrl(x.itemWebUrl)||x.currency!=='GBP'||!Number.isFinite(x.price)||x.price<=0||!x.buyingOptions?.includes('FIXED_PRICE')||typeof x.title!=='string'||!x.title.trim()||!Number.isFinite(Date.parse(x.checkedAt)))return null;
 return {itemId:typeof x.itemId==='string'?x.itemId.slice(0,200):x.itemWebUrl,title:x.title.slice(0,300),itemWebUrl:x.itemWebUrl,price:x.price,currency:'GBP',condition:typeof x.condition==='string'?x.condition.slice(0,120):'Check condition',shipping:Number.isFinite(x.shipping)&&x.shipping>=0?x.shipping:null,buyingOptions:['FIXED_PRICE'],checkedAt:x.checkedAt,category,query,environment:'production'};
}
function merge(rows,items,category,query){
 const result=rows.slice();let added=0;for(const x of items){const row=candidate(x,category,query);if(!row||result.some(r=>r.itemId===row.itemId))continue;if(added<2&&result.filter(r=>r.category===category).length<6){result.push(row);added++;}}return result;
}
const api={topics,candidate,merge};
if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}root.RetroDiscovery=api;
const install=root.RetroMarketplace.install;
root.RetroMarketplace.install=function(c){
 const original=install(c),view=original.opportunityView,e=c.escape,m=c.money;
 let attempted=false,scheduled=false,running=false,rows=[],message='Discovering live offers…',checkedAt=null;
 const $=s=>document.querySelector(s);
 function panel(){
  return '<div class="card"><h2>Discover live resale offers</h2><p>New eBay UK offers from nine starter searches across Games, Consoles and Accessories. This works with an empty inventory and watchlist. These are candidates to check, not confirmed profitable deals.</p><div class="toolbar"><button class="btn primary" onclick="opDiscover()" '+(running?'disabled':'')+'>Refresh live offers</button><button class="btn secondary" onclick="go(\'production\')">Seller connection</button></div><p id="discoveryStatus" role="status" aria-live="polite">'+e(message)+'</p><p class="muted">'+(checkedAt?'Last successful search: '+e(checkedAt)+'. ':'')+'Browse market access finds offers; the seller connection reads your own listings and sales. No background polling.</p><details><summary>Search coverage</summary><p>'+topics.map(x=>e(x[1])).join(' · ')+'</p><p>Starter coverage only. Use the exact-item search below for other products. Results are not a complete catalogue or a profit ranking.</p></details></div>'+
   ['Games','Consoles','Accessories'].map(cat=>{const group=rows.filter(x=>x.category===cat);return '<div class="card"><h3>'+cat+' · '+group.length+' discovered candidates</h3>'+group.map(x=>'<div class="row marketplace-row"><div><strong>'+e(x.title)+'</strong><p>Asking '+m(x.price)+' · postage '+(x.shipping===null?'unknown':m(x.shipping))+' · '+e(x.condition)+'</p><small>Found '+e(x.checkedAt)+' · exact CeX grade and all checkout costs still need checking.</small></div><div><a class="btn secondary" href="'+e(x.itemWebUrl)+'" target="_blank" rel="noopener noreferrer">View on eBay</a><button class="btn primary" onclick="opDiscoverReview('+rows.indexOf(x)+')">Check CeX &amp; costs</button></div></div>').join('')+(group.length?'':'<p>No live candidates loaded for this group yet.</p>')+'</div>';}).join('');
 }
 function update(){const box=$('#discoveryPanel');if(box)box.innerHTML=panel();}
 root.opDiscover=async()=>{
  if(c.demo||running||!$('#discoveryPanel'))return;attempted=true;running=true;let next=[],completed=0,successes=0,failure='';message='Searching live eBay UK offers…';update();
  try{
   for(const [category,q] of topics){
    if(!$('#discoveryPanel')){failure='Search paused after leaving this page.';break;}
    message='Searching '+category+' · '+q+' ('+(completed+1)+'/'+topics.length+')…';update();
    try{
     const response=await c.fetch('/api/ebay-search?'+new URLSearchParams({q})),d=await response.json();
     if(!response.ok||!d.ok||d.environment!=='production'){
      failure=d.environment==='sandbox'?'Only Sandbox market access is configured. Live discovery needs production Browse access.':(d.status||'eBay market access unavailable.');
      break;
     }
     if(!Array.isArray(d.items))throw Error('Invalid offer response');
     next=merge(next,d.items,category,q);successes++;completed++;
    }catch{failure='Live search could not complete. Check the Browse market connection and try again.';break;}
   }
   if(successes){rows=next;checkedAt=new Date().toISOString();}
   message=(successes?rows.length+' live candidates from '+successes+'/'+topics.length+' searches. ':'')+(failure?failure+(successes?'':' Existing results, if any, are retained with their original check times.'):'Choose a candidate to check CeX and costs.');
  }finally{running=false;update();}
 };
 root.opDiscoverReview=n=>{const row=rows[n];if(!row||c.demo)return;root.opReviewOffer({...row,query:row.title.slice(0,160)});};
 original.opportunityView=()=>{
  if(c.demo)return view();
  if(!attempted&&!scheduled&&!running){scheduled=true;setTimeout(()=>{scheduled=false;if($('#discoveryPanel'))root.opDiscover();},0);}
  return '<section id="discoveryPanel" aria-label="Live resale discovery">'+panel()+'</section>'+view().replace('Top 10 · eBay to CeX cash','Reviewed deals · eBay to CeX cash').replaceAll('No fully checked profitable offers yet. Unknown costs and stale evidence are excluded.','Check a discovered candidate above to build this ranking. Only reviewed profitable offers with complete, fresh evidence appear here.');
 };
 return original;
};
})(typeof globalThis!=='undefined'?globalThis:this);
