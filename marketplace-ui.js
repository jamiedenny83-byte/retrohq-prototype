/* Provider text is escaped; URLs are restricted before becoming links. */
(function(root){
'use strict';
function install(c){
 const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],e=c.escape,m=c.money;
 let stopDetails=false,detailsController=null;
 let busy=false,message=new URLSearchParams(location.search).get('ebayLive')==='error'?'Production authorisation did not complete. Check the production keyset / RuName and start again.':'',marketMessage='',draft=null,offers=[],cexCandidates=[];
 const state=()=>c.state,live=()=>state().liveEbay||{listings:[],orders:[],ledger:[]};
 const safeUrl=u=>/^https:\/\/(?:www\.)?ebay\.co\.uk\/itm\/[a-zA-Z0-9/?&=._%+-]+$/.test(u||'')?u:null;
 const external=u=>safeUrl(u)?'<a class="btn secondary" target="_blank" rel="noopener noreferrer" href="'+e(u)+'">View on eBay</a>':'';
 const fields=()=>all('input[name="liveStock"]:checked').map(x=>Number(x.value));
 const pickStock=filter=>state().items.filter(i=>RetroLive.available(i)&&(!filter||filter(i))).map(i=>'<label class="row marketplace-row"><input type="checkbox" name="liveStock" value="'+i.id+'"><span>'+e(i.title)+' · '+e(i.location||'Unassigned')+' · purchase '+(i.buy==null?'Unknown':m(i.buy))+'</span></label>').join('')||'<p>No available physical stock to match.</p>';
 function commit(next){RetroBackup.validate(next);c.commit(next);}
 function perform(fn){try{commit(fn());c.close();c.render();}catch(error){alert(error.message);}}
 const csvSetup=RetroStockCsvUI.install({state:c.state,commit,render:c.render,escape:e});
 const stockReview=RetroStockReview.install({state,commit,perform,render:c.render,open:c.open,close:c.close,escape:e,money:m});
 function liveView(){
  if(c.demo)return '<div class="card"><h2>Production eBay</h2><p>Return to your saved workspace to connect your real seller account.</p></div>';
  const l=live(),orders=[...l.orders];for(const row of l.ledger)if(!orders.some(x=>RetroLive.key(x)===row.key))orders.push(row.latest||row.imported);
  return csvSetup.view()+'<div class="card marketplace-connection"><h2>Production eBay · read only</h2><p>Fetch once. Link or add stock inline; each accepted line updates Inventory immediately.</p><div id="liveConnectionStatus" role="status">Checking production connection…</div><div class="toolbar"><input id="liveAdminPin" class="input" type="password" autocomplete="off" aria-label="Production administrator PIN" placeholder="Private administrator PIN"><button class="btn secondary" onclick="liveConnect()">Connect production seller</button><button class="btn primary" onclick="liveSync()" '+(busy?'disabled':'')+'>Fetch eBay</button><button class="btn secondary" onclick="exportWorkspace()">Export backup</button><button class="btn secondary" onclick="exportBeforeEbayInventory()">Pre-import recovery copy</button></div><p id="liveFetchProgress" role="status"></p><button id="liveFetchCancel" class="btn secondary" '+(busy?'':'hidden')+' onclick="liveStopDetails()">Stop loading details</button><p role="status">'+e(message)+'</p><p>Last checked: '+e(l.checkedAt?new Date(l.checkedAt).toLocaleString('en-GB'):'Never')+(l.partial?' · PARTIAL snapshot — automatic stock allocation paused':'')+'</p><details><summary>Production setup</summary><p>Keep the existing Codespace and private port 8006. Add a separate production keyset and RuName; keep all Sandbox settings.</p><p>Accepted production callback: <code>'+e(location.origin+'/ebay/live/callback')+'</code></p><p>Codespaces secrets: EBAY_LIVE_CLIENT_ID, EBAY_LIVE_CLIENT_SECRET, EBAY_LIVE_RUNAME. Keep RETROHQ_ADMIN_PIN. Restart the Codespace, then connect above. Never paste secrets into chat.</p><p>Scopes: api_scope and sell.fulfillment.readonly. Full steps are in docs/PRODUCTION_TRIAL.md.</p></details></div>'+
   stockReview.view()+'<details class="card"><summary>Advanced connection evidence and order exceptions</summary><div class="card"><h3>eBay inventory ('+l.listings.length+')</h3><p>Price and remaining quantity are eBay evidence at the checked time. Missing listings require verification; they never delete stock.</p>'+l.listings.map((x,n)=>{const linked=state().items.filter(i=>i.liveListingId===x.listingId&&(i.liveSku||'')===x.sku&&RetroLive.available(i));return '<div class="row marketplace-row"><div><strong>'+e(x.title)+'</strong><p>'+e(x.listingId)+' · SKU '+e(x.sku||'(none)')+' · '+(x.currency==='GBP'&&x.price!=null?m(x.price):'Price unavailable')+' · eBay quantity '+e(x.quantity??'unknown')+' · physical links '+linked.length+'</p>'+(x.quantity!==null&&x.quantity!==linked.length?'<small>Quantity difference — verify your physical allocation.</small>':'')+'</div><div>'+external('https://www.ebay.co.uk/itm/'+x.listingId)+' <button class="btn secondary" onclick="liveLink('+n+')">Link stock</button></div></div>';}).join('')+'</div>'+
   '<div class="card"><h3>Orders and review ('+orders.length+')</h3><p>Orders modified in the last 30 days. Fees and postage need actual cost confirmation. Refunds and cancellations never automatically restore physical stock.</p>'+orders.map((x,n)=>{const r=l.ledger.find(r=>r.key===RetroLive.key(x));return '<div class="row marketplace-row"><div><strong>'+e(x.title||x.orderId)+'</strong><p>'+e(x.orderId)+' · '+e(x.lineItemId)+' · quantity '+e(x.quantity)+' · '+(x.price==null?'Price unknown':m(x.price))+'</p><p>'+e(r?.outcome==='returned'?'Physically returned; refund reconciliation still required':r?.review?'REVIEW: order changed / cancelled / refunded':r?'Recorded in Sales':RetroLive.valid(x)?'Needs exact stock allocation':'Payment / cancellation / currency needs review')+'</p>'+(r?r.itemIds.map(id=>{const i=state().items.find(i=>i.id===id);return '<p>'+e(i?.title)+' · '+e(i?.location||'Unassigned')+' '+(!r.outcome?'<button class="btn secondary" onclick="editImportedCosts('+id+')">Actual costs</button>':'')+'</p>';}).join(''):'')+'</div><div>'+(!r&&RetroLive.valid(x)?'<button class="btn primary" onclick="liveMatch('+n+')">Match physical stock</button>':'')+(r&&!r.outcome&&!r.review&&r.itemIds.every(id=>{const i=state().items.find(i=>i.id===id);return i?.importOrigin==='order'&&i.buy===null&&i.processingCosts===null&&!i.editHistory?.length;})?'<button class="btn secondary" onclick="liveReplaceSale('+n+')">Match existing stock</button>':'')+(r?.review&&!r.outcome?'<button class="btn secondary" onclick="liveAccept('+n+')">Review revenue change</button><button class="btn secondary" onclick="liveReturn('+n+')">Record physical return</button>':'')+'</div></div>';}).join('')+'</div>'+
   '<div class="card"><h3>Sync review</h3>'+(l.issues?.length?l.issues.map(x=>'<p>'+e(x)+'</p>').join(''):'<p>No quantity or matching exceptions on the last sync.</p>')+'</div>'+'<details class="card"><summary>Physical stock links</summary>'+state().items.filter(i=>i.liveListingId).map(i=>'<div class="row marketplace-row"><span>'+e(i.title)+' · '+e(i.location||'Unassigned')+' · '+e(i.liveListingId)+' / '+e(i.liveSku||'(no SKU)')+' · '+e(i.liveSnapshot?.status||'Not yet checked')+'</span>'+(RetroLive.available(i)?'<button class="btn secondary" onclick="liveUnlink('+i.id+')">Unlink</button>':'')+'</div>').join('')+'</details></details>';
 }
 function orderAt(n){const orders=[...live().orders];for(const r of live().ledger)if(!orders.some(x=>RetroLive.key(x)===r.key))orders.push(r.latest||r.imported);return orders[n];}
 async function refresh(){if(c.demo||!$('#liveConnectionStatus'))return;const box=$('#liveConnectionStatus');try{const response=await c.fetch('/api/ebay-live/status'),d=await response.json();box.textContent='Production · '+d.status+(d.missing?.length?' · Setup needed: '+d.missing.join(', '):'');}catch{box.textContent='Production connection status unavailable.';}}
 async function action(path,extra={}){if(c.demo||busy)return null;const input=$('#liveAdminPin'),pin=input?.value;if(!pin){alert('Enter your private administrator PIN.');return null;}input.value='';busy=true;message='Contacting production eBay…';const status=$('#liveConnectionStatus');if(status)status.textContent=message;
  try{const response=await c.fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-RetroHQ-Action':'seller-oauth'},body:JSON.stringify({...extra,pin})}),d=await response.json();if(!response.ok||!d.ok)throw Error(d.status||'Production request failed.');return d;}catch(error){message=error.message;return null;}finally{busy=false;}
 }
 function salesView(){
  if(c.demo)return '';
  const l=live(),pending=l.orders.filter(x=>!l.ledger.some(r=>r.key===RetroLive.key(x))),review=l.ledger.filter(r=>r.review&&!r.outcome);
  return '<div class="card"><h3>eBay sales</h3><p>Paid orders appear here automatically on import. Historical sold records stay separate from current available stock. Purchase costs and estimated fees still need checking.</p><div class="toolbar"><input id="liveAdminPin" class="input" type="password" autocomplete="off" aria-label="Production administrator PIN" placeholder="Private administrator PIN"><select id="salesHistoryDays" class="select" aria-label="eBay sales history range">'+[[30,'30 days'],[90,'90 days'],[365,'1 year'],[730,'2 years']].map(([v,t])=>'<option value="'+v+'" '+((l.salesHistoryDays||90)===v?'selected':'')+'>'+t+'</option>').join('')+'</select><button class="btn primary" onclick="liveSalesSync()" '+(busy?'disabled':'')+'>Import eBay sales</button><button class="btn secondary" onclick="go(\'production\')">Stock links &amp; order review</button></div><p role="status">'+e(message)+'</p><p>'+l.ledger.filter(r=>!r.outcome).length+' paid order lines recorded · '+pending.length+' unimported order lines · '+review.length+' changed orders need review.</p><p>Sales history checked: '+e(l.salesHistoryCheckedAt?new Date(l.salesHistoryCheckedAt).toLocaleString('en-GB'):'Not yet')+'</p>'+(pending.length||review.length?'<details><summary>Payment and order exceptions</summary>'+pending.map(x=>'<p>'+e(x.orderId)+' · '+e(x.title)+' · '+e(x.paymentStatus)+' / '+e(x.cancelState)+(x.refundDetected?' · refund detected':'')+' · '+(x.currency||'unsupported currency')+'</p>').join('')+review.map(r=>'<p>'+e(r.imported.orderId)+' · previously recorded order changed; review before adjusting revenue or returning stock.</p>').join('')+'</details>':'')+'</div>';
 }
 root.liveSalesSync=async()=>{
  const days=Number($('#salesHistoryDays')?.value||90),d=await action('/api/ebay-live/orders',{days});if(!d){c.render();return;}
  try{
   if(d.orderTruncated)throw Error('More than 1,000 orders returned. Choose a shorter history range; no sales were imported.');
   const before=live().ledger.length,snapshot={...d,listings:live().listings||[],listingTruncated:false};
   const next=RetroLive.reconcile(state(),snapshot,{deferNew:true,importSalesHistory:true,ordersOnly:true});
   next.liveEbay.salesHistoryCheckedAt=d.checkedAt;next.liveEbay.salesHistoryDays=days;next.liveEbay.salesHistoryVersion=1;
   commit(next);c.showAllSales?.();message=(live().ledger.length-before)+' new paid order lines imported. Repeat imports do not duplicate sales. Review actual costs before relying on profit.';
  }catch(error){message='Previous saved workspace retained. '+error.message;}
  c.render();
 };
 root.liveConnect=async()=>{const d=await action('/api/ebay-live/start');if(d&&/^https:\/\/auth\.ebay\.com\/oauth2\/authorize\?/.test(d.authorizeUrl))location.assign(d.authorizeUrl);else c.render();};
 root.liveStopDetails=()=>{stopDetails=true;detailsController?.abort();};
 root.liveSync=async()=>{
  if(busy)return;let pin=$('#liveAdminPin')?.value;const d=await action('/api/ebay-live/snapshot');if(!d){c.render();return;}
  busy=true;stopDetails=false;detailsController=new AbortController();const cancel=$('#liveFetchCancel');if(cancel)cancel.hidden=false;
  try{
   const enriched=await RetroListingLoader.complete(d,async rows=>{const response=await c.fetch('/api/ebay-live/listing-details',{method:'POST',headers:{'Content-Type':'application/json','X-RetroHQ-Action':'seller-oauth'},body:JSON.stringify({pin,rows}),signal:detailsController.signal});const data=await response.json();if(!response.ok||!data.ok)throw Error(data.status||'Listing details unavailable.');return data;},progress=>{const box=$('#liveFetchProgress');if(box)box.textContent='Loading eBay details: '+progress.done+' / '+progress.total+' listings. Batches continue automatically.';},()=>stopDetails);
   commit(RetroStockSync.dailyInline(state(),enriched));message='eBay fetched. Paid orders are recorded in Sales. Add or link each new stock line below; accepted units appear in Inventory immediately. '+enriched.detailsMessage;
  }catch(error){message='Previous saved workspace retained. '+error.message;}
  finally{pin=null;detailsController=null;busy=false;c.render();}
 };
 root.liveLink=n=>{const x=live().listings[n];if(!x)return;c.open('<h2>Link exact physical units</h2><p>'+e(x.title)+' · '+e(x.listingId)+' · SKU '+e(x.sku||'(none)')+'</p><p>Confirm edition, platform, condition and included accessories yourself. Title similarity is never used for stock matching. Selecting existing owned units replaces untouched eBay-import placeholders so they are not counted twice.</p>'+pickStock()+'<div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="liveSaveLink('+n+')">Save physical links</button></div>');};
 root.liveSaveLink=n=>perform(()=>{const x=live().listings[n];return RetroLive.link(state(),x.listingId,x.sku,fields());});
 root.liveUnlink=id=>perform(()=>RetroLive.unlink(state(),id));
 root.liveMatch=n=>{const x=orderAt(n);if(!x)return;c.open('<h2>Match this paid order</h2><p>'+e(x.title)+' · '+e(x.orderId)+' · '+e(x.listingId)+' / '+e(x.sku)+'</p><p>Select exactly '+e(x.quantity)+' physical units. Confirm the listing and variation identity; this marks those units sold. A listing need not remain active.</p>'+pickStock()+'<div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="liveSaveMatch('+n+')">Confirm stock sold</button></div>');};
 root.liveSaveMatch=n=>perform(()=>RetroLive.apply(state(),RetroLive.key(orderAt(n)),fields()));
 root.liveReplaceSale=n=>{const x=orderAt(n);if(!x)return;c.open('<h2>Match imported sale to owned stock</h2><p>Select exactly '+e(x.quantity)+' existing physical records. Their purchase costs and history will be retained; the untouched imported sale records will be replaced.</p>'+pickStock()+'<div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="liveSaveReplaceSale('+n+')">Match existing stock</button></div>');};
 root.liveSaveReplaceSale=n=>perform(()=>RetroLive.replaceImportedSale(state(),RetroLive.key(orderAt(n)),fields()));
 root.liveAccept=n=>{if(confirm('Accept changed revenue / fee evidence? This keeps the same physical units and requires actual costs again. Refund, quantity and identity changes remain blocked.'))perform(()=>RetroLive.acceptChange(state(),RetroLive.key(orderAt(n))));};
 root.liveReturn=n=>{if(confirm('Have ALL allocated physical units been received back? Confirm to retain the original sale history and send every unit for inspection. This does not issue a refund on eBay.'))perform(()=>RetroLive.restore(state(),RetroLive.key(orderAt(n))));};
 const O=RetroOpportunities;
 const routeText=row=>e(O.routeLabel(row));
 function estimateHtml(row){
  const {purchase,proceeds,landed,knownNet,profit}=O.estimate(row),route=O.route(row);
  const known=Number.isFinite(knownNet);
  const result=profit===null?knownNet:profit;
  const caption=result<0?'Estimated loss':result>0?'Estimated profit':'Break even';
  return '<div class="notice"><strong>'+routeText(row)+'</strong><p>Purchase '+(Number.isFinite(purchase)?m(purchase):'unknown')+' · '
   +(route.cexRole==='sell'?'CeX cash quote ':'Expected sale price ')+(Number.isFinite(proceeds)?m(proceeds):'unknown')
   +(landed===null?'':' · Total costs '+m(landed))+'</p>'
   +(known?'<p><strong>'+caption+' '+m(Math.abs(result))+'</strong>'+(profit===null?' after entered costs · more costs to check':'')+'</p>'
    :'<p>Add a purchase price and sale quote or estimate to calculate the result.</p>')
   +(O.needsEditionCheck(row.sourceTitle)||O.needsEditionCheck(row.title)?'<p class="warning-text">Multicart or reproduction wording. Verify the exact product. Excluded from rankings.</p>':'')+'</div>';
 }
 function opportunityView(){
  if(c.demo)return '<div class="card"><h2>Resale opportunities</h2><p>Live provider research is disabled in the offline demo.</p></div>';
  const rows=state().opportunities?.rows||[];
  const rankedHtml=(row,n)=>'<div class="row marketplace-row"><div><strong>'+(n+1)+'. '+e(row.row.title)+'</strong><p>'+e(row.row.platform)+' · '+e(row.row.condition)+' · '+e(row.row.completeness)+'</p>'+estimateHtml(row.row)+'</div><button class="btn secondary" onclick="opEdit('+rows.indexOf(row.row)+')">Review evidence / costs</button></div>';
  return '<div class="card"><h2>Compare resale routes</h2><p>Choose where to buy and where to sell. Check the exact edition, purchase costs and sale evidence.</p><div class="toolbar"><input id="opQuery" class="input" placeholder="Exact item and platform"><select id="opCategory" class="select">'+O.categories.map(x=>'<option>'+x+'</option>').join('')+'</select><button class="btn primary" onclick="opSearch()">Search eBay UK</button><button class="btn secondary" onclick="opManual(&quot;cex-ebay&quot;)">Check a CeX purchase</button><button class="btn secondary" onclick="opManual()">Add offer manually</button></div><p id="opMessage" role="status">'+e(marketMessage)+'</p><div id="opOffers">'+offerHtml()+'</div></div>'+
   O.categories.map(category=>{const ranked=O.top(rows,category);return '<div class="card"><h3>'+category+' · Top '+ranked.length+' reviewed routes</h3>'+ranked.map(rankedHtml).join('')+(ranked.length?'':'<p>Review an offer to start ranking this category. Estimates need complete costs and current evidence.</p>')+'</div>';}).join('')+
   '<details class="card"><summary>Saved offers ('+rows.length+')</summary>'+rows.map((r,n)=>{const x=O.evaluate(r);return '<div class="row marketplace-row"><div><strong>'+e(r.title)+'</strong>'+estimateHtml(r)+'<p>'+e(x.eligible?'Eligible for ranking':x.reasons.join(' · '))+'</p></div><div><button class="btn secondary" onclick="opEdit('+n+')">Review</button><button class="btn secondary" onclick="opRemove('+n+')">Remove</button></div></div>';}).join('')+'</details>';
 }
 function offerHtml(){
  return offers.map((x,n)=>'<div class="row marketplace-row"><div><strong>'+e(x.title)+'</strong><p>Buy on eBay '+(x.currency==='GBP'&&x.price!=null?m(x.price):'Price unknown')+' · postage '+(x.shipping==null?'unknown':m(x.shipping))+'</p><small>Compare CeX cash or in-store resale</small></div><button class="btn secondary" onclick="opOffer('+n+')">Compare routes</button></div>').join('');
 }
 root.opSearch=async()=>{
  if(c.demo||busy)return;
  const q=$('#opQuery')?.value.trim();if(!q)return;
  const category=$('#opCategory').value,msgBox=$('#opMessage'),offerBox=$('#opOffers');
  busy=true;marketMessage='Searching eBay UK…';msgBox.textContent=marketMessage;
  try{
   const response=await c.fetch('/api/ebay-search?'+new URLSearchParams({q})),data=await response.json();
   if(!data.ok||data.environment!=='production')throw Error(data.status||'eBay market access unavailable.');
   offers=(data.items||[]).filter(x=>safeUrl(x.itemWebUrl)&&x.currency==='GBP'&&Number.isFinite(x.price)&&x.buyingOptions?.includes('FIXED_PRICE')).map(x=>({...x,category,query:q}));
   marketMessage=offers.length+' eBay offers to review.';
  }catch(error){offers=[];marketMessage=error.message;}
  finally{busy=false;if($('#opMessage')===msgBox){msgBox.textContent=marketMessage;offerBox.innerHTML=offerHtml();}}
 };
 const costLabels={purchase:'Purchase price',shipping:'Inbound postage',buyerFees:'Buyer / checkout fees',destination:'Selling postage / travel',repair:'Repair / replacement',risk:'Risk allowance',sellerFees:'Selling / payment fees'};
 const numberField=(id,label,value,readonly=false)=>'<label>'+label+' (£)<input id="'+id+'" class="input" type="number" min="0" step="0.01" value="'+e(value??'')+'" '+(readonly?'readonly':'')+'></label>';
 function editDraft(){
  cexCandidates=[];
  const r=draft,route=O.route(r),isCexBuy=route.cexRole==='buy',expected=route.cexRole!=='sell';
  const titleFields=[['title','Offer title'],['platform','Exact platform / revision'],['condition','Condition / grade'],['completeness','Edition / completeness / accessories']];
  if(!isCexBuy)titleFields.push(['url','eBay UK item URL']);
  c.open(`<h2>Review resale opportunity</h2><div id="opReviewForm">
   <label>Buy and sell route<select id="op-route" class="select" onchange="opChangeRoute(this.value)">${Object.keys(O.routes).map(key=>'<option value="'+key+'" '+((r.route||'ebay-cex')===key?'selected':'')+'>'+routeText({route:key})+'</option>').join('')}</select></label>
   <div id="opEstimate" role="status">${estimateHtml(r)}</div>
   <div class="formgrid">${titleFields.map(([key,label])=>'<label>'+label+'<input id="op-'+key+'" class="input" value="'+e(r[key]||'')+'"></label>').join('')}
    <label>Category<select id="op-category" class="select">${O.categories.map(x=>'<option '+(r.category===x?'selected':'')+'>'+x+'</option>').join('')}</select></label>
    ${expected?numberField('op-expectedSale',route.sell==='eBay'?'Expected eBay sale price':'Expected in-store sale price',r.expectedSale):''}
    ${expected?'<label>Sale price evidence<input id="op-saleEvidence" class="input" maxlength="240" value="'+e(r.saleEvidence||'')+'" placeholder="e.g. Recent sold comps or your shop sales"></label>':''}</div>
   ${route.cexRole?`<div class="toolbar"><label>Exact CeX product<input id="op-cexQuery" class="input" value="${e(r.query||r.title||'')}"></label><button class="btn secondary" onclick="opCexSearch()">Find CeX record</button></div><div id="opCexEvidence">${cexHtml()}</div>`:''}
   <h3>Costs for this route</h3><p>Enter zero for costs that do not apply.</p>
   <div class="formgrid">${O.requiredCosts(r).map(key=>numberField('op-cost-'+key,key==='destination'&&route.cexRole==='sell'?'Delivery / travel to CeX':costLabels[key],key==='purchase'&&isCexBuy?r.cex?.retail:r.costs?.[key],key==='purchase'&&isCexBuy)).join('')}</div>
   <label><input id="op-identityConfirmed" type="checkbox" ${r.identityConfirmed?'checked':''}> I checked the exact product, edition, grade and contents for this route.</label>
   <label><input id="op-available" type="checkbox" ${r.available?'checked':''}> I checked availability and the GBP purchase price.</label>
   ${expected?'<label><input id="op-saleConfirmed" type="checkbox" '+(r.saleCheckedAt?'checked':'')+'> I checked the expected sale price against the evidence above.</label>':''}
   <details><summary>Ranking settings</summary>${numberField('op-minProfit','Minimum profit to qualify',r.minProfit??2)}<p>This amount is the ranking threshold.</p></details>
   <p id="opReviewError" role="alert"></p>
   <div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="opSave()">Save reviewed route</button></div>
  </div>`);
  $('#opReviewForm').oninput=event=>{
   const id=event.target.id;
   if(['op-title','op-platform','op-condition','op-completeness','op-cexQuery'].includes(id))$('#op-identityConfirmed').checked=false;
   if(id==='op-cexQuery'&&draft.cex){
    draft.cex=null;
    $('#opCexEvidence').innerHTML=cexHtml();
    if(isCexBuy){$('#op-cost-purchase').value='';$('#op-available').checked=false;}
   }
   if(['op-cost-purchase','op-url'].includes(id))$('#op-available').checked=false;
   if(['op-expectedSale','op-saleEvidence'].includes(id)&&$('#op-saleConfirmed'))$('#op-saleConfirmed').checked=false;
   $('#opEstimate').innerHTML=estimateHtml(readDraft());
  };
 }
 function readDraft(){
  const number=id=>{const raw=$(id)?.value;return raw==null||raw===''?null:Number(raw);};
  const r={...draft,route:draft.route||'ebay-cex',costs:{}};
  for(const key of ['title','platform','condition','completeness','url'])r[key]=$('#op-'+key)?.value.trim()||'';
  r.category=$('#op-category').value;
  for(const key of O.requiredCosts(r))r.costs[key]=number('#op-cost-'+key);
  r.minProfit=number('#op-minProfit');
  r.expectedSale=number('#op-expectedSale');r.saleEvidence=$('#op-saleEvidence')?.value.trim()||'';
  r.identityConfirmed=$('#op-identityConfirmed').checked;r.available=$('#op-available').checked;
  if($('#op-cexQuery'))r.query=$('#op-cexQuery').value.trim();
  return r;
 }
 root.opChangeRoute=key=>{
  if(!Object.hasOwn(O.routes,key))return;
  const r=readDraft(),before=O.route(r);
  r.route=key;
  const after=O.route(r);
  if(before.buy!==after.buy){
   r.url='';r.costs={};r.available=false;delete r.sourceTitle;
   r.source=after.cexRole==='buy'?'CeX catalogue':'Manual eBay offer';
  }
  if(before.sell!==after.sell){
   delete r.costs.destination;delete r.costs.sellerFees;
   r.expectedSale=null;r.saleEvidence='';r.saleCheckedAt=null;
  }
  r.identityConfirmed=false;draft=r;editDraft();
 };
 function cexHtml(){
  const x=draft.cex,role=O.route(draft).cexRole;
  const value=role==='buy'?x?.retail:x?.cash;
  if(!x||!Number.isFinite(value))return '<p>Select the exact CeX record for this route.</p>';
  return '<p><strong>'+e(role==='buy'?'CeX retail purchase price':'CeX cash quote')+' '+m(value)+'</strong> · '+e(x.product)+' · '+e(x.category||'Check exact platform')+'</p><a target="_blank" rel="noopener noreferrer" href="https://uk.webuy.com/product-detail?id='+encodeURIComponent(x.productId)+'">View exact CeX record</a>';
 }
 root.opReviewOffer=x=>{
  if(!x||!safeUrl(x.itemWebUrl)||x.currency!=='GBP'||!Number.isFinite(x.price)||x.price<0||!x.buyingOptions?.includes('FIXED_PRICE'))return;
  draft={id:crypto.randomUUID(),route:'ebay-cex',title:x.title,sourceTitle:x.title,category:x.category,query:x.query,url:x.itemWebUrl,source:'eBay Browse',environment:'production',currency:x.currency,condition:x.condition,checkedAt:x.checkedAt,costs:{purchase:x.price,shipping:x.shipping},fixedPrice:true,available:false,identityConfirmed:false,minProfit:2};
  editDraft();
 };
 root.opOffer=n=>root.opReviewOffer(offers[n]);
 root.opManual=(route='ebay-cex')=>{
  draft={id:crypto.randomUUID(),route,title:'',source:O.route({route}).cexRole==='buy'?'CeX catalogue':'Manual eBay offer',environment:'production',currency:'GBP',category:$('#opCategory')?.value||'Games',costs:{},fixedPrice:true,minProfit:2};
  editDraft();
 };
 root.opEdit=n=>{draft=JSON.parse(JSON.stringify(state().opportunities.rows[n]));draft.available=false;draft.saleCheckedAt=null;editDraft();};
 root.opCexSearch=async()=>{
  if(c.demo||busy)return;
  const box=$('#opCexEvidence');if(!box)return;
  busy=true;box.textContent='Checking CeX catalogue…';
  try{
   const response=await c.fetch('/api/opportunity-cex?'+new URLSearchParams({q:$('#op-cexQuery').value})),data=await response.json();
   if(!box.isConnected)return;
   cexCandidates=data.candidates||[];
   box.innerHTML=cexCandidates.map((x,n)=>'<div class="row marketplace-row"><span>'+e(x.product)+' · '+e(x.category||'Check platform')+' · '+e(x.grade||'Check grade / edition')+'</span><button class="btn secondary" onclick="opCexSelect('+n+')">Use exact record</button></div>').join('')||'<p>'+e(data.status||'No exact record found.')+'</p>';
  }catch{if(box.isConnected)box.textContent='CeX unavailable. Previous evidence retained.';}
  finally{busy=false;}
 };
 root.opCexSelect=async n=>{
  const box=$('#opCexEvidence'),x=cexCandidates[n],r=draft;
  if(c.demo||busy||!x||!box)return;
  busy=true;
  try{
   const response=await c.fetch('/api/opportunity-cex?'+new URLSearchParams({q:$('#op-cexQuery').value,id:x.productId})),data=await response.json();
   if(!box.isConnected||r!==draft)return;
   const isBuy=O.route(r).cexRole==='buy';
   if(!data.ok||(isBuy?!data.retailVerified:!data.verified))throw Error('No '+(isBuy?'retail purchase price':'cash quote')+' available for this record.');
   draft.cex=data;
   $('#op-identityConfirmed').checked=false;
   if(isBuy){
    $('#op-cost-purchase').value=data.retail;
    $('#op-available').checked=false;
    if(!$('#op-title').value)$('#op-title').value=data.product;
   }
   box.innerHTML=cexHtml();$('#opEstimate').innerHTML=estimateHtml(readDraft());
  }catch(error){if(box.isConnected)box.textContent=error.message;}
  finally{busy=false;}
 };
 root.opSave=()=>{
  if(busy)return;
  try{
   const r=readDraft(),now=new Date().toISOString();
   if(!r.title||O.route(r).buy==='eBay'&&!safeUrl(r.url))throw Error('Enter an offer title and, for eBay purchases, a valid eBay UK item URL.');
   for(const value of [...Object.values(r.costs),r.expectedSale,r.minProfit]){
    if(value!==null&&(!Number.isFinite(value)||value<0))throw Error('Enter positive amounts or explicit zero.');
   }
   r.minProfit??=2;
   r.checkedAt=r.available?now:r.checkedAt;
   r.saleCheckedAt=$('#op-saleConfirmed')?.checked?now:null;
   const rows=(state().opportunities?.rows||[]).filter(x=>x.id!==r.id);
   rows.push(r);c.commit({...state(),opportunities:{rows}});c.close();c.render();
  }catch(error){$('#opReviewError').textContent=error.message;}
 };
 root.opRemove=n=>{if(confirm('Remove this saved research offer?')){const rows=state().opportunities.rows.slice();rows.splice(n,1);c.commit({...state(),opportunities:{rows}});c.render();}};
 return {liveView,salesView,opportunityView,refresh,get busy(){return busy;}};
}
root.RetroMarketplace={install};
})(typeof globalThis!=='undefined'?globalThis:this);
