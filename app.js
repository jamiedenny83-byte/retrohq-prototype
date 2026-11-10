(() => {
'use strict';
const demoMode=new URLSearchParams(window.location.search).get('demo')==='1';
const workspaceKey=demoMode?RetroDemo.storageKey:'retrohq.sandbox.v84';
// All provider requests in this app go through this guard during offline training.
const fetch=(...args)=>demoMode?Promise.reject(Error('Provider access is disabled in demo mode. Return to your saved workspace to use live valuations.')):window.fetch(...args);
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const money=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(n)||0);
const knownMoney=n=>n==null?'Unknown':money(n);
const knownPurchase=i=>Number.isFinite(i.buy)&&Number.isFinite(i.processingCosts);
const moneyUSD=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
const today=()=>new Date().toISOString().slice(0,10);
const factors={'Poor':0.55,'Good':0.85,'Excellent':1};
const stages=['Acquired','Preparing','Ready to list'];
const acquisitionCategories=['Video Game','Console','Trading Card','Toy','Clothing','Accessory','Collectible','Other'];
const manufacturers=['Sony','Nintendo','Microsoft','Sega','Atari','SNK','NEC','Bandai','Hasbro','Mattel','LEGO','The Pokémon Company','Wizards of the Coast','Konami','Bandai Namco','Ravensburger','Nike','Adidas','Other'];
const state={view:'dashboard',activeItem:1,activeTab:'Overview',creditIssued:115,reportPeriod:'today',settings:{offerPct:45,storeCreditBonus:15,greenMargin:45,yellowMargin:30,pin:'2468',accessoryAllowances:{cables:10},fees:{eBay:{type:'percent',value:12.8},Vinted:{type:'percent',value:0},'In Store EPOS':{type:'fixed',value:0},'Manual / Cash':{type:'fixed',value:0},Website:{type:'percent',value:2.5}}},customers:[{id:1,name:'Sarah Green',credit:72.5,ledger:[[today(),'Opening demo balance',72.5]]},{id:2,name:'Mark Taylor',credit:25,ledger:[[today(),'Opening demo balance',25]]}],items:[
{id:1,title:'Silent Hill 2',manufacturer:'Sony',category:'Video Game',source:'Car Boot Sale',buy:35,baseMarket:84,condition:'Good',acquiredCondition:'Good',status:'Needs cleaning',location:'Shelf A2',velocity:78,notes:'Complete with manual.',photos:1,processingCosts:0,listing:null,sale:null,timeline:[['Acquired','Purchased at car boot sale.']]},
{id:2,title:'Nintendo 64 Console',manufacturer:'Nintendo',category:'Console',source:'Trade In',buy:48,baseMarket:116,condition:'Poor',acquiredCondition:'Poor',status:'Needs testing',location:'Bench 1',velocity:90,notes:'Controller included.',photos:0,processingCosts:4,listing:null,sale:null,timeline:[['Acquired','Customer trade-in accepted.']]},
{id:3,title:'1994 Power Rangers Figure',manufacturer:'Bandai',category:'Toy',source:'Other Reseller',buy:8,baseMarket:33,condition:'Good',acquiredCondition:'Good',status:'Completed',location:'Cabinet T3',velocity:64,notes:'Loose figure.',photos:3,processingCosts:1,listing:{channel:'In Store EPOS',price:39.99,date:today()},sale:{channel:'In Store EPOS',price:39.99,feeType:'fixed',feeValue:0,shipping:0,packaging:0,date:today(),status:'Collected in store'},timeline:[['Acquired','Dealer purchase.'],['Sold','Sold in store.'],['Completed','Collected in store.']]},
{id:4,title:'Vintage Nike Sweatshirt',manufacturer:'Nike',category:'Clothing',source:'Charity Shop',buy:12,baseMarket:52,condition:'Good',acquiredCondition:'Good',status:'Needs photos',location:'Rail C1',velocity:72,notes:'1990s label, size L.',photos:0,processingCosts:2,listing:null,sale:null,timeline:[['Acquired','Charity shop sourcing.']]},
{id:5,title:'PS3 Game Bundle',manufacturer:'Sony',category:'Video Game',source:'Private Seller',buy:28,baseMarket:82,condition:'Excellent',acquiredCondition:'Good',status:'Sold',location:'Dispatch Bay',velocity:88,notes:'Four-title bundle.',photos:5,processingCosts:3,listing:{channel:'eBay',price:74.99,date:today()},sale:{channel:'eBay',price:74.99,feeType:'percent',feeValue:12.8,shipping:4.2,packaging:.8,date:today(),status:'Ready to dispatch'},timeline:[['Acquired','Private collection purchase.'],['Listed','Listed on eBay.'],['Sold','Awaiting dispatch.']]}
]};
const root=$('#root'), modal=$('#modal'), backdrop=$('#backdrop');
const demoDefaults=demoMode?RetroDemo.seed(state):null;
if(demoMode){Object.assign(state,demoDefaults);state.view='sales';document.querySelector('header .demo').textContent='TEST 8.4 · OFFLINE DEMO';document.title='RetroHQ · OFFLINE DEMO';}
const meta={production:['Production eBay','Shared inventory and sales, updated from your eBay account.'],opportunities:['Resale opportunities','Top 10 per category using checked CeX cash and landed costs.'],dashboard:['Dashboard','HQ Today, workflow status and business health.'],acquisitions:['Acquisitions','Fast buying decisions with consistent rules.'],inventory:['Inventory','Available stock only.'],soldInventory:['Sales','Sales, sold stock, receipts and fulfilment.'],epos:['EPOS','In-store checkout and payment.'],processing:['Processing','Priority queue for work in progress.'],sales:['Sales','Sales and fulfilment linked to inventory.'],customers:['Trade Accounts','Customer details, purchases and store credit.'],customerNew:['New customer account','Enter the customer details.'],customerDetail:['Customer account','Purchase activity and store credit.'],market:['HQ Market','Live readings, tracked prices and measured market movement.'],reports:['Reports','Margin, velocity and sales outcomes.'],settings:['Settings','Business rules and fee presets.'],item:['Item Workspace','One item. One record. One lifecycle.']};
const pill=(t,c='')=>`<span class="pill ${c}">${t}</span>`;
const metric=(a,b,c,action='')=>action?`<button class="metric" onclick="${action}"><span>${a}</span><strong>${b}</strong><small>${c}</small></button>`:`<div class="metric"><span>${a}</span><strong>${b}</strong><small>${c}</small></div>`;
function marketValue(i){if(i.valuation?.finalValue!=null)return Math.round(Number(i.valuation.finalValue)*100)/100;const base=Number(i.baseMarket)||0;return i.marketIsConditionSpecific?Math.round(base*100)/100:Math.round(base*(factors[i.condition]||.85)*100)/100;}
function acquisitionValue(i){return i.valuation?.acquisitionValue!=null?Number(i.valuation.acquisitionValue):marketValue(i);}
function missingEssentials(i){if(!i.accessories)return [];const p=i.valuation?.profile||{};const out=[];if(p.controller&&i.accessories.controller===false)out.push('Controller');if(p.cables&&i.accessories.cables===false)out.push('Cables');return out;}
function itemSignals(i){const out=[];if(!knownPurchase(i))out.push(['Costs unknown','warn']);if(needsPriceCheck(i))out.push(['Price check needed','warn']);const miss=missingEssentials(i);if(miss.length)out.push(['Missing '+miss.join(' + '),'warn']);if(i.status==='Ready to list')out.push(['Ready to list','good']);if(['Sold','Packaged'].includes(i.status)&&i.sale)out.push(['Ready to dispatch','warn']);if(i.status==='Needs repair'&&i.returns?.length)out.push(['Returned','warn']);if(i.valuation?.confidence==='adjusted')out.push(['Smart value','good']);return out;}
function signalHtml(i){const x=itemSignals(i);return x.length?`<div class="item-signals">${x.slice(0,3).map(v=>pill(v[0],v[1])).join('')}</div>`:'';}
function workflowTasks(){
 const tasks=[];
 state.items.forEach(i=>{
   if(i.stockRemoval||i.importHold||RetroItems.sold(i)&&!['Sold','Packaged'].includes(i.status))return;let task=null;
   if(['Sold','Packaged'].includes(i.status)&&i.sale)task={rank:1000,label:'Dispatch sold item',detail:i.title,item:i};
   else if(needsPriceCheck(i))task={rank:900,label:'Check price',detail:i.title,item:i};
   else {const miss=missingEssentials(i);if(miss.length)task={rank:875,label:'Resolve missing '+miss.join(' / '),detail:i.title,item:i};}
   if(!task&&['Acquired','Preparing'].includes(i.status))task={rank:700,label:'Prepare item',detail:i.title,item:i};
   if(!task&&i.status==='Ready to list')task={rank:850,label:'List this item',detail:i.title,item:i};
   else if(!task&&i.status?.startsWith('Needs'))task={rank:700+score(i),label:i.status.replace('Needs ','') ,detail:i.title+' · HQ '+score(i),item:i};
   if(!task&&RetroOps.active(i)&&i.listing&&RetroOps.age(i.listing.date)>=30)task={rank:800,label:'Review slow listing',detail:i.title,item:i};if(task){if(RetroOps.active(i)&&RetroOps.age(i.acquiredDate)>=30)task.rank+=Math.min(100,RetroOps.age(i.acquiredDate));tasks.push(task);}
 });
 return tasks.sort((a,b)=>b.rank-a.rank);
}
window.openWorkflowTask=id=>{const i=state.items.find(i=>i.id===id);if(!i)return;if(i.sale)return openItem(id,'Sales');if(needsPriceCheck(i))return checkItemMarket(id);openItem(id);};
function lifecycleStrip(i){const core=['Acquired','Preparing','Ready to list','Listed','Sold','Completed'],current=['Packaged','Dispatched','Delivered'].includes(i.status)?'Sold':RetroItems.stage(i),idx=core.indexOf(current);return `<div class="lifecycle-strip">${core.map((x,n)=>`<span class="${n<idx?'done':n===idx?'current':''}">${x}</span>`).join('')}</div>`;}
function valuationSummary(i){const v=i.valuation;if(!v)return `<div class="card"><h3>Valuation</h3><p class="muted">${i.needsValuation?'Needs valuation.':'Legacy valuation — no stored evidence breakdown yet.'}</p><strong>${i.needsValuation?'Unknown':money(marketValue(i))}</strong></div>`;const adjustments=(v.adjustments||[]);return `<div class="card valuation-summary"><div class="head"><h3>RetroHQ valuation</h3>${pill(v.confidence==='adjusted'?'Smart value':'Recorded value',v.confidence==='adjusted'?'good':'')}</div><div class="row"><span>${v.benchmarkLabel||'UK benchmark'}</span><strong>${money(v.benchmark)}</strong></div>${adjustments.map(a=>`<div class="row"><span>${a.label}</span><strong>−${money(a.amount)}</strong></div>`).join('')}<div class="row total"><span>RetroHQ UK Market Value</span><strong>${money(v.finalValue)}</strong></div>${(v.unresolved||[]).length?`<small class="warning-text">Still unresolved: ${v.unresolved.join(', ')}</small>`:''}<small class="muted">Captured ${v.timestamp||'during acquisition'} · ${v.source||'RetroHQ evidence'}</small></div>`;}
function daysToSell(i){if(!i.sale?.date||!i.acquiredDate)return null;return Math.max(0,Math.floor((new Date(i.sale.date)-new Date(i.acquiredDate))/(86400000)));}

function expected(i){if(!knownPurchase(i)||i.needsValuation)return {mv:marketValue(i),profit:null,margin:null};const mv=marketValue(i),fee=state.settings.fees.eBay?.type==='fixed'?state.settings.fees.eBay.value:mv*((state.settings.fees.eBay?.value||0)/100),cost=i.buy+i.processingCosts+fee,profit=mv-cost,margin=mv?profit/mv*100:0;return{mv,profit,margin};}
function soldEcon(i){return i.sale?{mv:i.sale.price,...RetroOps.economics(i)}:expected(i);}
function marginClass(v){return v>=state.settings.greenMargin?'margin-green':v>=state.settings.yellowMargin?'margin-yellow':'margin-red';}
function marginBadge(v){if(v==null)return pill('Costs / order review','warn');const label=v>=state.settings.greenMargin?'Within target':v>=state.settings.yellowMargin?'Below target':'Outside rules';return `<span class="margin-badge ${marginClass(v)}"><strong>${v.toFixed(1)}%</strong><small>${label}</small></span>`;}
function stockPriceEstimate(i){
 return needsPriceCheck(i)||!(independentMarketValue(i)>0)?null:expected(i);
}
function itemHQScore(i){
 const margin=i.sale?soldEcon(i).margin:stockPriceEstimate(i)?.margin;
 return RetroOps.hqScore(margin,i.velocity);
}
function score(i){return itemHQScore(i)??0;}
function hqMeter(label,value,detail){
 return `<div class="hq-meter"><div class="hq-meter-heading"><strong>${label}</strong><b>${value===null?'Not enough data':value+' / 100'}</b></div>
 ${value===null?'<div class="hq-meter-track hq-meter-empty" aria-hidden="true"></div>':
 `<div class="hq-meter-track" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}" style="--score:${value}%"><span></span></div>`}
 <small class="muted">${detail}</small></div>`;
}
const marginText=value=>value===null?'—':value.toFixed(1)+'%';
function acquisitionIntel(base,cond,paid=0,velocity=75){const conditionValue=Math.round((Number(base)||0)*(factors[cond]||.85)*100)/100;const recommended=Math.round(conditionValue*(state.settings.offerPct/100)*100)/100;const actual=Number(paid)||recommended;const margin=conditionValue?(conditionValue-actual)/conditionValue*100:0;const hq=Math.round(Math.min(100,Math.max(0,velocity*.55+Math.max(0,margin)*.675)));return{conditionValue,recommended,margin,hq};}
function completionClass(i){return i.status==='Completed'?'good':'warn';}

function salePeriodMatch(i){return !!i.sale&&RetroOps.reportPeriod(i.sale.date,state.reportPeriod);}
function reportPeriodLabel(){return ({today:'Today','7':'Last 7 days','30':'Last 30 days',all:'All saved sales'})[state.reportPeriod]||'Today';}
function periodButtons(){
  return `<div class="segmented">
    <button class="${state.reportPeriod==='today'?'active':''}" onclick="setReportPeriod('today')">Today</button>
    <button class="${state.reportPeriod==='7'?'active':''}" onclick="setReportPeriod('7')">7 days</button>
    <button class="${state.reportPeriod==='30'?'active':''}" onclick="setReportPeriod('30')">30 days</button>
    <button class="${state.reportPeriod==='all'?'active':''}" onclick="setReportPeriod('all')">All saved sales</button>
  </div>`;
}

function open(html){RetroCapture.stop();modal.innerHTML=html;backdrop.classList.remove('hidden');}
function closeModal(){RetroCapture.stop();persistState();backdrop.classList.add('hidden');modal.innerHTML='';}
function go(v){if(v==='soldInventory')v='sales';state.view=v;$$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===v||b.dataset.view==='customers'&&['customerNew','customerDetail'].includes(v)));$('#title').textContent=meta[v][0];$('#subtitle').textContent=meta[v][1];$('#sidebar').classList.remove('open');render();if(v==='epos')$('#eposSearch')?.focus();}
function salesTable(items){return `<div class="card tablewrap"><p class="muted">Sold for is the actual item revenue. Marketplace fees are separate from purchase and preparation costs. Estimated fees do not confirm profit.</p><table class="table"><thead><tr><th>Item / sold date</th><th>Sold for</th><th>Marketplace fee</th><th>Buy</th><th>Preparation</th><th>Net profit</th><th>Lifecycle</th><th>Costs</th></tr></thead><tbody>${items.map(i=>{const s=i.sale,a=RetroOps.saleAmounts(i,state.settings.fees.eBay),econ=RetroOps.economics(i);return `<tr class="click" onclick="openItem(${i.id},'Sales')"><td><strong>${escapeText(i.title)}</strong><small class="table-note">${escapeText(s.date||'Date unknown')} · ${escapeText(s.channel||'Channel unknown')}</small><small class="table-note">${i.liveListingId?'Listing '+escapeText(i.liveListingId)+' · ':''}${escapeText(i.liveSku||'')}</small></td><td><strong>${knownMoney(a.price)}</strong><small class="table-note">Item revenue${Number.isFinite(s.shippingRevenue)?' · buyer postage '+money(s.shippingRevenue):' · buyer postage unknown'}</small>${!i.needsValuation&&Number.isFinite(i.valuation?.finalValue??i.baseMarket)?'<small class="table-note">Reference value '+money(marketValue(i))+'</small>':''}</td><td><strong>${knownMoney(a.fee)}</strong><small class="table-note">${a.fee===null?'Fee not set':(a.feeType==='percent'?a.feeValue+'% · ':'')+(a.estimated?'Estimated · business default':s.costsConfirmed?'Confirmed':'Recorded fee')}</small></td><td>${knownMoney(i.buy)}</td><td>${knownMoney(i.processingCosts)}<small class="table-note">Cleaning / repair etc.</small></td><td>${econ.profit===null?pill(s.reviewNeeded?'Order review':'Costs need review','warn'):'<strong>'+money(econ.profit)+'</strong>'+marginBadge(econ.margin)}</td><td>${pill(i.status||'Sold',completionClass(i))}</td><td><button class="btn secondary" onclick="event.stopPropagation();editImportedCosts(${i.id})">Review costs</button></td></tr>`;}).join('')}</tbody></table></div>`;}
function table(items){return `<div class="card tablewrap"><table class="table"><thead><tr><th>Item</th><th>Manufacturer</th><th>Condition</th><th>Buy</th><th>Market</th><th>Margin</th><th>HQ</th><th>Lifecycle</th><th>Sales</th></tr></thead><tbody>${items.map(i=>{const e=i.sale?soldEcon(i):expected(i);return `<tr class="click" onclick="openItem(${i.id})"><td><strong>${i.title}</strong><div class="muted">${i.category} · ${i.location}</div>${signalHtml(i)}</td><td>${i.manufacturer||'—'}</td><td>${i.condition}</td><td>${knownMoney(i.buy)}</td><td><strong>${knownMoney(independentMarketValue(i))}</strong>${ebayListedPrice(i)!=null?'<small class="table-note">eBay listed '+money(ebayListedPrice(i))+'</small>':''}${i.valuation?.ebayComparable?'<small class="table-note">Selected eBay asking price</small>':i.valuation?.confidence==='adjusted'?'<small class="table-note">Smart value</small>':''}${RetroCheckout.available(i)?`<button class="btn secondary edit-value" onclick="event.stopPropagation();checkItemMarket(${i.id})">Check price</button>`:''}</td><td>${marginBadge(e.margin)}</td><td>${itemHQScore(i)??'—'}</td><td>${pill(i.status||'Acquired',completionClass(i))}</td><td>${i.sale?.channel||i.listing?.channel||'—'}</td></tr>`}).join('')}</tbody></table></div>`;}
function stockSystem(i){return RetroOps.stockSystem(i);}

function listedBelowMarket(items){
 const warnings=[];
 for(const item of items){
  if(item.status!=='Listed'||!item.listing||item.valuation?.stale||/^Not in active snapshot/i.test(item.liveSnapshot?.status||''))continue;
  if(item.valuation?.ebayComparable)continue;
  const market=independentMarketValue(item),ebay=ebayListedPrice(item);
  const ask=ebay??item.listing.price;
  if(!Number.isFinite(market)||market<=0||!Number.isFinite(ask)||ask<0)continue;
  const gap=Math.round(market*100)-Math.round(ask*100);
  if(gap<=0)continue;
  warnings.push({item,ask,market,gap,channel:ebay!==null?'eBay':item.listing.channel||'Local listing'});
 }
 warnings.sort((a,b)=>b.gap-a.gap||a.item.id-b.item.id);
 const row=({item,ask,market,gap,channel})=>`<div class="row"><div><strong>${escapeText(item.title)}</strong>
  <small class="table-note">${escapeText(channel)} ${money(ask)} · HQ ${money(market)}</small></div>
  <div><strong>${money(gap/100)} below</strong> <button class="btn secondary" onclick="openItem(${item.id})">Review item</button></div></div>`;
 return `<section class="card" id="belowMarketListings"><div class="head"><h3>Listed below market value</h3>${pill(warnings.length+' to review',warnings.length?'warn':'good')}</div>
  <p class="muted">Compares saved listing prices with current HQ values. Check the edition, condition and latest market evidence before changing a price.</p>
  ${warnings.length?warnings.slice(0,5).map(row).join(''):'<p>No underpriced listings found among items with a usable HQ value.</p>'}
  ${warnings.length>5?'<details><summary>Show '+(warnings.length-5)+' more</summary>'+warnings.slice(5).map(row).join('')+'</details>':''}</section>`;
}
function dashboard(){
 const tasks=workflowTasks(),periodSales=state.items.filter(salePeriodMatch),salesValue=periodSales.reduce((a,i)=>a+(i.sale?.price||0),0);
 const stock=state.items.filter(RetroCheckout.available),stockValue=stock.reduce((a,i)=>a+(i.needsValuation?0:marketValue(i)),0),capital=stock.reduce((a,i)=>a+(Number.isFinite(i.buy)?i.buy:0),0);
 const needsValue=stock.filter(needsPriceCheck).length;
 const scored=stock.map(itemHQScore).filter(value=>value!==null);
 const overall=scored.length?Math.round(scored.reduce((total,value)=>total+value,0)/scored.length):null;
 const estimates=stock.map(stockPriceEstimate).filter(estimate=>Number.isFinite(estimate?.profit));
 const pricedValue=estimates.reduce((total,estimate)=>total+estimate.mv,0);
 const stockMargin=pricedValue?100*estimates.reduce((total,estimate)=>total+estimate.profit,0)/pricedValue:null;
 const actual=RetroOps.confirmedSalesSummary(periodSales);
 const coverage=actual.count+' of '+periodSales.length+' sold units with confirmed costs';
 const categories={};stock.forEach(i=>categories[i.category]=(categories[i.category]||0)+1);const systemRows=RetroOps.systemStock(state.items);
 return `<div class="hero"><div><small>RetroHQ · Test 8.4</small><h2>HQ Today</h2><p>Your business control panel — buy, stock, process, sell, return and learn.</p></div><button class="btn primary" onclick="buyCheck()">🔎 Acquire / Value Item</button></div>
 <section class="card hq-store-summary" aria-label="Store overview">
 ${hqMeter('Overall HQ score',overall,`${scored.length} of ${stock.length} available items scored · margin and estimated selling speed`)}
 ${metric('Expected stock margin',marginText(stockMargin),`${estimates.length} of ${stock.length} items priced with known costs · estimated eBay fees, before postage and packaging`)}
 </section>
 <p class="muted">Current inventory · live stock snapshot</p><div class="grid metrics clickable-metrics">${metric('Items in stock',stock.length,'Open inventory →',"go('inventory')")}${metric('Current stock value',money(stockValue),`${needsValue} item(s) still need a value`,"go('inventory')")}${metric('Known capital in stock',money(capital),stock.filter(i=>!Number.isFinite(i.buy)).length+' item(s) have unknown purchase costs')}</div><div class="card dashboard-sales"><div class="head"><h3>Sales performance</h3><span>${reportPeriodLabel()}</span></div>${periodButtons()}<div class="grid metrics clickable-metrics">${metric('Sales value',money(salesValue),reportPeriodLabel(),"go('sales')")}${metric('Items sold',periodSales.length,reportPeriodLabel(),"go('sales')")}${metric('Average sales margin',marginText(actual.margin),coverage)}${metric('Confirmed profit',knownMoney(actual.profit),coverage)}</div><p class="muted">Sales margin is confirmed profit divided by confirmed sales revenue in this period. Stock figures show current available inventory.</p></div>
 ${listedBelowMarket(stock)}
 <div class="grid two"><div class="card"><div class="head"><h3>What should I do next?</h3>${pill('Live workflow','good')}</div><div class="list">${tasks.slice(0,6).map(t=>`<div class="row"><button onclick="openWorkflowTask(${t.item.id})"><strong>${t.label}</strong><span class="table-note">${escapeText(t.detail)}</span></button>${pill('Priority',t.rank>=850?'warn':'')}</div>`).join('')}${!tasks.length?'<p class="muted">No urgent workflow tasks.</p>':''}</div></div>
 <div class="card stock-health"><div class="head"><h3>Stock health</h3>${pill('Live inventory','good')}</div><div class="stock-mix">${Object.entries(categories).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<span><strong>${v}</strong> ${k}</span>`).join('')||'<span>No active stock</span>'}</div><h4>Games & consoles by platform</h4><p class="muted">Current available units, using each item’s latest saved category. A platform can contain both games and consoles.</p><div class="system-stock">${systemRows.map(x=>`<button onclick="filterSystem('${encodeURIComponent(x.platform).replace(/'/g,'%27')}')"><span>${escapeText(x.platform)}</span><strong>${x.total}</strong><small>${x.games} ${x.games===1?'game':'games'} · ${x.consoles} ${x.consoles===1?'console':'consoles'}</small>${x.total<=3?'<small>Low stock</small>':''}</button>`).join('')||'<p class="muted">Platform information appears when available in your stock details.</p>'}</div></div></div>`;
}
function acquisitions(){return `<div class="hero"><div><h2>Acquisition Engine</h2><p>One intelligent route for normal buying, with Quick Capture when speed matters more than research.</p></div><div class="hero-actions"><button class="btn primary" onclick="buyCheck()">🔎 Acquire / Value Item</button></div></div><div class="grid actions"><button class="action" onclick="tradeIn()"><span class="action-icon">🏪</span><strong>Trade in</strong><span>Cash, store credit or mixed payment.</span></button><button class="action" onclick="bundleModal('Sourcing Trip',false)"><span class="action-icon">🚗</span><strong>Sourcing trip</strong><span>Add multiple items under one trip.</span></button><button class="action" onclick="bundleModal('Other Reseller',false)"><span class="action-icon">🤝</span><strong>Other reseller</strong><span>Same margin and HQ rules.</span></button><button class="action" onclick="go('production')"><span class="action-icon">⇧</span><strong>Import stock</strong><span>Existing database migration path.</span></button></div>${table(state.items.filter(RetroCheckout.available))}`;}
function inventoryTable(items){
 const groups=new Map();for(const i of items){const k=i.liveListingId?'ebay:'+i.liveListingId:i.stockSku?'sku:'+i.stockSku:'unit:'+i.id;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);}
 if(!items.length)return '<div class="card"><p>No available stock. Confirm an import line to add its units, or record an acquisition.</p><button class="btn primary" onclick="go(\'production\')">Open import stock</button></div>';
 return [...groups.values()].map(units=>{if(units.length===1)return table(units);const first=units[0],values=units.filter(i=>!i.needsValuation).map(marketValue),value=values.length===units.length?(Math.min(...values)===Math.max(...values)?money(values[0]):money(Math.min(...values))+' – '+money(Math.max(...values))):'Some values unknown';return '<details class="card"><summary><strong>'+escapeText(first.title)+'</strong> · Quantity '+units.length+' · '+value+' per unit</summary><p>Stock group '+escapeText(first.liveListingId||first.stockSku)+' · SKUs '+escapeText([...new Set(units.map(i=>i.liveSku||'(none)'))].join(', '))+'. Each physical copy keeps its purchase cost, location and history.</p>'+table(units)+'</details>';}).join('');
}
function inventory(){return `<div class="toolbar"><button class="btn primary" onclick="go('production')">Import stock</button><button class="btn secondary" onclick="go('sales')">Sales</button><input class="input" id="search" placeholder="Search items" oninput="filterItems()"><select class="select" id="cat" onchange="filterItems()"><option value="">All categories</option><option>Video Game</option><option>Console</option><option>Trading Card</option><option>Toy</option><option>Clothing</option><option>Accessory</option><option>Collectible</option></select><select class="select" id="attention" onchange="filterItems()"><option value="">All workflow states</option><option value="valuation">Needs price check</option><option value="missing">Missing essentials</option><option value="ready">Ready to list</option></select><button class="btn secondary" onclick="bulkStock()">Organise selected stock</button>${managerControl()}${managerActive()?'<button class="btn secondary" onclick="removedStock()">Removed stock ('+state.items.filter(i=>i.stockRemoval).length+')</button>':''}</div>${state.systemFilter?'<p>Platform: '+escapeText(state.systemFilter)+' <button class="btn secondary" onclick="clearSystemFilter()">Show all platforms</button></p>':''}<div id="results">${inventoryTable(state.items.filter(i=>RetroCheckout.available(i)&&(!state.systemFilter||['Video Game','Console'].includes(i.category)&&stockSystem(i)===state.systemFilter)))}</div>`;}
function soldInventory(){return `<div class="toolbar"><button class="btn secondary" onclick="go('inventory')">Back to live inventory</button><input class="input" id="search" placeholder="Search sold items" oninput="filterItems()"></div><div id="results">${table(state.items.filter(RetroItems.sold))}</div>`;}
function processing(){const items=state.items.filter(i=>RetroCheckout.available(i)&&i.status!=='Listed');return `${operationsPanel()}<div class="hero"><div><h2>Prepare stock</h2><p>Acquired → Preparing → Ready to list. Clean, test, repair, photograph and price as needed.</p></div></div>${['Acquired','Preparing','Ready to list'].map(stage=>`<div class="card"><h3>${stage}</h3>${items.filter(i=>RetroItems.stage(i)===stage).map(i=>`<div class="row"><button onclick="openItem(${i.id},'Processing')"><strong>${escapeText(i.title)}</strong><small>${signalHtml(i)}</small></button><button class="btn secondary" onclick="openItem(${i.id},'Processing')">Open</button></div>`).join('')||'<p class="muted">No items.</p>'}</div>`).join('')}`;}
function sales(){
 const sold=state.items.filter(i=>i.sale).sort((a,b)=>String(b.sale.date).localeCompare(String(a.sale.date))), filtered=sold.filter(salePeriodMatch);
 if(demoMode)return ebaySalesPanel()+`<details class="card sale-details"><summary>All recorded sample sales (${sold.length} items)</summary>${salesTable(sold)}</details>`;
 return `<div class="head"><div><h2>Sales</h2><p class="muted">Sales are part of the same item lifecycle.</p></div></div>
 ${periodButtons()}
 <div class="grid metrics">
 ${metric('Sales value',money(filtered.reduce((a,i)=>a+i.sale.price,0)),reportPeriodLabel())}
 ${metric('Items sold',filtered.length,'Selected period')}
 ${metric('Trade credit outstanding',money(state.customers.reduce((a,c)=>a+c.credit,0)),'Across trade accounts')}
 </div>
 <div class="toolbar"><button class="btn primary" onclick="go('production')">Production eBay listings &amp; orders</button></div>${marketplace.salesView()}${pickingQueue()}${transactionHistory()}<div class="toolbar"><input id="salesSearch" class="input" placeholder="Search sold items, listing ID or SKU" oninput="filterSales()"></div><p class="muted">Sales totals, receipts and the sold-item list follow the selected period. The shipping queue includes all outstanding orders.</p><div id="salesResults">${salesTable(filtered)}</div>
 <details class="card"><summary>Legacy sold records awaiting reconciliation</summary>${table(state.items.filter(i=>!i.sale&&['Sold','Packaged','Dispatched','Delivered','Completed'].includes(i.status)))}</details><div class="card"><h3>Sales workflow</h3><p class="muted">Recording a sale updates the item lifecycle automatically. In-store collected sales complete immediately; online sales move to Sold / dispatch workflow.</p></div>`;
}
window.filterSales=()=>{const q=($('#salesSearch')?.value||'').toLowerCase();$('#salesResults').innerHTML=salesTable(state.items.filter(i=>salePeriodMatch(i)&&[i.title,i.liveListingId,i.liveSku,i.location].join(' ').toLowerCase().includes(q)).sort((a,b)=>String(b.sale.date).localeCompare(String(a.sale.date))));};
function transactionCustomerLink(transaction){
 const customer=state.customers.find(c=>c.id===transaction.customerId);
 return customer?'<button class="btn secondary" onclick="tradeAccount('+customer.id+')">'+escapeText(customer.name)+'</button>':'';
}
function transactionHistory(){return '<details class="card"><summary>Sale transactions</summary>'+((state.transactions||[]).filter(t=>RetroOps.reportPeriod(t.date.slice(0,10),state.reportPeriod)).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(t=>'<div class="row"><div><strong>'+escapeText(t.channel)+' · '+escapeText(t.date)+'</strong><p>'+t.lines.map(l=>escapeText(state.items.find(i=>i.id===l.id)?.title||'Item')).join(' + ')+'</p><small>'+escapeText(t.id)+(t.outcome?' · Returned':t.review?' · Order review':'')+(t.source==='ebay-production'?' · Imported eBay sale':'')+' · Discount '+money(t.discount/100)+' · Trade credit '+money(t.credit/100)+(t.payment?' · '+({card:'Card',cash:'Cash','store-credit':'Store credit','no-charge':'No charge'}[t.payment.method]):'')+'</small>'+transactionCustomerLink(t)+'</div><strong>'+money(t.total/100)+'</strong></div>').join('')||'<p>No basket transactions recorded yet.</p>')+'</details>';}
function customers(){return `<div class="hero"><div><h2>Trade Accounts</h2><p>Customer details, purchase history and store-credit balances.</p></div><div class="hero-actions"><button class="btn primary" onclick="newCustomer()">+ Customer account</button>${managerControl()}</div></div><div class="grid metrics">${metric('Credit issued',money(state.creditIssued),'Trade-in credit')}${metric('Outstanding',money(state.customers.reduce((a,c)=>a+c.credit,0)),'Customer liability')}${metric('Accounts',state.customers.length,'Trade accounts')}${metric('With credit',state.customers.filter(c=>c.credit>0).length,'Positive balances')}</div><div class="card"><div class="list">${state.customers.map(c=>`<div class="row"><button onclick="tradeAccount(${c.id})"><strong>${escapeText(c.name)}</strong><div class="muted">${c.ledger.length} ledger entries</div></button><strong>${money(c.credit)}</strong></div>`).join('')}</div></div>`;}
let marketMode='overview';
window.showMarketMode=mode=>{marketMode=mode==='tracked'?'tracked':'overview';render();};
function market(){return '<div class="toolbar" aria-label="Market sections"><button class="btn '+(marketMode==='overview'?'primary':'secondary')+'" onclick="showMarketMode(\'overview\')">Market overview</button><button class="btn '+(marketMode==='tracked'?'primary':'secondary')+'" onclick="showMarketMode(\'tracked\')">My tracked items</button></div>'+(marketMode==='tracked'?marketInsights.view():marketOverview.view())+'<details class="card"><summary>Single-item live lookup and provider coverage</summary>'+`<div class="card live-market-search"><h3>Live market lookup</h3><div class="counter-search-row"><input id="marketQuery" class="input counter-input" placeholder="Try: Pokémon Charizard #4, PS3 Slim 320GB, LEGO set 6285, Power Rangers figure" onkeydown="if(event.key==='Enter')runMarketInsight()"><button class="btn primary" onclick="runMarketInsight()">Search live market</button></div><div id="marketLiveResult"><p class="muted">Search any stocked category. RetroHQ will show which providers returned usable evidence and will not invent missing prices.</p></div></div><div class="grid two market-explain"><div class="card"><h3>How RetroHQ uses the evidence</h3><div class="row"><span>CeX UK</span><strong>UK retail / trade benchmark where product coverage exists</strong></div><div class="row"><span>eBay UK</span><strong>Live active-listing asking-price evidence</strong></div><div class="row"><span>PriceCharting</span><strong>Identification, reference prices & sales volume</strong></div><p class="muted">Active eBay asking prices are evidence, not sold prices. RetroHQ will not treat them as completed-sale value.</p></div><div class="card"><h3>Category coverage</h3><div class="row"><span>Games & consoles</span><strong>UK evidence first</strong></div><div class="row"><span>Trading cards</span><strong>PriceCharting + eBay evidence</strong></div><div class="row"><span>Toys / LEGO / Funko</span><strong>Use supported providers; flag gaps</strong></div><p class="muted">RetroHQ's own acquisition and sale history will increasingly become a fourth evidence source.</p></div></div>`+'</details>';}
function operationsPanel(){
 const rows=RetroOps.queue(state.items),unlisted=rows.filter(r=>!r.item.listing),aged=rows.filter(r=>r.days!==null&&r.days>=30),missing=rows.filter(r=>r.issues.length);
 return '<div class="grid metrics">'+metric('Unlisted stock',unlisted.length,'Prepare and list')+metric('Stock aged 30+ days',aged.length,money(aged.reduce((n,r)=>n+r.item.buy,0))+' purchase cost tied up')+metric('Needs details',missing.length,'Dates, values or locations')+'</div><details class="card" open><summary>Listing and stock priorities</summary>'+rows.filter(r=>!r.item.listing||r.days>=30||r.issues.length).slice(0,30).map(r=>{const i=r.item,rec=RetroOps.recommendation(i,marketValue(i),Number(state.settings.fees.eBay?.value)||0,Number(state.settings.yellowMargin)||30);return '<div class="row"><div><strong>'+escapeText(i.title)+'</strong><small class="table-note">'+(r.days===null?'Age unknown':r.days+' days in stock')+' · '+escapeText(i.location||'Location missing')+'</small><p>'+escapeText(r.issues.join(' · ')||rec.action)+(rec.price!==null?' · suggested '+money(rec.price)+' · minimum '+money(rec.floor):'')+'</p></div><button class="btn secondary" onclick="openItem('+i.id+',&quot;Listing&quot;)">Review item</button></div>';}).join('')+'<p class="muted">Suggestions only. Nothing is repriced, relisted or promoted on a marketplace. Minimum price uses the configured yellow margin and entered postage/packaging; refresh stale evidence before acting.</p></details>';
}
function reports(){const sales=state.items.filter(i=>i.sale),confirmed=sales.filter(i=>RetroOps.economics(i).profit!==null),profit=confirmed.reduce((n,i)=>n+RetroOps.economics(i).profit,0);return '<div class="grid metrics">'+metric('Confirmed profit',money(profit),'Actual costs only; excludes return histories')+metric('Sales awaiting review',sales.length-confirmed.length,'Unknown costs stay unknown')+metric('Confirmed ROI',confirmed.reduce((n,i)=>n+i.buy+i.processingCosts,0)?(100*profit/confirmed.reduce((n,i)=>n+i.buy+i.processingCosts,0)).toFixed(1)+'%':'Unknown','Profit / purchase and preparation cost')+'</div>'+operationsPanel()+'<details class="card" open><summary>Buying trips and lots</summary>'+RetroOps.batches(state.items).map(g=>'<div class="card"><h3>'+escapeText(g.name)+'</h3><p>'+g.sold+' / '+g.items.length+' items sold · investment '+knownMoney(g.investment)+'</p><p>Confirmed net receipts '+money(g.recovered)+' · investment still to recover '+knownMoney(g.remaining)+'</p><p>Realised profit '+money(g.profit)+' · '+g.pending+' awaiting costs / return review</p><p>Remaining stock estimate '+money(g.items.filter(i=>RetroOps.active(i)&&!i.needsValuation).reduce((n,i)=>n+marketValue(i),0))+' · '+g.items.filter(i=>RetroOps.active(i)&&i.needsValuation).length+' unvalued</p></div>').join('')+'<p>Group items using a buying-trip name during acquisition or Organise selected stock in Inventory. Net receipts deduct selling costs; they are not profit. Unknown costs and returns are excluded, not treated as zero.</p></details><details class="card"><summary>Sale profitability by item</summary>'+sales.map(i=>'<div class="row"><div>'+escapeText(i.title)+'<p>'+ (RetroOps.economics(i).profit===null?'Needs cost / return review':money(RetroOps.economics(i).profit)+' profit · '+(RetroOps.economics(i).roi===null?'ROI unavailable':RetroOps.economics(i).roi.toFixed(1)+'% ROI'))+'</p></div><button class="btn secondary" onclick="editImportedCosts('+i.id+')">Review costs</button></div>').join('')+'</details>';}
window.bulkStock=()=>open('<h2>Organise stock</h2><p>Select physical items to update together. Individual purchase costs remain separate.</p><div class="formgrid"><label>Buying trip / lot<input class="input" id="bulkBatch" placeholder="Leave blank to keep current"></label><label>Acquisition date<input class="input" type="date" id="bulkDate"></label><label>Area<input class="input" id="bulkArea"></label><label>Shelf<input class="input" id="bulkShelf"></label></div>'+state.items.filter(RetroOps.active).map(i=>'<label class="row"><input type="checkbox" name="bulkItem" value="'+i.id+'"><span>'+escapeText(i.title)+' · '+escapeText(i.location||'Unassigned')+' · '+knownMoney(i.buy)+'</span></label>').join('')+'<div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveBulkStock()">Save selected</button></div>');
window.saveBulkStock=()=>{try{const ids=$$('input[name="bulkItem"]:checked').map(x=>Number(x.value));if(!ids.length)throw Error('Select at least one item.');const name=$('#bulkBatch').value.trim(),area=$('#bulkArea').value.trim(),shelf=$('#bulkShelf').value.trim(),date=$('#bulkDate').value;if([name,area,shelf].some(x=>/[<>"`]/.test(x)))throw Error('Use plain text.');if(date&&RetroOps.age(date)===null)throw Error('Use a valid acquisition date, not a future date.');if(!name&&!area&&!shelf&&!date)throw Error('Enter a change first.');const before=JSON.parse(JSON.stringify(state.items)),batchId=name?(state.items.find(i=>i.batchName===name)?.batchId||crypto.randomUUID()):null;for(const i of state.items.filter(i=>ids.includes(i.id))){if(!RetroOps.active(i))throw Error('Stock changed; reopen this form.');(i.editHistory||(i.editHistory=[])).push({date:today(),before:{batchId:i.batchId||null,batchName:i.batchName||null,location:i.location,acquiredDate:i.acquiredDate||null}});if(name){i.batchName=name;i.batchId=batchId;}if(date)i.acquiredDate=date;if(area)i.area=area;if(shelf)i.shelf=shelf;if(area||shelf)i.location=[i.area,i.shelf].filter(Boolean).join(' / ');i.timeline.push(['Stock organised',today()+' · batch/date/location updated']);}if(!persistState()){state.items=before;return;}closeModal();render();}catch(e){alert(e.message);}};
function pickingQueue(){const items=state.items.filter(i=>i.sale&&['Sold','Packaged'].includes(i.status));return '<details class="card" open><summary>Pick, pack and dispatch ('+items.length+')</summary>'+items.map(i=>'<div class="row"><div><strong>'+escapeText(i.title)+'</strong><p>'+escapeText(i.location||'Location missing')+' · '+escapeText(i.status)+'</p><small>Check included accessories and suitable packaging.</small></div><button class="btn secondary" onclick="openItem('+i.id+',&quot;Sales&quot;)">Open sale</button></div>').join('')+'</details>';}

function legacyReports(){const allSold=state.items.filter(i=>i.sale),sold=allSold.filter(i=>soldEcon(i).profit!=null),avg=sold.length?sold.reduce((a,i)=>a+soldEcon(i).margin,0)/sold.length:0,profit=sold.reduce((a,i)=>a+soldEcon(i).profit,0),tracked=sold.filter(i=>i.valuation?.acquisitionValue!=null),accuracy=tracked.length?tracked.reduce((a,i)=>a+(1-Math.min(1,Math.abs(i.sale.price-i.valuation.acquisitionValue)/Math.max(1,i.valuation.acquisitionValue))),0)/tracked.length*100:null,days=sold.map(daysToSell).filter(x=>x!=null);return `<div class="grid metrics">${metric('Sales',allSold.length,(allSold.length-sold.length)+' awaiting costs / order review')}${metric('Confirmed profit',money(profit),'Excludes sales awaiting costs / order review')}${metric('Avg sale margin',avg.toFixed(1)+'%','After fees')}${metric('Valuation accuracy',accuracy==null?'Building data':accuracy.toFixed(0)+'%',tracked.length+' closed-loop item(s)')}</div><div class="grid two"><div class="card"><h3>Buy → Sell feedback loop</h3><p>RetroHQ now retains the acquisition valuation and compares it with the eventual sale outcome.</p>${tracked.map(i=>`<div class="row"><span>${i.title}<small>Valued ${money(i.valuation.acquisitionValue)} → sold ${money(i.sale.price)}</small></span><strong>${soldEcon(i).profit==null?'Unconfirmed':money(soldEcon(i).profit)} profit</strong></div>`).join('')||'<p class="muted">Sell a Test 8.1 item to begin building closed-loop evidence.</p>'}</div><div class="card"><h3>Capital velocity</h3><div class="row"><span>Average days to sell</span><strong>${days.length?(days.reduce((a,b)=>a+b,0)/days.length).toFixed(1):'Building data'}</strong></div><div class="row"><span>Average HQ score</span><strong>${Math.round(state.items.reduce((a,i)=>a+score(i),0)/state.items.length)}/100</strong></div><p class="muted">As real transactions accumulate, these outcomes can improve future buying recommendations.</p></div></div>`;}
function acquisitionDefaultsSettings(){
 const defaults=state.settings.acquisitionDefaults||{};
 return `<form class="card" id="acquisitionDefaults" onsubmit="event.preventDefault();saveAcquisitionDefaults()"><h3>Product defaults</h3>
 <p class="muted">Prefill the purchase price and storage location for new items. Leave a field blank to enter it when buying. Check the amount paid before saving the item.</p>
 ${acquisitionCategories.map((category,index)=>{
  const preset=defaults[category]||{};
  return `<fieldset><legend>${category}</legend><div class="formgrid">
   <label>Default buy price (£)<input class="input" id="defaultBuy-${index}" type="number" min="0" step="0.01" value="${escapeText(preset.buy??'')}"></label>
   <label>Default area<input class="input" id="defaultArea-${index}" maxlength="80" value="${escapeText(preset.area||'')}"></label>
   <label>Default shelf / location<input class="input" id="defaultShelf-${index}" maxlength="80" value="${escapeText(preset.shelf||'')}"></label>
  </div></fieldset>`;
 }).join('')}<p id="acquisitionDefaultsStatus" role="status"></p><button class="btn primary" type="submit">Save product defaults</button></form>`;
}
window.saveAcquisitionDefaults=()=>{
 const status=$('#acquisitionDefaultsStatus');
 if(!$('#acquisitionDefaults')?.reportValidity())return;
 try{
  const defaults={};
  acquisitionCategories.forEach((category,index)=>{
   const raw=$('#defaultBuy-'+index).value.trim();
   const area=$('#defaultArea-'+index).value.trim(),shelf=$('#defaultShelf-'+index).value.trim();
   if([area,shelf].some(value=>/[<>"`]/.test(value)||/^javascript:/i.test(value)))throw Error('Use plain text for storage locations.');
   if(raw||area||shelf)defaults[category]={buy:raw?Number(raw):null,area,shelf};
  });
  commitWorkspace({...state,settings:{...state.settings,acquisitionDefaults:defaults}});
  status.textContent='Product defaults saved.';
 }catch(error){status.textContent=error.message;}
};
function settings(){return `<div class="grid two"><div class="card"><h3>Business Rules</h3><div class="formgrid"><div class="field"><label>Recommended offer %</label><input id="offerPct" class="input" type="number" value="${state.settings.offerPct}"></div><div class="field"><label>Store-credit bonus %</label><input id="creditBonus" class="input" type="number" value="${state.settings.storeCreditBonus}"></div><div class="field"><label>Green margin %</label><input id="green" class="input" type="number" value="${state.settings.greenMargin}"></div><div class="field"><label>Yellow margin %</label><input id="yellow" class="input" type="number" value="${state.settings.yellowMargin}"></div><div class="field"><label>Missing cable replacement allowance</label><input id="cableAllowance" class="input" type="number" step="0.01" value="${state.settings.accessoryAllowances?.cables??10}"><small class="muted">Your working replacement cost. Controller deductions use live CeX evidence where a confident match exists.</small></div></div><button class="btn primary" onclick="saveSettings()">Save rules</button></div><div class="card"><h3>Seller fee presets</h3>${Object.entries(state.settings.fees).map(([k,v])=>`<div class="row"><strong>${k}</strong><span>${v.value}${v.type==='percent'?'%':' fixed'}</span></div>`).join('')}<button class="btn secondary" onclick="editFeePreset()">Edit preset</button></div></div>
${acquisitionDefaultsSettings()}
<div class="card" style="margin-top:16px"><h3>eBay Seller · Sandbox</h3>
<p class="muted">Connect your test seller to read Sandbox orders. Listing publication is not enabled. Seller tokens stay on the server, not in your browser.</p>
<div id="sellerConnectionStatus" class="notice">Checking seller connection…</div>
<div class="field"><label>eBay Auth Accepted URL (copy this into your Sandbox RuName settings)</label>
<input class="input" id="sellerCallbackUrl" readonly value=""><small class="muted">Use the exact forwarded Codespaces HTTPS address shown here. Keep port 8006 Private.</small></div>
<div class="field" style="margin-top:12px"><label>Private RetroHQ administrator PIN</label>
<input id="sellerAdminPin" class="input" type="password" autocomplete="off" placeholder="Enter your Codespaces PIN before a seller action">
<small class="muted">Never enter your eBay password here. This is the separate PIN you set in Codespaces secrets.</small></div>
<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
<button class="btn secondary" onclick="copySellerCallback()">Copy callback URL</button>
<button class="btn primary" onclick="connectSeller()">Connect eBay Seller</button>
<button class="btn secondary" onclick="testSellerConnection()">Test seller APIs</button>
<button class="btn secondary" onclick="refreshSellerStatus()">Refresh status</button></div>
<p class="muted">Automatic sync checks Sandbox every five minutes while this tab is visible. Only exact stock matches are imported; refunds and conflicts require review. Stops on error or when the tab closes.</p><p id="sellerActionResult" class="muted" role="status" style="margin-top:12px"></p>
<p class="muted">Before connecting: set EBAY_RUNAME and RETROHQ_ADMIN_PIN in Codespaces secrets, set EBAY_ENV=sandbox, and update the eBay Auth Accepted URL. The PIN is requested for protected actions and is never stored in the browser.</p>
</div>`;}
function ebayListingImages(i){const images=i.liveSnapshot?.details?.images;return (Array.isArray(images)?images:[]).filter(u=>typeof u==='string'&&/^https:\/\/i\.ebayimg\.com\/[a-zA-Z0-9/?.=&_%+-]+$/.test(u)).slice(0,24);}
function ebayImportedDetails(i){
 if(!i.liveListingId&&!i.liveSnapshot)return '';const d=i.liveSnapshot?.details||{},fee=i.sellingFeeEstimate;
 const imgs=ebayListingImages(i);
 return '<details class="card"><summary>Imported eBay details and fee estimate</summary><p>eBay listed price: '+knownMoney(ebayListedPrice(i))+'.</p>'+(fee?'<p>eBay fee estimate: '+(fee.type==='percent'?fee.value+'%':money(fee.value))+' · business default. Actual fees require confirmation.</p>':'')+'<p>Listing '+escapeText(i.liveListingId||'')+' · SKU '+escapeText(i.liveSku||'')+'</p><p>'+escapeText(d.categoryName||'')+' · '+escapeText(d.conditionName||'')+'</p><p>'+escapeText(d.conditionDescription||'')+'</p><p>'+escapeText(d.description||'Listing description not yet available. Sync again to fetch pending details.')+'</p>'+(d.dispatchDays?'<p>Listed dispatch time: '+escapeText(d.dispatchDays)+' days</p>':'')+(Array.isArray(d.shippingServices)?d.shippingServices.map(x=>'<p>Listed shipping: '+escapeText(x.service)+' · '+escapeText(x.charge)+' '+escapeText(x.currency)+'</p>').join(''):'')+(d.returns&&typeof d.returns==='object'?'<p>Listed return policy: '+Object.values(d.returns).filter(x=>typeof x==='string'&&x).map(escapeText).join(' · ')+'</p>':'')+[...(d.specifics||[]),...(d.variationSpecifics||[])].map(x=>'<p>'+escapeText(x.name)+': '+(Array.isArray(x.values)?x.values.map(escapeText).join(', '):'')+'</p>').join('')+'<div class="grid two">'+imgs.map(u=>'<img loading="lazy" referrerpolicy="no-referrer" src="'+escapeText(u)+'" alt="Imported eBay listing photo" style="max-width:100%;max-height:240px">').join('')+'</div></details>';
}
function ebayListedPrice(item){
 const snapshot=item.liveSnapshot,listing=item.listing;
 if(snapshot?.currency==='GBP'&&Number.isFinite(snapshot.price))return snapshot.price;
 if((item.liveListingId||item.ebayListingId||/^ebay/i.test(listing?.channel||''))&&Number.isFinite(listing?.price))return listing.price;
 return null;
}
function needsPriceCheck(item){
 return RetroCheckout.available(item)&&(item.valuation?.stale||independentMarketValue(item)==null);
}
function independentMarketValue(item){
 return item.needsValuation||item.valuation?.source==='eBay listing price'||item.valuation?.confidence==='asking-price'
  ||!Number.isFinite(item.valuation?.finalValue??item.baseMarket)?null:marketValue(item);
}
function itemView(){
 const i=state.items.find(x=>x.id===state.activeItem);
 if(!i)return '<div class="card">Item not found.</div>';
 if(i.stockRemoval)return `<div class="card"><h2>${escapeText(i.title)}</h2><p>Removed from live stock.</p><button class="btn secondary" onclick="go('inventory')">Back to inventory</button></div>`;
 return `<div class="hero"><div><small>${escapeText(i.category)}</small><h2>${escapeText(i.title)}</h2>
 <div class="hero-actions"><button class="btn secondary" onclick="editItem(${i.id})">Edit prices & details</button>
 <button class="btn primary" onclick="checkItemMarket(${i.id})">Check price</button>${managerActive()&&RetroCheckout.available(i)?'<button class="btn secondary" onclick="stockRemovalDialog('+i.id+',true)">Remove from stock</button>':''}</div>
 <p>${escapeText(i.condition)} · ${escapeText(i.location)} · ${escapeText(i.status)}</p>${signalHtml(i)}</div>
 <div><div>${i.valuation?.ebayComparable?'Selected eBay asking price':'HQ UK market value'} <strong>${knownMoney(independentMarketValue(i))}</strong></div>
 ${RetroOverview.safeUrl(i.valuation?.ebayComparable?.itemWebUrl)?`<a href="${escapeText(i.valuation.ebayComparable.itemWebUrl)}" target="_blank" rel="noopener noreferrer">View chosen listing</a>`:''}
 <div>eBay listed price <strong>${knownMoney(ebayListedPrice(i))}</strong></div>
 <div class="muted">Purchase price: ${knownMoney(i.buy)}</div>
 ${hqMeter('Item HQ score',itemHQScore(i),i.sale?'Confirmed sale margin and estimated selling speed':'Expected margin and estimated selling speed')}</div></div>
 ${ebayImportedDetails(i)}${lifecycleStrip(i)}<div class="tabs">${['Item','Selling & history'].map(t=>`<button class="tab ${itemPage()===t?'active':''}" onclick="setTab('${t}')">${t}</button>`).join('')}</div>${itemPageContent(i)}`;
}
function itemSection(i,tab){const e=i.sale?soldEcon(i):expected(i);if(tab==='Overview')return `${buyingSnapshotHtml(i)}<div class="grid metrics">${metric('Market value',i.needsValuation?'—':money(marketValue(i)),i.valuation?'Stored smart valuation':'Legacy / pending evidence')}${metric('Expected profit',knownMoney(expected(i).profit),'At current market value')}${metric('HQ Score',score(i)+'/100','Margin + velocity')}${metric('Lifecycle',i.status||'Acquired','Single lifecycle state')}</div><div class="grid two">${valuationSummary(i)}<div class="card"><h3>Completeness</h3>${i.accessories?`<div class="completeness-grid"><span>${i.accessories.box?'✓':'○'} Box</span><span>${i.accessories.controller?'✓':'○'} Controller</span><span>${i.accessories.cables?'✓':'○'} Cables</span></div>`:'<p class="muted">No completeness record yet.</p>'}${missingEssentials(i).length?`<p class="warning-text">Missing essential: ${missingEssentials(i).join(', ')}</p>`:''}</div></div>`;if(tab==='Acquisition')return `<div class="grid two"><div class="card"><div class="row"><span>Source</span><strong>${i.source}</strong></div><div class="row"><span>Buy price</span><strong>${knownMoney(i.buy)}</strong></div><div class="row"><span>Condition bought</span><strong>${i.acquiredCondition}</strong></div><div class="row"><span>Valuation when bought</span><strong>${i.valuation?.acquisitionValue!=null?money(i.valuation.acquisitionValue):'Not captured'}</strong></div><div class="row"><span>Recommended maximum</span><strong>${i.valuation?.recommendedMax!=null?money(i.valuation.recommendedMax):'—'}</strong></div></div>${valuationSummary(i)}</div>`;if(tab==='Processing')return `<div class="grid two"><div class="card">${processingControls(i)}<div class="row" style="margin-top:12px"><span>Processing costs</span><strong>${knownMoney(i.processingCosts)}</strong></div><button class="btn secondary" onclick="addProcessingCost(${i.id})">+ Add processing cost</button></div><div class="card"><h3>Condition & completeness</h3><select class="select" onchange="updateCondition(${i.id},this.value)">${Object.keys(factors).map(c=>`<option ${c===i.condition?'selected':''}>${c}</option>`).join('')}</select>${i.accessories?`<div class="completeness-actions"><button class="btn secondary ${i.accessories.box?'included':''}" onclick="toggleAccessory(${i.id},'box')">${i.accessories.box?'✓':'○'} Box</button><button class="btn secondary ${i.accessories.controller?'included':''}" onclick="toggleAccessory(${i.id},'controller')">${i.accessories.controller?'✓':'○'} Controller</button><button class="btn secondary ${i.accessories.cables?'included':''}" onclick="toggleAccessory(${i.id},'cables')">${i.accessories.cables?'✓':'○'} Cables</button></div>`:''}<div style="margin-top:12px">${signalHtml(i)}</div><small class="muted">If condition worsens or an essential accessory is removed, RetroHQ flags the item for revaluation instead of silently reusing an old value.</small></div></div>`;if(tab==='Market')return `<div class="grid two">${valuationSummary(i)}<div class="card"><h3>Market intelligence</h3><div class="row"><span>Liquidity</span><strong>${i.velocity}/100</strong></div><div class="row"><span>Valuation confidence</span><strong>${i.valuation?.confidence||'Legacy'}</strong></div><p class="muted">Provider evidence and item-specific adjustments are retained with the item rather than recalculated differently on each screen.</p></div></div>`;if(tab==='Photos')return `<div class="card"><h3>Photos</h3><p>Reference photo carried from identification. Keep original full-resolution photos for future listing.</p>${RetroBuying.validPhoto(i.photoData)?`<img src="${i.photoData}" alt="Item reference photo" style="max-width:100%;max-height:480px"><a class="btn secondary" href="${i.photoData}" download="retrohq-item-${i.id}.jpg">Download photo</a>`:ebayListingImages(i).length?ebayListingImages(i).map(u=>`<img loading="lazy" referrerpolicy="no-referrer" src="${escapeText(u)}" alt="Imported eBay listing photo" style="max-width:100%;max-height:480px">`).join(''):'<p class="muted">No saved reference photo.</p>'}</div>`;if(tab==='Listing')return `<div class="card"><h3>Listing</h3><p>Record a listing you have already created on eBay. This updates RetroHQ only; marketplace publishing is not connected yet.</p><button class="btn secondary" onclick="editEbayLink(${i.id})">Link existing eBay SKU / listing</button>${i.listing?`<div class="row"><span>${i.listing.channel}</span><strong>${money(i.listing.price)}</strong></div><button class="btn secondary" onclick="editLocalListing(${i.id})">Update local listing price</button>`:`<p class="muted">Not listed.</p><button class="btn primary" onclick="createListing(${i.id})">Record existing listing</button>`}</div>`;if(tab==='Sales')return `<div class="card"><h3>Sales</h3>${i.sale?`${saleFulfilmentControls(i)}<button class="btn primary" onclick="editImportedCosts(${i.id})">Confirm costs / profit</button><button class="btn secondary" onclick="customerReturn(${i.id})">Record physical return</button><div class="row"><span>Channel</span><strong>${i.sale.channel}</strong></div><div class="row"><span>Price</span><strong>${money(i.sale.price)}</strong></div><div class="row"><span>Actual profit</span><strong>${soldEcon(i).profit==null?'Unconfirmed':money(soldEcon(i).profit)}</strong></div><div class="row"><span>Fulfilment</span><strong>${i.status}</strong></div>`:`<p>Use Record sale above to sell this item.</p>`}</div>`;if(tab==='Timeline')return `<div class="card"><h3>Permanent timeline</h3>${i.timeline.slice().reverse().map(t=>`<div class="row"><strong>${t[0]}</strong><span>${t[1]}</span></div>`).join('')}</div>`;return `<div class="card"><h3>Notes</h3><textarea id="notes" rows="7">${i.notes}</textarea><button class="btn primary" onclick="saveNotes(${i.id})">Save notes</button></div>`;}
function itemPage(){return ['Selling & history','Listing','Sales','Timeline','Acquisition','Market'].includes(state.activeTab)?'Selling & history':'Item';}
function itemPageContent(i){
 const fold=(title,tab)=>'<details class="card"><summary>'+title+'</summary>'+itemSection(i,tab)+'</details>';
 if(itemPage()==='Selling & history')return (i.sale?itemSection(i,'Sales'):itemSection(i,'Listing')+itemSection(i,'Sales'))+'<details class="card"><summary>Buying decision snapshot</summary>'+buyingSnapshotHtml(i)+'</details>'+fold('Purchase history','Acquisition')+fold('Valuation evidence','Market')+fold('Full timeline','Timeline');
 return (RetroItems.sold(i)?'<div class="card"><p>This item is sold. Sale details and returns are under Selling &amp; history.</p></div>':itemSection(i,'Processing'))+fold('Reference photo','Photos')+fold('Notes','Notes');
}
window.quickSale=()=>manualSale(state.view==='item'&&RetroCheckout.available(state.items.find(i=>i.id===state.activeItem)||{})?state.activeItem:undefined);

function render(){if(!persistState())return;const views={production:marketplace.liveView,opportunities:marketplace.opportunityView,dashboard,acquisitions,inventory,soldInventory,processing,sales,epos:epos.view,customers,customerNew:customerEntry,customerDetail:customerDetail,market,reports,settings,item:itemView};root.innerHTML=workspaceBanner()+(demoMode&&state.view==='settings'?'<div class="card"><h3>Offline demo settings</h3><p>Seller connections and provider settings are available in your saved workspace.</p></div>':(views[state.view]||dashboard)());if(!demoMode&&state.view==='production')setTimeout(marketplace.refresh,0);if(!demoMode&&state.view==='market')setTimeout(refreshProviderStatus,0);if(!demoMode&&['settings','sales'].includes(state.view))setTimeout(refreshSellerStatus,0);}
window.go=go;window.closeModal=closeModal;
let savedWorkspace=null, workspaceReady=false, storageFailed=false, syncingOrders=false;
function persistState(){
 if(!workspaceReady||storageFailed)return false;
 try{
   const snapshot={};for(const k of ['items','customers','settings','creditIssued','researchHistory','ebaySync','transactions','liveEbay','opportunities','stockCsv','marketInsights','marketOverview'])if(state[k]!==undefined)snapshot[k]=state[k];
   savedWorkspace.save(snapshot);return true;
 }catch(error){storageFailed=true;root.innerHTML='<div class="card"><h2>Inventory saving stopped</h2><p>'+escapeText(error.message)+'</p><p>Do not continue editing. Free browser storage if needed, then reload. The last saved inventory is retained.</p></div>';return false;}
}
function startSavedWorkspace(){
 if(!navigator.locks){root.textContent='Open RetroHQ in a current browser over HTTPS (or localhost) to safely save inventory.';return;}
 navigator.locks.request(demoMode?'retrohq-demo-workspace':'retrohq-sandbox-workspace',{ifAvailable:true},async lock=>{
   if(!lock){root.textContent='RetroHQ is open in another tab. Close that tab, then reload here to edit the same inventory.';return;}
   try{savedWorkspace=RetroSales.storage(localStorage,workspaceKey);const saved=savedWorkspace.load();if(saved)for(const k of ['items','customers','settings','creditIssued','researchHistory','ebaySync','transactions','liveEbay','opportunities','stockCsv','marketInsights','marketOverview'])if(saved[k]!==undefined)state[k]=saved[k];workspaceReady=true;go(demoMode?'sales':state.view);}
   catch(error){root.textContent='Saved inventory could not be opened. Do not clear browser data. '+error.message;return;}
   await new Promise(()=>{}); // Hold the workspace lock until this page closes.
 });
}
function ebaySalesPanel(){
 const sync=state.ebaySync||{lines:[]};
 return `<div class="card sales-panel"><h3>${demoMode?'Practice a sale':'eBay sales · Sandbox'}</h3>${demoMode?demoControls():`<p>Fetch orders, check the matching stock, then confirm the sale.</p><div id="sellerConnectionStatus" class="muted">Checking connection…</div><div class="toolbar"><input id="sellerAdminPin" class="input" type="password" autocomplete="off" aria-label="Seller administrator PIN" placeholder="Private administrator PIN"><button class="btn primary" onclick="syncEbayOrders()">Fetch / resync orders</button><button id="autoSyncToggle" class="btn secondary" onclick="toggleSyncSession()">${syncSessionTimer?'Stop automatic sync':'Start automatic sync'}</button><button class="btn secondary" onclick="exportWorkspace()">Export inventory backup</button></div>`}<p class="muted">Automatic sync checks Sandbox every five minutes while this tab is visible. Only exact stock matches are imported; refunds and conflicts require review. Stops on error or when the tab closes.</p><p id="sellerActionResult" class="muted" role="status">${escapeText(sync.message||'Choose a sample to begin.')}</p><div class="list">${sync.lines.map((row,n)=>{
 if(demoMode&&!RetroDemo.visible(row,sync.scenario))return '';
 const p=RetroSales.propose(state,row),l=row.latest,assigned=state.items.filter(i=>row.itemIds.includes(i.id));
 const status=row.outcome?'Returned to stock':row.review?'Needs review':row.imported?'Sale recorded':p.items.length?'Ready to record':RetroSales.valid(l)?'Choose stock item':'Check payment or cancellation';
 return `<article class="card sale-card"><div class="sale-card-head"><div><h3>${escapeText(l.title||'Order item')}</h3><span class="pill">${status}</span></div><div class="sale-price"><strong>${l.price==null?'Amount unavailable':money(l.price)}</strong><small>${l.quantity} item${l.quantity===1?'':'s'}</small></div></div>
 ${assigned.map(i=>`<div class="sale-stock"><button class="link-button" onclick="openItem(${i.id})">${escapeText(i.title)}</button><span>${escapeText([i.area,i.shelf].filter(Boolean).join(' / ')||i.location||'Location not set')} · ${escapeText(i.status)}</span>${i.sale?.externalKey===row.key?`<button class="btn primary" onclick="editImportedCosts(${i.id})">${i.sale.costsConfirmed&&!row.review?'View costs and profit':'Confirm costs and profit'}</button>`:''}</div>`).join('')}
 ${!row.imported&&!row.outcome&&RetroSales.valid(l)?`<p>${p.items.length?'A stock match is ready. Check it before recording the sale.':'Select the physical item sold so we update the correct stock.'}</p><button class="btn primary" onclick="reviewEbayLine(${n})">${p.items.length?'Review match and import':'Match stock manually'}</button>`:''}
 ${row.review&&!row.outcome?`<p class="warning-text">The order changed. Check the details before confirming profit or returning stock.</p><button class="btn secondary" onclick="acceptEbayChange(${n})">Review changed amounts</button>`:''}
 <details class="sale-details"><summary>Order details${row.imported&&!row.outcome?' and return options':''}</summary><dl><dt>Order / line</dt><dd>${escapeText(l.orderId)} / ${escapeText(l.lineItemId)}</dd><dt>Stock code / listing</dt><dd>${escapeText(l.sku||'Not linked')} / ${escapeText(l.listingId||'Not linked')}</dd><dt>Payment / cancellation / fulfilment</dt><dd>${escapeText(l.paymentStatus)} / ${escapeText(l.cancelState)} / ${escapeText(l.fulfillmentStatus)}</dd><dt>Order fees / buyer postage</dt><dd>${l.orderFee==null?'Not supplied':money(l.orderFee)} / ${l.orderShipping==null?'Not supplied':money(l.orderShipping)} (whole order; allocate once)</dd></dl>${l.refundDetected?'<p class="warning-text">Refund reported — physical stock must be checked separately.</p>':''}${row.imported&&!row.outcome?`<button class="btn secondary" onclick="restoreEbayLine(${n})">Review / restore stock</button>`:''}</details></article>`;
 }).join('')||'<p class="muted">No order to show for this scenario yet.</p>'}</div><details class="sale-details"><summary>Sync and storage information</summary><p>Last successful sync: ${escapeText(sync.lastSync||'Never')}.</p><p>${demoMode?'Fictional orders only. No eBay connection.':'Saved in this browser and site address. Export a backup before clearing site data. Older orders, returns and refunds may require Seller Hub verification.'}</p></details></div>`;
}
function workspaceBanner(){
 return demoMode?'<div class="notice" role="status"><strong>OFFLINE DEMO — fictional inventory and orders</strong><p>Your saved inventory is separate.</p><a class="btn secondary" href="?">Return to saved workspace</a> <button class="btn secondary" onclick="resetDemo()">Reset demo samples</button> <button class="btn secondary" onclick="exportWorkspace()">Export demo backup</button> <button class="btn secondary" onclick="openRestore()">Restore backup</button></div>':'<details class="workspace-tools"><summary>Backup and practice tools</summary><button class="btn secondary" onclick="exportWorkspace()">Export inventory backup</button> <button class="btn secondary" onclick="openRestore()">Restore backup</button> <a class="btn secondary" href="?demo=1">Try offline sales demo</a><p>Saved stock stays in this browser and site address. Keep regular backups.</p></details>';
}
function demoControls(){
 const selected=state.ebaySync.scenario,guide=RetroDemo.scenarios[selected];
 return `<p>Choose a scenario to see its sample order below. Switching keeps your progress; it does not reset stock. Sales totals and inventory include all imported samples.</p><div class="toolbar">${Object.entries(RetroDemo.scenarios).map(([id,s])=>`<button class="btn ${selected===id?'primary':'secondary'}" aria-pressed="${selected===id}" onclick="runDemoScenario('${id}')">${s.label}</button>`).join('')}</div><div class="notice"><h4>${guide?escapeText(guide.label):'What are the sample items?'}</h4><p>${guide?escapeText(guide.description):'All items are fictional training stock: one Silent Hill 2 PS2 game, one Nintendo 64 console, and two PS3 game copies. Start with Paid sale; each scenario explains its item and expected result.'}</p>${['paid','repeat'].includes(selected)?'<p>Silent Hill 2 cost example: fees £10, postage £4, packaging £1, buyer shipping £3. Confirmed profit should be £31. If already imported, its status stays Imported. Use Reset demo samples for a fresh start.</p>':''}</div>`;
}
window.runDemoScenario=scenario=>{
 if(!demoMode||!workspaceReady||storageFailed)return;
 if(!RetroDemo.scenarios[scenario])return;
 state.ebaySync.scenario=scenario;
 try{
   if(['refund','cancel'].includes(scenario)&&!state.ebaySync.lines.some(r=>r.latest.orderId==='DEMO-ORDER-1'&&r.imported&&!r.outcome))throw Error('Load and import the Paid sale first, then simulate its refund or cancellation.');
   const lines=RetroDemo.orders(scenario);
   const loaded=['paid','unmatched','multi'].includes(scenario)&&state.ebaySync.lines.some(r=>r.latest.orderId===lines[0].orderId);
   if(!loaded)RetroSales.ingest(state,lines);
   state.ebaySync.message=loaded?'Showing saved progress for this sample. No stock or order status was reset.':'DEMO: '+RetroDemo.scenarios[scenario].label+' sample received. Review below; no real order was fetched.';
 }catch(error){state.ebaySync.message=error.message;}
 render();
};
window.resetDemo=()=>{
 if(!demoMode||!workspaceReady||storageFailed)return;
 if(!confirm('Reset only the fictional demo inventory and orders? Your saved workspace is unaffected.'))return;
 Object.assign(state,RetroDemo.seed(demoDefaults));closeModal();go('sales');
};
let syncSessionTimer=null,syncSessionPin='';
window.toggleSyncSession=async()=>{
 if(syncSessionTimer){clearInterval(syncSessionTimer);syncSessionTimer=null;syncSessionPin='';render();return;}
 const pin=$('#sellerAdminPin')?.value;if(!pin)return alert('Enter the administrator PIN to start this session.');
 syncSessionPin=pin;$('#sellerAdminPin').value='';syncSessionTimer=setInterval(()=>{if(!document.hidden)pollSyncSession();},300000);await pollSyncSession();
};
async function pollSyncSession(){
 if(demoMode||syncingOrders||!syncSessionPin)return;syncingOrders=true;
 try{const r=await fetch('/api/ebay-seller/orders',{method:'POST',headers:{'Content-Type':'application/json','X-RetroHQ-Action':'seller-oauth'},body:JSON.stringify({pin:syncSessionPin})});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.status||'Sync unavailable');const before=JSON.parse(JSON.stringify({items:state.items,ebaySync:state.ebaySync||null}));
 try{RetroSales.ingest(state,d.orders);let imported=0;for(const row of state.ebaySync.lines){const p=RetroSales.propose(state,row);if(p.status==='Ready to import'){RetroSales.apply(state,row.key,p.items.map(i=>i.id));imported++;}}
 state.ebaySync.message='Automatic Sandbox sync: '+d.sampledOrders+' orders fetched; '+imported+' exact matches imported. '+(d.truncated?'Partial result; check Seller Hub. ':'')+(d.note||'')+' Fees, refunds and physical returns may need review.';
 if(!persistState())throw Error('Could not save sync; no stock changes retained.');
 }catch(e){state.items=before.items;state.ebaySync=before.ebaySync;throw e;}render();
 }catch(e){clearInterval(syncSessionTimer);syncSessionTimer=null;syncSessionPin='';const box=$('#sellerActionResult');if(box)box.textContent='Automatic sync stopped: '+e.message;if($('#autoSyncToggle'))$('#autoSyncToggle').textContent='Start automatic sync';}finally{syncingOrders=false;}
}
window.syncEbayOrders=async()=>{
 if(demoMode){runDemoScenario('paid');return;}if(syncingOrders)return;syncingOrders=true;
 try{const data=await sellerAction('/api/ebay-seller/orders');if(!data)return;
 RetroSales.ingest(state,data.orders);state.ebaySync.message=`Fetched ${data.sampledOrders} orders. ${data.truncated?'Partial result: the import limit was reached; inspect remaining orders in Seller Hub. ':''}${data.note||''} Review below to confirm stock changes.`;render();
 }catch(error){const box=$('#sellerActionResult');if(box)box.textContent='Sync failed: '+error.message;}finally{syncingOrders=false;}
};
window.reviewEbayLine=n=>{
 const row=state.ebaySync.lines[n],proposal=RetroSales.propose(state,row),l=row.latest;
 open(`<h2>Confirm inventory allocation</h2><p>${escapeText(l.title)} · ${l.quantity} unit(s) · ${money(l.price)} for the whole line.</p><p>Select exactly ${l.quantity} physical stock record(s). Confirm their identity and Area / Shelf before marking them sold.</p>${state.items.filter(RetroSales.available).map(i=>`<label class="row"><input type="checkbox" name="ebayUnit" value="${i.id}" ${proposal.items.includes(i)?'checked':''}><span>${escapeText(i.title)} (#${i.id}) · ${escapeText(i.location||'Unassigned')}</span></label>`).join('')}<div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="confirmEbayLine(${n})">Confirm paid sale and stock update</button></div>`);
};
window.confirmEbayLine=n=>{try{RetroSales.apply(state,state.ebaySync.lines[n].key,$$('input[name="ebayUnit"]:checked').map(x=>Number(x.value)));closeModal();render();}catch(error){alert(error.message);}};
window.acceptEbayChange=n=>{if(!confirm('Confirm updated line revenue and fee evidence without changing allocated stock? Actual costs will need reconfirmation. Refunds and quantity changes remain blocked.'))return;try{RetroSales.acceptChange(state,state.ebaySync.lines[n].key);render();}catch(error){alert(error.message);}};
window.restoreEbayLine=n=>{
 const row=state.ebaySync.lines[n];
 const reason=prompt('Record the cancellation / return reason. Only restore after every allocated unit is physically back in stock. A partial refund alone does not restore stock.');
 if(!reason)return;if(!confirm('Restore all '+row.itemIds.length+' physical unit(s) to Needs testing? The original sale stays in history and will not be imported again.'))return;
 try{RetroSales.restore(state,row.key,reason);render();}catch(error){alert(error.message);}
};
window.editEbayLink=id=>{
 const i=state.items.find(x=>x.id===id);open(`<h2>Link an existing eBay listing</h2><p>Exact SKU/custom label or listing ID only. This does not publish or edit anything on eBay.</p><label>SKU / custom label<input id="ebaySku" class="input" value="${escapeText(i.ebaySku||'')}"></label><label>Listing ID<input id="ebayListing" class="input" value="${escapeText(i.ebayListingId||'')}"></label><button class="btn primary" onclick="saveEbayLink(${id})">Save link</button>`);
};
window.saveEbayLink=id=>{const i=state.items.find(x=>x.id===id);i.ebaySku=$('#ebaySku').value.trim();i.ebayListingId=$('#ebayListing').value.trim();closeModal();render();};
let existingIdentityDraft=null;
function existingIdentitySource(item,query){
 const category=item.category||'';
 if(/toys?/i.test(category)||/^(?:Clothing|Trading Card|Collectible)$/i.test(category))return 'ebay';
 if(/video.?games?|console/i.test(category)||['hardware','software'].includes(item.identity?.type))return 'catalogue';
 return RetroOps.stockSystem({title:query})?'catalogue':'ebay';
}
window.identifyExistingItem=id=>{
 const item=state.items.find(i=>i.id===id);
 if(!item)return;
 const source=existingIdentitySource(item,item.title);
 existingIdentityDraft={id,generation:0,catalogue:null,ebayReference:null};
 const fields=[['title','Product title',item.title],['platform','Platform / model',item.platform||item.identity?.platform||''],
  ['category','Category',/toys?/i.test(item.category||'')?'Toy':item.category],['region','Region / edition',item.region||''],
  ['manufacturer','Manufacturer',item.manufacturer||''],['barcode','Barcode / EAN',item.barcode||'']];
 const input=([key,label,value])=>`<label for="identity-${key}">${label}<input id="identity-${key}" class="input" value="${escapeText(value)}"></label>`;
 const included=[['box','Box'],['controller','Controller'],['cables','Cables']].filter(([key])=>item.accessories?.[key]).map(([,label])=>label);
 open(`<section class="identity-workflow"><h2>Correct product details</h2>
  <form id="identitySearchForm">
   <label class="identity-label" for="existingIdentityQuery">What is the item?</label>
   <div class="counter-search-row"><input id="existingIdentityQuery" class="input counter-input" value="${escapeText(item.title)}" placeholder="Title, model or barcode"><button class="btn primary" type="submit">Search</button></div>
   <p class="muted identity-help">Search by title or model, or enter a barcode.</p>
  </form>
  <div class="scan-actions">${demoMode?'':'<button class="btn secondary" onclick="photoIdentify()">Photo search</button><button class="btn secondary" onclick="scanBarcode()">Scan barcode</button>'}
   <details class="identity-source"><summary id="identitySourceLabel">${source==='catalogue'?'Games catalogue':'eBay UK'}</summary>
    <label for="existingIdentityProvider">Search source</label><select id="existingIdentityProvider" class="select">
     <option value="catalogue" ${source==='catalogue'?'selected':''}>PriceCharting games catalogue</option>
     <option value="ebay" ${source==='ebay'?'selected':''}>eBay UK listings</option>
    </select>
   </details>
  </div>
  <div id="identityCaptureTools"></div>
  <div id="existingIdentityMatches" role="status" aria-live="polite"></div>
  <section class="identity-review"><h3>Check the item details</h3>
   <p class="muted identity-help">${escapeText(item.condition||'Condition unknown')}${included.length?' · Includes '+included.join(', '):''}</p>
   <div class="formgrid">${fields.slice(0,2).map(input).join('')}</div>
   <details id="identityMoreFields"><summary>Category, edition, manufacturer and barcode</summary>
    <div class="formgrid">${fields.slice(2).map(input).join('')}</div>
   </details>
   <label class="identity-confirm"><input id="existingIdentityConfirmed" type="checkbox"> I checked the physical item and its edition and contents.</label>
  </section>
  <div class="modal-actions identity-actions"><p id="existingIdentityError" role="alert"></p><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn secondary" onclick="saveExistingIdentity()">Save identity</button><button class="btn primary" onclick="saveExistingIdentity(true)">Save &amp; check value</button></div>
 </section>`);
 $('#identitySearchForm').onsubmit=event=>{event.preventDefault();searchExistingIdentity();};
 $('#existingIdentityQuery').oninput=()=>clearExistingIdentitySelection(true);
 $('#existingIdentityProvider').onchange=()=>{
  $('#identitySourceLabel').textContent=$('#existingIdentityProvider').value==='catalogue'?'Games catalogue':'eBay UK';
  clearExistingIdentitySelection(true);
 };
 for(const [key] of fields)$('#identity-'+key).oninput=()=>clearExistingIdentitySelection();
 modal.scrollTop=0;
};
function clearExistingIdentitySelection(clearResults=false){
 const draft=existingIdentityDraft;
 if(!draft)return;
 const selected=draft.catalogue||draft.ebayReference||draft.pending;
 draft.catalogue=null;
 draft.ebayReference=null;
 draft.generation++;
 draft.pending=false;
 $('#existingIdentityConfirmed').checked=false;
 $('#existingIdentityError').textContent='';
 if(clearResults){
  draft.candidates=[];
  draft.ebayCandidates=[];
  $('#existingIdentityMatches').textContent='';
 }else if(selected){
  $('#existingIdentityMatches').textContent='Details edited. Check them against the physical item before saving.';
 }
}
function identityMatchList(rows,kind){
 if(!rows.length)return '';
 const ebay=kind==='ebay',click=ebay?'selectExistingEbayCandidate':'selectExistingIdentityCandidate';
 const cards=rows.map((row,index)=>{
  const title=ebay?row.title:row['product-name'];
  const details=ebay?[row.condition,row.asking==null?'':money(row.asking)+' asking'].filter(Boolean).join(' · '):row['console-name'];
  return `<article class="identity-match"><div><strong>${escapeText(title)}</strong><small class="muted">${escapeText(details)}</small></div><button class="btn secondary" onclick="${click}(${index})">Use match</button></article>`;
 });
 return '<div class="identity-match-list">'+cards.slice(0,3).join('')+
  (cards.length>3?'<details><summary>Show '+(cards.length-3)+' more matches</summary>'+cards.slice(3).join('')+'</details>':'')+'</div>';
}
window.searchExistingIdentity=async id=>{
 const draft=existingIdentityDraft,box=$('#existingIdentityMatches');
 if(!draft||!box)return;
 const query=$('#existingIdentityQuery').value.trim(),provider=$('#existingIdentityProvider').value;
 let barcode='';
 if(/^[0-9 -]{8,}$/.test(query)){
  try{barcode=RetroCapture.barcode(query);}catch(error){box.textContent=error.message;return;}
 }else if(query.length<2){
  box.textContent='Enter an item name or scan its barcode.';return;
 }
 const generation=++draft.generation;
 const current=()=>draft===existingIdentityDraft&&draft.generation===generation&&box.isConnected;
 draft.catalogue=null;draft.ebayReference=null;draft.pending=true;
 $('#existingIdentityConfirmed').checked=false;
 $('#existingIdentityError').textContent='';
 box.textContent=provider==='ebay'?'Searching eBay UK listings…':'Searching the games catalogue…';
 try{
  const params=new URLSearchParams();
  if(barcode){
   params.set('barcode',barcode);
   $('#identity-barcode').value=barcode;
  }else params.set('q',query);
  if(id)params.set('id',id);
  const response=await fetch((provider==='ebay'?'/api/identity-search?':'/api/market-search?')+params,{cache:'no-store'});
  const data=await response.json();
  if(!current())return;
  if(!response.ok||data.ok===false)throw Error((data.status||'Item lookup unavailable.')+' '+(data.detail||''));
  if(provider==='ebay'){
   draft.ebayCandidates=data.candidates||[];
   const count=draft.ebayCandidates.length,returned=Number.isInteger(data.returned)?data.returned:count;
   const summary=count?count+' active eBay listings'+(returned>count?' shown from '+returned+' returned':'')+'. Compare edition and condition.':returned?'eBay returned listings without usable references.':'No active UK listings found.';
   box.innerHTML='<h3>Choose a match</h3><p class="muted">'+summary+'</p>'
    +(data.broadened?'<p class="muted">Broader search: '+escapeText(data.searchedQuery)+'</p>':'')
    +identityMatchList(draft.ebayCandidates,'ebay');
   return;
  }
  if(data.needsConfirmation){
   draft.candidates=(data.candidates||[]).filter(x=>/^\d+$/.test(String(x.id)));
   box.innerHTML=draft.candidates.length?'<h3>Choose a match</h3>'+identityMatchList(draft.candidates,'catalogue'):'No exact catalogue match. You can confirm details manually.';
   return;
  }
  const found=data.lockedIdentity;
  if(!found?.confirmedProduct){
   box.textContent='No confirmed catalogue match. Refine the search or switch the search source to eBay UK.';
   return;
  }
  const pc=String(data.pricechartingProductId||found.pricechartingProductId||id||'');
  draft.catalogue=/^\d+$/.test(pc)?{id:pc,title:found.confirmedProduct,platform:found.platform||''}:null;
  $('#identity-title').value=found.confirmedProduct;
  $('#identity-platform').value=found.platform||'';
  if(found.type==='software')$('#identity-category').value='Video Game';
  else if(found.type==='hardware')$('#identity-category').value='Console';
  box.innerHTML='<div class="notice"><strong>'+escapeText(found.confirmedProduct)+'</strong><p class="identity-help">'+escapeText(found.platform||'')+' · Check the details below.</p></div>';
 }catch(error){if(current())box.textContent=error.message+' You can still confirm details manually.';}
 finally{if(current())draft.pending=false;}
};
window.selectExistingEbayCandidate=async n=>{
 const draft=existingIdentityDraft,candidate=draft?.ebayCandidates?.[n],box=$('#existingIdentityMatches');
 if(!candidate||!box)return;
 const generation=++draft.generation;
 const current=()=>draft===existingIdentityDraft&&draft.generation===generation&&box.isConnected;
 draft.catalogue=null;draft.ebayReference=null;draft.pending=true;
 $('#existingIdentityConfirmed').checked=false;
 box.textContent='Reading listing details…';
 try{
  const response=await fetch('/api/identity-detail?'+new URLSearchParams({item:candidate.id}),{cache:'no-store'}),data=await response.json();
  if(!current())return;
  if(!response.ok||!data.ok)throw Error(data.status||'Listing details unavailable.');
  if(data.itemId!==candidate.id||!RetroOverview.safeUrl(data.url))throw Error('Invalid listing reference.');
  for(const key of ['title','platform','manufacturer','barcode'])if(data[key])$('#identity-'+key).value=data[key];
  draft.ebayReference={itemId:data.itemId,title:data.title,platform:data.platform||'',manufacturer:data.manufacturer||'',barcode:data.barcode||'',url:data.url,checkedAt:data.checkedAt};
  box.innerHTML='<div class="notice"><strong>eBay reference selected</strong><p class="identity-help">Check the details below. <a href="'+escapeText(data.url)+'" target="_blank" rel="noopener noreferrer">View source listing</a></p></div>';
 }catch(error){if(current())box.textContent=error.message+' Search again or confirm manually.';}
 finally{if(current())draft.pending=false;}
};
window.selectExistingIdentityCandidate=n=>{const row=existingIdentityDraft?.candidates?.[n];if(row)searchExistingIdentity(String(row.id));};
window.saveExistingIdentity=(checkValue=false)=>{
 try{const draft=existingIdentityDraft;if(!draft||!$('#existingIdentityConfirmed'))return;if(draft.pending)throw Error('Wait for the current search to finish.');const index=state.items.findIndex(i=>i.id===draft.id);if(index<0)throw Error('Item no longer exists.');const input={confirmed:$('#existingIdentityConfirmed').checked,catalogue:draft.catalogue,ebayReference:draft.ebayReference};for(const k of ['title','platform','region','category','manufacturer','barcode'])input[k]=$('#identity-'+k).value;
  const before=state.items[index],next=RetroItems.identify(before,input,new Date().toISOString());state.items[index]=next;if(!persistState()){state.items[index]=before;return;}existingIdentityDraft=null;closeModal();render();if(checkValue)checkItemMarket(next.id);
 }catch(error){const box=$('#existingIdentityError');if(box)box.textContent=error.message;}
};
window.editImportedCosts=id=>{
 const i=state.items.find(x=>x.id===id),s=i?.sale;if(!s)return;const amounts=RetroOps.saleAmounts(i,state.settings.fees.eBay);
 open('<h2>Confirm actual sale costs</h2><p>'+escapeText(i.title)+'</p><p>Enter actual amounts, including zero. Fees must include all marketplace fees; put promotion here only if it is not already included in fees.</p>'+(['ebay-production','stock-csv'].includes(i.importedFrom)?'<label>Purchase price (£)<input class="input" id="cost-buy" type="number" min="0" step="0.01" value="'+(i.buy??'')+'"></label><label>Preparation costs (£)<input class="input" id="cost-processing" type="number" min="0" step="0.01" value="'+(i.processingCosts??'')+'"></label>':'')+[['feeValue','Total fees (£)'],['shipping','Postage paid (£)'],['packaging','Packaging (£)'],['promotion','Additional promotion (£)'],['shippingRevenue','Buyer postage received (£)']].map(([k,label])=>'<label>'+label+'<input class="input" id="cost-'+k+'" type="number" min="0" step="0.01" value="'+(k==='feeValue'?(amounts.fee??''):s[k]??'')+'"></label>').join('')+'<p>Fee defaults are estimates. Verify them against the actual eBay charge before confirming profit.</p><p>Return/refund histories remain excluded from confirmed profit until reconciled.</p><div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveImportedCosts('+id+')">Confirm costs</button></div>');
};
window.saveImportedCosts=id=>{try{const i=state.items.find(i=>i.id===id);if(!i?.sale||i.sale.reviewNeeded)throw Error('Resolve the order changes first.');const costs={};for(const k of ['feeValue','shipping','packaging','promotion','shippingRevenue']){const v=$('#cost-'+k).value;if(v.trim()===''||!Number.isFinite(Number(v))||Number(v)<0)throw Error('Enter each actual amount, including zero.');costs[k]=Math.round(Number(v)*100)/100;}let purchase=null;if(['ebay-production','stock-csv'].includes(i.importedFrom)){purchase={};for(const [field,selector]of [['buy','#cost-buy'],['processingCosts','#cost-processing']]){const v=$(selector).value;if(!v.trim()||!Number.isFinite(Number(v))||Number(v)<0)throw Error('Enter purchase and preparation costs, including zero if verified.');purchase[field]=Math.round(Number(v)*100)/100;}}const before=JSON.parse(JSON.stringify(i));if(purchase){(i.editHistory||(i.editHistory=[])).push({date:new Date().toISOString(),before:{buy:i.buy,processingCosts:i.processingCosts}});Object.assign(i,purchase);}(i.saleCostHistory||(i.saleCostHistory=[])).push({date:new Date().toISOString(),before:JSON.parse(JSON.stringify(i.sale))});Object.assign(i.sale,costs,{feeType:'fixed',costsConfirmed:true,feeEstimated:false});i.timeline.push(['Sale costs confirmed',new Date().toISOString()+' · postage, fees, packaging and promotion recorded.']);if(!persistState()){state.items[state.items.indexOf(i)]=before;return;}closeModal();render();}catch(e){alert(e.message);}};

window.exportBeforeEbayInventory=()=>{const raw=localStorage.getItem(workspaceKey+'.before-ebay-sales')||localStorage.getItem(workspaceKey+'.before-inline-import')||localStorage.getItem(workspaceKey+'.before-ebay-stock-setup')||localStorage.getItem(workspaceKey+'.before-ebay-inventory');if(!raw)return alert('No pre-import recovery copy exists yet.');downloadBackup(RetroBackup.pack(JSON.parse(raw).state,backupMode()),'retrohq-before-ebay-inventory-'+today());};
function downloadBackup(text,name){const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const backupMode=()=>demoMode?'demo':'saved';
window.exportWorkspace=()=>{if(!persistState())return;const snapshot=JSON.parse(localStorage.getItem(workspaceKey)).state;downloadBackup(RetroBackup.pack(snapshot,backupMode()),'retrohq-'+backupMode()+'-backup-'+today());};
let restorePreview=null;
window.openRestore=()=>{
 if(!workspaceReady||storageFailed||syncingOrders||marketplace.busy)return alert('Wait for saving or sync to finish before restoring.');
 restorePreview=null;
 open('<h2>Restore a backup</h2><p>This replaces the inventory, sales, trade accounts and business settings in this '+backupMode()+' workspace. It does not merge records or change your eBay connection.</p><p>Choose a RetroHQ JSON backup. Nothing changes until you review and confirm.</p><input id="backupFile" class="input" type="file" accept=".json,application/json" onchange="previewBackup(this.files[0])"><div id="backupPreview" role="status"></div><div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn secondary" onclick="exportWorkspace()">Download current backup</button><button class="btn secondary" onclick="downloadRecovery()">Download pre-restore copy</button></div>');
};
window.previewBackup=async file=>{
 restorePreview=null;const box=$('#backupPreview');if(!file||!box)return;
 try{
  if(file.size>RetroBackup.maxBytes)throw Error('Backup exceeds the 5 MB limit.');
  const text=await file.text();if($('#backupPreview')!==box||$('#backupFile')?.files[0]!==file)return;
  const parsed=RetroBackup.parse(text,backupMode());restorePreview={...parsed,text};
  box.innerHTML='<h3>Backup ready to review</h3><p>'+parsed.items+' items · '+parsed.sales+' recorded sales · '+parsed.accounts+' trade accounts</p><p>Current workspace: '+state.items.length+' items. This will be replaced.</p>'+(parsed.legacy?'<p>Older backup: workspace type inferred from its contents.</p>':'')+'<p>A recovery copy of the current workspace will be saved in this browser first. Export a separate copy if you need protection against loss of browser data.</p><label><input id="restoreAgree" type="checkbox"> I understand this replaces the current workspace, including sales since this backup.</label><p><button class="btn primary" onclick="confirmRestore()">Restore this backup</button></p>';
 }catch(error){box.textContent=error.message;}
};
window.confirmRestore=()=>{
 if(!restorePreview||!$('#restoreAgree')?.checked)return alert('Review the backup and tick the replacement confirmation first.');
 if(syncingOrders||marketplace.busy||!workspaceReady||storageFailed)return;
 try{
  const next=RetroBackup.parse(restorePreview.text,backupMode()).state;
  if(!persistState())return;
  RetroBackup.restore(localStorage,savedWorkspace,workspaceKey,next);
  for(const k of RetroBackup.fields)delete state[k];Object.assign(state,next);
  restorePreview=null;backdrop.classList.add('hidden');modal.innerHTML='';go('inventory');
  alert('Backup restored. Check your inventory before recording more purchases or syncing orders.');
 }catch(error){const box=$('#backupPreview');if(box)box.textContent='Restore stopped: '+error.message;}
};
window.downloadRecovery=()=>{
 try{const raw=localStorage.getItem(workspaceKey+'.before-restore');if(!raw)return alert('No pre-restore copy exists in this workspace yet.');downloadBackup(RetroBackup.pack(JSON.parse(raw).state,backupMode()),'retrohq-'+backupMode()+'-before-restore-'+today());}catch(error){alert('Recovery copy could not be read: '+error.message);}
};
const sellerCallback=()=>window.location.origin+'/ebay/oauth/callback';
window.refreshSellerStatus=async()=>{
 if(demoMode)return;
 const status=$('#sellerConnectionStatus'),field=$('#sellerCallbackUrl');
 if(!status)return;
 if(field)field.value=sellerCallback();
 try{
   const response=await fetch('/api/ebay-seller/status',{cache:'no-store'});
   const data=await response.json();
   status.textContent=(data.connected?'✓ Seller authorised':'○ Seller not connected')+
     ' · '+(data.environment||'unknown')+
     ' · Administrator PIN: '+(data.pinStatus||'Unknown')+
     (data.missing?.length?' · Setup needed: '+data.missing.join(', '):'');
 }catch(e){status.textContent='Seller connection status unavailable.';}
};
window.copySellerCallback=async()=>{
 const value=sellerCallback(),result=$('#sellerActionResult');
 try{await navigator.clipboard.writeText(value);if(result)result.textContent='Callback URL copied.';}
 catch(e){window.prompt('Copy this callback URL:',value);}
};
async function sellerAction(path){
 if(demoMode)return null;
 const pinInput=$('#sellerAdminPin'),pin=pinInput?.value||'';
 const result=$('#sellerActionResult');
 if(!pin){if(result)result.textContent='Enter your private administrator PIN above first.';return null;}
 pinInput.value='';
 if(result)result.textContent='Contacting Sandbox…';
 try{
   const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-RetroHQ-Action':'seller-oauth'},body:JSON.stringify({pin})});
   const data=await response.json();
   if(!response.ok||!data.ok){if(result)result.textContent=data.status||'Seller action failed.';return null;}
   return data;
 }catch(e){if(result)result.textContent='Seller API connection unavailable.';return null;}
}
window.connectSeller=async()=>{
 const data=await sellerAction('/api/ebay-seller/start');
 if(data?.authorizeUrl)window.location.assign(data.authorizeUrl);
};
window.testSellerConnection=async()=>{
 const data=await sellerAction('/api/ebay-seller/test'),result=$('#sellerActionResult');
 if(!data||!result)return;
 const fmt=(x)=>x?.ok?'OK ('+(x.count??0)+' sampled)':(x?.status||'Unavailable');
 result.textContent='Read-only Sandbox test · Inventory: '+fmt(data.inventory)+' · Orders: '+fmt(data.orders);
 refreshSellerStatus();
};

window.openItem=(id,tab='Overview')=>{state.activeItem=id;state.activeTab=tab;go('item');};window.setTab=t=>{state.activeTab=t;render();};
window.filterItems=()=>{const q=($('#search')?.value||'').toLowerCase(),cat=$('#cat')?.value||'',attention=$('#attention')?.value||'';const items=state.items.filter(i=>(state.view==='soldInventory'?RetroItems.sold(i):RetroCheckout.available(i))&&(!state.systemFilter||['Video Game','Console'].includes(i.category)&&stockSystem(i)===state.systemFilter)&&(!cat||i.category===cat)&&(`${i.title} ${i.manufacturer} ${i.status} ${i.location} ${stockSystem(i)||''}`.toLowerCase().includes(q))&&(!attention||(attention==='valuation'&&needsPriceCheck(i))||(attention==='missing'&&missingEssentials(i).length)||(attention==='ready'&&i.status==='Ready to list')||(attention==='sold'&&!!i.sale)));$('#results').innerHTML=(state.view==='inventory'?inventoryTable(items):table(items));};
window.filterSystem=name=>{state.systemFilter=decodeURIComponent(name);go('inventory');};window.clearSystemFilter=()=>{delete state.systemFilter;render();};
window.refreshProviderStatus=async()=>{const box=$('#marketProviderStatus');if(!box)return;try{const r=await fetch('/api/provider-status'),d=await r.json();box.innerHTML=[pill('CeX '+(d.cexStatus||'Not tested'),d.cex?'good':'warn'),pill('PriceCharting '+(d.pricecharting?'configured':'token missing'),d.pricecharting?'good':'warn'),pill('eBay UK '+(d.ebayEnvironment==='sandbox'?'Sandbox only':d.ebay?'configured':'credentials missing'),d.ebay&&d.ebayEnvironment!=='sandbox'?'good':'warn')].join(' ');}catch(e){box.innerHTML=pill('Provider status unavailable','warn');}};
function ebayMarketListings(evidence, expanded=false, allowChoice=false){
 const ebay=(evidence||[]).find(row=>row.provider==='eBay UK');
 if(!ebay)return '';
 const live=ebay.status==='Live';
 const listings=live?(ebay.items||[]).filter(row=>row.currency==='GBP'&&Number.isFinite(row.price)&&row.price>0&&RetroOverview.safeUrl(row.itemWebUrl)):[];
 const session=allowChoice?window.buyCheckSession:null;
 const canChoose=Boolean(session&&(!session.item||RetroCheckout.available(session.item)));
 if(canChoose)session.ebayOptions=listings;
 const title=live?'eBay UK active listings'+(ebay.count?' · '+ebay.count+' sampled':''):'eBay UK market search · '+(ebay.status||'Unavailable');
 return `<details class="evidence-details" ${expanded?'open':''}><summary>${escapeText(title)}</summary><div class="evidence-panel"><p>${escapeText(ebay.detail||'')}${live?' Active asking prices are shown for comparison.':''}</p>${listings.map((row,index)=>`<div class="row"><a href="${escapeText(row.itemWebUrl)}" target="_blank" rel="noopener noreferrer">${escapeText(row.title)}</a><div><strong>${money(row.price)} asking</strong>${canChoose?` <button type="button" class="btn secondary compact" onclick="chooseEbayAsking(${index})">Use asking price</button>`:''}</div></div>`).join('')}</div></details>`;
}
window.chooseEbayAsking=index=>{
 const session=window.buyCheckSession, row=session?.ebayOptions?.[index], field=$('#bcOverride');
 if(!row||!field||$('#autoSearchBtn')?.disabled||session.item&&!RetroCheckout.available(session.item))return;
 session.ebayComparable={title:row.title,itemWebUrl:row.itemWebUrl,price:row.price,currency:'GBP',checkedAt:row.checkedAt||null};
 field.value=row.price.toFixed(2);
 buyCheckCalc();
 field.focus();
};
window.runMarketInsight=async()=>{
 const input=$('#marketQuery'),q=(input?.value||'').trim(),box=$('#marketLiveResult');
 if(!q||!box)return;
 box.innerHTML='<p class="muted">Searching live providers…</p>';
 try{
  const data=await loadPriceLookup(new URLSearchParams({q,cexGrade:'Unboxed'}));
  if(input.value.trim()!==q||!box.isConnected)return;
  const evidence=data.evidence||[];
  const pending=data.needsConfirmation||data.needsRefinement;
  box.innerHTML=`<div class="market-result-head"><strong>${escapeText(data.lockedIdentity?.label||q)}</strong><span>${data.marketValue!=null?'Current RetroHQ UK benchmark '+money(data.marketValue):'No confirmed UK benchmark'}</span></div>
   ${ebayMarketListings(evidence,true)}
   ${pending?'<p class="notice">Use Acquire / Value to confirm the exact catalogue edition or console generation for a UK benchmark.</p>':''}
   <div class="evidence-panel">${evidence.filter(row=>row.provider!=='eBay UK').map(row=>`<div class="evidence-row"><span>${escapeText(row.provider)}</span><strong>${escapeText(row.status||'Unavailable')}</strong><small>${escapeText(row.detail||'')}</small></div>`).join('')}</div>`;
 }catch(error){if(input.value.trim()===q&&box.isConnected)box.textContent=error.message;}
};


const researchQuery=()=>($('#qDesc')?.value||$('#bcDesc')?.value||'').trim();
const ebayUrl=(q,sold=false)=>`https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(q)}${sold?'&LH_Sold=1&LH_Complete=1':''}&LH_PrefLoc=1`;
const cexUrl=q=>`https://uk.webuy.com/search?stext=${encodeURIComponent(q)}`;
const googleUrl=q=>`https://www.google.com/search?q=${encodeURIComponent(q+' UK used price')}`;

let acquisitionPhoto=null;
function nextImportedPriceCheck(item){
 if(item.importedFrom!=='ebay-production')return null;
 return state.items.find(other=>other.id!==item.id&&other.importedFrom==='ebay-production'&&needsPriceCheck(other));
}
function importedPriceSearch(item){
 const details=item.liveSnapshot?.details||{};
 const specifics=[...(details.variationSpecifics||[]),...(details.specifics||[])];
 const specific=labels=>{
  const values=[...new Set(specifics.filter(row=>labels.includes(String(row.name).trim().toLowerCase()))
   .flatMap(row=>row.values).map(value=>String(value).trim()).filter(value=>value&&!/^(?:unknown|n\/a|does not apply|not applicable)$/i.test(value)))];
  return values.length===1?values[0]:'';
 };
 return {title:specific(['game name','game title','video game name','product name']),
  platform:specific(['platform','compatible platform'])};
}
function applyAcquisitionDefaults(prefix){
 const category=$('#'+prefix+(prefix==='bc'?'Category':'Cat'));
 if(!category||prefix==='bc'&&window.buyCheckSession?.item)return;
 const preset=state.settings.acquisitionDefaults?.[category.value]||{};
 for(const [suffix,value] of [[prefix==='bc'?'Ask':'Buy',preset.buy],['Area',preset.area],['Shelf',preset.shelf]]){
  const field=$('#'+prefix+suffix);
  if(!field)continue;
  if(!field.dataset.defaultTracked){
   field.dataset.defaultTracked='1';
   if(field.value!=='')field.dataset.userSet='1';
   field.addEventListener('input',()=>{field.dataset.userSet='1';});
  }
  if(!field.dataset.userSet)field.value=value??'';
 }
 if(prefix==='bc')buyCheckCalc();else updateQuickIntel();
}
window.acquisitionCategoryChanged=(prefix,category)=>{
 category.dataset.userSet='1';
 applyAcquisitionDefaults(prefix);
};
function inferAcquisitionCategory(prefix,identity){
 const category=$('#'+prefix+(prefix==='bc'?'Category':'Cat'));
 if(!category||category.dataset.userSet||prefix==='bc'&&window.buyCheckSession?.item)return;
 if(identity?.type==='hardware')category.value='Console';
 else if(identity?.type==='software')category.value='Video Game';
 else return;
 applyAcquisitionDefaults(prefix);
}
const acquisitionCategoryOptions=()=>acquisitionCategories.map(category=>'<option>'+category+'</option>').join('');
window.buyCheck=(item=null,scan=null)=>{
 acquisitionPhoto=scan?.image||null;photoSearchNote=scan?.query||'';
 const imported=item?.importedFrom==='ebay-production'?importedPriceSearch(item):null;
 const platform=item?.identity?.platform||imported?.platform||item?.platform||'';
 const title=item?.identity?.confirmedProduct||imported?.title||item?.title||'';
 const query=scan?.query||[title,platform&&!title.toLowerCase().includes(platform.toLowerCase())?platform:''].filter(Boolean).join(' ');
 const seed=item?{q:query,barcode:item.barcode||'',pcId:item.identity?.pricechartingProductId||item.valuation?.identity?.pricechartingProductId||null,cexId:item.cexProductId||null}:null;
 const condition=item?.condition||'Good';
 const readOnly=item&&!RetroCheckout.available(item);
 window.buyCheckSession={item,seed,pcId:null,cexId:null,cexVariants:[],condition};
 open(`<h2>${item?'Check price':'Identify → Decide → Acquire'}</h2>${item?`<p><strong>${escapeText(item.title)}</strong> · HQ value ${knownMoney(independentMarketValue(item))} · eBay listed ${knownMoney(ebayListedPrice(item))}</p>`:'<button class="link-button" onclick="quickBuy()">Quick entry without research</button>'}${item?'<p class="muted">Compare CeX prices and eBay asking prices. If the listing title is long, search using the product name and platform or model.</p>':'<p class="muted">Type or scan the item. RetroHQ handles identification, CeX grading and live evidence in the background.</p>'}
<div class="scan-actions"><button class="btn primary" onclick="photoIdentify()">Photo search</button><button class="btn secondary" onclick="scanBarcode()">Scan barcode</button>${item?'':`<button class="btn secondary" onclick="document.getElementById('bcNextPhoto').click()">Scan next</button><input id="bcNextPhoto" type="file" accept="image/*" capture="environment" hidden onchange="queueSourcingPhoto(this.files[0]);this.value=''">`}</div>
<small class="muted">Photo search sends the image to OpenAI for identification. API charges apply.</small>

<section class="card bc-result" aria-label="Price result"><div id="bcResultHead"></div><div id="autoSearchStatus" class="auto-status" role="status">Ready to check a price.</div><div id="autoEvidence"></div><div class="formgrid value-fields"><div class="field"><label>RetroHQ UK Market Value</label><input id="bcMarket" class="input" type="number" readonly placeholder="Waiting for live UK evidence"></div><div class="field"><label>Manual override (optional)</label><input id="bcOverride" name="retrohq_market_override" class="input" type="number" step="0.01" autocomplete="off" placeholder="Leave blank to use RetroHQ value" oninput="buyCheckSession.ebayComparable=null;buyCheckCalc()"><small id="overrideHint" class="muted" aria-live="polite">Only use this when you deliberately want to replace RetroHQ's calculated value.</small></div></div></section><div id="bcSourcingQueue" aria-live="polite"></div>
<details id="bcSearchTools" class="card" ${!query?'open':''}><summary>Search by title or barcode</summary><div class="counter-search"><label for="bcDesc">${item?'Product to price':'What is the item?'}</label><div class="counter-search-row"><input id="bcDesc" class="input counter-input" value="${escapeText(query)}" autofocus oninput="buyLookupChanged()" placeholder="e.g. PS3 Slim 320GB Scarlet Red" onkeydown="if(event.key==='Enter'){event.preventDefault();autoMarketSearch();}"><button id="autoSearchBtn" class="btn primary" onclick="autoMarketSearch()">Search</button></div><small class="muted">Press Enter to search. You will only be asked to confirm when RetroHQ is genuinely unsure.</small></div>
<div class="formgrid buy-basics"><div class="field"><label>Barcode / EAN (optional)</label><input id="bcBarcode" class="input" inputmode="numeric" value="${escapeText(item?.barcode||'')}" oninput="buyLookupChanged()" onkeydown="if(event.key==='Enter'){event.preventDefault();autoMarketSearch();}"></div></div></details>
<details class="card"><summary>Condition and contents</summary><div class="buy-grade-card"><div><label>Condition</label><div class="quality-buttons"><button type="button" data-quality="Excellent" onclick="setBuyCondition('Excellent')">Excellent</button><button type="button" data-quality="Good" onclick="setBuyCondition('Good')">Good</button><button type="button" data-quality="Poor" onclick="setBuyCondition('Poor')">Poor</button></div></div><div><label>Included</label><div class="accessory-checks"><label id="bcBoxWrap"><input id="bcBox" type="checkbox" ${item?.accessories?.box?'checked':''} onchange="this.dataset.userSet='1';buyAccessoryChanged('box')"> <span id="bcBoxLabel">Box</span></label><label id="bcControllerWrap"><input id="bcController" type="checkbox" ${item?.accessories?.controller?'checked':''} onchange="buyAccessoryChanged('controller')"> Controller</label><label id="bcCablesWrap"><input id="bcCables" type="checkbox" ${item?.accessories?.cables?'checked':''} onchange="buyAccessoryChanged('cables')"> Cables</label></div></div><div id="bcGradeHint" class="grade-hint"></div></div></details>
<div id="bcLinks"></div>${item?'':`<div class="formgrid"><label>Category<select class="select" id="bcCategory" onchange="acquisitionCategoryChanged('bc',this)">${acquisitionCategoryOptions()}</select></label><label>Purchase price (£)<input id="bcAsk" class="input" type="number" min="0" step="0.01" placeholder="Enter amount paid" oninput="buyCheckCalc()"></label></div>`}

<details class="card" ${item?'hidden':''}><summary>Storage and buying trip</summary><div class="formgrid"><label>Area<input class="input" id="bcArea"></label><label>Shelf<input class="input" id="bcShelf"></label><label>Buying trip / lot<input class="input" id="bcBatch" list="batchNames"><datalist id="batchNames">${[...new Set(state.items.map(i=>i.batchName).filter(Boolean))].map(n=>'<option value="'+escapeText(n)+'">').join('')}</datalist></label></div></details>${item?'':buyingCostsHtml("bc")+'<div id="bcDecision" class="decision-panel"></div>'}<div id="acquireError" role="status"></div><div class="modal-actions acquire-actions">${item?'<button class="btn secondary" onclick="closeModal()">Close</button>'+(readOnly?'':(nextImportedPriceCheck(item)?'<button class="btn secondary" onclick="saveExistingValue(true)">Save &amp; check next</button>':'')+'<button class="btn primary" onclick="saveExistingValue()">Save value</button>'):'<button class="btn secondary" onclick="closeModal()">Decline</button><button class="btn secondary" onclick="saveAcquisition(true)">Save & next</button><button class="btn primary" onclick="saveAcquisition(false)">Save item</button>'}</div>`);
 if(item?.accessories)$('#bcBox').dataset.userSet='1';
 if(item?.identity)updateCompletenessUI(item.identity);
 $$('.quality-buttons button').forEach(button=>button.classList.toggle('active',button.dataset.quality===condition));
 renderBuyGradeHint();renderBuyLinks();applyAcquisitionDefaults('bc');buyCheckCalc();renderPriceHeader();renderSourcingQueue();modal.scrollTop=0;
 if(scan?.result)runConfirmedSearch({prefetched:scan.result});
 else if((scan?.query&&scan.status!=='Review match')||(item&&!demoMode&&(query||item.barcode)))autoMarketSearch();
 else if(scan){editPhotoDescription();$('#autoSearchStatus').textContent=scan.error||'Check the photo suggestion and search.';}
};

function renderPriceHeader(identity,evidence=[]){
 const box=$('#bcResultHead');
 if(!box)return;
 const name=identity?.confirmedProduct||$('#bcDesc')?.value.trim()||photoSearchNote||'Price check';
 const platform=identity?.platform;
 const ebay=(evidence||[]).find(row=>row.provider==='eBay UK'&&row.status==='Live');
 const range=Number.isFinite(ebay?.lowAsking)&&Number.isFinite(ebay?.highAsking)?money(ebay.lowAsking)+'–'+money(ebay.highAsking):null;
 box.innerHTML=`<div class="bc-result-head">${RetroBuying.validPhoto(acquisitionPhoto)?`<img src="${acquisitionPhoto}" alt="Photo used for this price check">`:''}<div><h3>${escapeText(name)}</h3>${platform?`<p>${escapeText(platform)}</p>`:''}${range?`<p><strong>eBay UK asks ${range}</strong> · ${escapeText(ebay.count)} sampled</p>`:''}</div><div><button class="btn secondary" onclick="editPhotoDescription()">Correct match</button>${acquisitionPhoto?'<button class="btn secondary" onclick="removeAcquisitionPhoto()">Remove photo</button>':''}</div></div>`;
}
function escapeText(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function identityCard(i){if(!i)return '';const attrs=i.attributes||{};const detail=[i.platform,attrs.revision,attrs.storage,attrs.colour].filter(Boolean);return `<div class="identity-lock"><div><strong>🔒 RetroHQ Identity Locked</strong><small>${i.confirmedProduct||i.label||'Confirmed item'}</small></div>${detail.length?`<div class="identity-tags">${detail.map(x=>`<span>${x}</span>`).join('')}</div>`:''}</div>`;}
function cexTradeText(value,origin){return value==null?'Unavailable':(origin==='indicative-rate'?'≈':'')+money(value);}
function cexTradeHint(origin){return origin==='indicative-rate'?'Indicative from CeX rate — verify before trade-in':origin==='cex-calculated'?'CeX calculated price':'';}
function cexVariantCards(variants){return `<div class="cex-variant-list">${variants.map(v=>`<button class="cex-variant-card" onclick="chooseCexVariant('${String(v.productId||'').replace(/'/g,'')}','${String(v.grade||'').replace(/'/g,'')}')"><div class="cex-variant-top"><span class="cex-grade">${v.grade||'CeX variant'}</span><strong>${escapeText(v.product||'Unknown CeX product')}</strong><small>CeX code ${escapeText(v.productId)}</small></div><div class="cex-price-grid"><span><small>Retail</small><b>${v.retail!=null?money(v.retail):'—'}</b></span><span><small>Cash</small><b>${cexTradeText(v.cash,v.cashSource)}</b></span><span><small>Voucher</small><b>${cexTradeText(v.voucher,v.voucherSource)}</b></span></div><span class="cex-select">Use this exact CeX record →</span></button>`).join('')}</div>`;}
function evidenceRow(x){
 if(x.provider==='CeX UK'&&x.status==='Live')return `<div class="evidence-row evidence-provider"><div class="provider-head"><span>CeX UK <em>(GBP)</em></span><span class="pill good">${x.selectedByUser?'Confirmed match':'Live'}</span></div><strong class="provider-product">${escapeText(x.product||'Matched CeX record')}</strong>${x.productId?'<a class="btn secondary compact" target="_blank" rel="noopener noreferrer" href="https://uk.webuy.com/product-detail?id='+encodeURIComponent(x.productId)+'">View CeX product</a>':''}<div class="provider-prices"><span><small>Retail</small><b>${x.retail!=null?money(x.retail):'—'}</b></span><span><small>Cash trade-in</small><b>${cexTradeText(x.cash,x.cashSource)}</b></span><span><small>Voucher</small><b>${cexTradeText(x.voucher,x.voucherSource)}</b></span></div><small>${x.grade?`CeX catalogue grade: ${x.grade} · `:''}${x.matchQuality?`Match: ${x.matchQuality}. `:''}${x.detail||''}</small>${x.productId?`<button class="btn secondary compact" onclick="changeCexMatch()">Change CeX match</button>`:''}${!x.selectedByUser&&window.buyCheckSession?.benchmark==null&&x.productId?`<button class="btn primary compact" onclick="chooseCexVariant('${String(x.productId).replace(/'/g,'')}','${String(x.grade||'').replace(/'/g,'')}')">Confirm this CeX match</button>`:''}</div>`;
 if(x.provider==='CeX UK'&&x.variants?.length){window.buyCheckSession.cexVariants=x.variants;return `<div class="evidence-row evidence-provider"><div class="provider-head"><span>CeX UK</span><span class="pill warn">Action needed</span></div><small>${x.detail||''}</small>${cexVariantCards(x.variants)}</div>`;}
 return `<div class="evidence-row"><span>${x.provider}${x.currency?` <em>(${x.currency})</em>`:''}</span><strong>${x.value!=null?money(x.value):x.status}</strong><small>${x.matchQuality?`Match: ${x.matchQuality} · `:''}${x.detail||''}</small></div>`;
}
function completenessProfile(identity){
 const type=identity?.type||'',platform=identity?.platform||'';
 if(type!=='hardware')return {box:true,controller:false,cables:false,label:'item'};
 if(['Game Boy Advance','Game Boy Color'].includes(platform))return {box:true,controller:false,cables:false,label:'handheld'};
 return {box:true,controller:true,cables:true,label:'console'};
}
function updateCompletenessUI(identity){
 // Missing PriceCharting does not establish that this isn't a console.
 // Keep the controller and cables controls until the type is known.
 if(!identity)return;
 defaultGameBox('bc',identity);const p=completenessProfile(identity);window.buyCheckSession.profile=p;
 const set=(id,on)=>{const el=$(id);if(el)el.classList.toggle('hidden',!on);};
 set('#bcBoxWrap',p.box);set('#bcControllerWrap',p.controller);set('#bcCablesWrap',p.cables);
 if($('#bcBoxLabel'))$('#bcBoxLabel').textContent=p.label==='item'?'Box / case':'Box';
}
async function loadAccessoryCosts(identity,condition){
 const profile=completenessProfile(identity);
 if(!profile.controller||!identity?.platform)return {};
 try{
  const colour=condition==='Poor'?'':(identity.attributes?.colour||'');
  const response=await fetch('/api/accessory-costs?'+new URLSearchParams({platform:identity.platform,colour}));
  const data=await response.json();
  return {controller:data.controller?.ok?{amount:Number(data.controller.retail)||0,product:data.controller.product,source:'CeX UK live retail'}:null};
 }catch{return {};}
}
function renderSmartValuation(){
 const s=window.buyCheckSession||{},box=$('#valuationBreakdown');if(!box)return;
 const v=s.valuation;if(!v){box.innerHTML='';return;}
 box.innerHTML=`<div class="smart-breakdown"><div class="row"><span>${v.benchmarkLabel}</span><strong>${money(v.benchmark)}</strong></div>${v.adjustments.map(a=>`<div class="row adjustment"><span>${a.label}<small>${a.source||''}</small></span><strong>−${money(a.amount)}</strong></div>`).join('')}<div class="row total"><span>RetroHQ UK Market Value</span><strong>${money(v.finalValue)}</strong></div>${v.unresolved.length?`<div class="unresolved"><strong>Needs attention</strong><span>${v.unresolved.join(' · ')}</span></div>`:''}</div>`;
}
function applySmartValuation(){
 const s=window.buyCheckSession||{},benchmark=Number(s.benchmark);if(s.benchmark==null||!Number.isFinite(benchmark)){s.valuation=null;if($('#bcMarket'))$('#bcMarket').value='';renderSmartValuation();buyCheckCalc();return;}
 const p=s.profile||completenessProfile(s.lockedIdentity),adjustments=[],unresolved=[];
 if(p.controller&&!$('#bcController')?.checked){
   const c=s.accessoryCosts?.controller;
   if(c?.amount>0)adjustments.push({type:'controller',label:'Missing controller replacement',amount:c.amount,source:c.product||c.source});
   else unresolved.push('Missing controller — no trusted replacement price found');
 }
 if(p.cables&&!$('#bcCables')?.checked){
   const amount=Math.max(0,Number(state.settings.accessoryAllowances?.cables)||0);
   if(amount>0)adjustments.push({type:'cables',label:'Missing essential cables allowance',amount,source:'RetroHQ business rule'});
   else unresolved.push('Missing cables — replacement allowance not configured');
 }
 const total=adjustments.reduce((a,x)=>a+x.amount,0),finalValue=Math.max(0,Math.round((benchmark-total)*100)/100);
 s.valuation={benchmark,cexGrade:s.cexCatalogueGrade||null,cexProduct:s.cexCatalogueProduct||null,benchmarkLabel:`CeX ${cexGradeForBuyCheck()} retail benchmark`,adjustments,unresolved,finalValue,acquisitionValue:finalValue,recommendedMax:Math.round(finalValue*(state.settings.offerPct/100)*100)/100,confidence:unresolved.length?'partial':adjustments.length?'adjusted':'benchmark',source:'CeX UK + RetroHQ item adjustments',timestamp:today(),profile:p,identity:s.lockedIdentity||null};
 if($('#bcMarket'))$('#bcMarket').value=finalValue.toFixed(2);renderSmartValuation();renderBuyGradeHint();buyCheckCalc();
}
window.renderMarketResult=async(d,current)=>{const status=$('#autoSearchStatus'),ev=$('#autoEvidence');window.buyCheckSession.evidence=d.evidence||[];renderPriceHeader(d.lockedIdentity||d.provisionalIdentity,d.evidence);inferAcquisitionCategory('bc',d.lockedIdentity||d.provisionalIdentity);if(d.pricechartingProductId)window.buyCheckSession.pcId=String(d.pricechartingProductId);if(d.lockedIdentity||d.provisionalIdentity)updateCompletenessUI(d.lockedIdentity||d.provisionalIdentity);
 if(d.needsRefinement){window.buyCheckSession.benchmark=null;window.buyCheckSession.valuation=null;$('#bcMarket').value='';status.textContent='One quick question — choose the console generation.';ev.innerHTML=`<div class="evidence-panel"><h3>Which one is it?</h3><div class="candidate-list">${(d.refinements||[]).map(r=>`<button class="candidate-card" onclick="refineMarketSearch('${String(r.query).replace(/'/g,'')}')"><strong>${r.label}</strong><small>Use this generation</small></button>`).join('')}</div></div>${ebayMarketListings(d.evidence,false,true)}`;buyCheckCalc();return;}
 if(d.needsConfirmation){window.buyCheckSession.benchmark=null;window.buyCheckSession.valuation=null;$('#bcMarket').value='';status.classList.add('action-required');status.textContent=photoSearchNote?'Photo identified — confirm the catalogue edition/platform below.':'RetroHQ found more than one credible match.';ev.innerHTML=`<div class="evidence-panel"><h3>Which item is this?</h3><div class="candidate-list">${(d.candidates||[]).slice(0,6).map(c=>`<button class="candidate-card" onclick="selectMarketCandidate('${String(c.id).replace(/'/g,'')}')"><strong>${c['product-name']||'Unknown product'}</strong><span>${c['console-name']||'Unknown platform'}</span><small>Confirm this item →</small></button>`).join('')}</div></div>${ebayMarketListings(d.evidence,false,true)}`;buyCheckCalc();return;}
 status.classList.remove('action-required');window.buyCheckSession.lockedIdentity=d.lockedIdentity||null;window.buyCheckSession.benchmark=d.marketValue!=null?Number(d.marketValue):null;window.buyCheckSession.evidence=d.evidence||[];renderBuyGradeHint();
 const selectedCex=(d.evidence||[]).find(x=>x.provider==='CeX UK'&&x.status==='Live');window.buyCheckSession.cexCatalogueGrade=selectedCex?.grade||null;window.buyCheckSession.cexCatalogueProduct=selectedCex?.product||null;if(d.lockedIdentity?.type==='software'&&selectedCex?.grade&&$('#bcBox'))$('#bcBox').checked=selectedCex.grade!=='Unboxed';renderBuyGradeHint();
 const hasPC=(d.evidence||[]).some(x=>x.provider==='PriceCharting'&&x.status==='Live');
 if(d.marketValue!=null){status.textContent=window.buyCheckSession.item?'UK benchmark ready'+(selectedCex?.product?' · '+selectedCex.product:''):'✓ UK benchmark ready — valuing the actual item in front of you.';}
 else{$('#bcMarket').value='';status.textContent=hasPC?'✓ Item identified by PriceCharting. UK pricing still needs a CeX match.':'No confirmed UK benchmark yet.';}
 const providerSummary=(d.evidence||[]).map(x=>x.provider+': '+(x.status==='Live'&&x.retail!=null?'retail '+money(x.retail):x.status||'Unknown')).join(' · ');
 const cexAction=(d.evidence||[]).find(x=>x.provider==='CeX UK');
 const pcRecord=(d.evidence||[]).find(x=>x.provider==='PriceCharting'&&x.status==='Live');
 const pcPrice=pcRecord?.prices||{};
 const pcPairs=[['Loose reference','loose-price'],['Complete / CIB reference','cib-price'],['New reference','new-price']].filter(([,key])=>pcPrice[key]!=null&&pcPrice[key]>0);
 const priceReference=pcRecord?`<div class="evidence-panel"><strong>✓ PriceCharting identity confirmed: ${escapeText(pcRecord.product||'Game')} — ${escapeText(pcRecord.console||'Platform not specified')}</strong><small class="muted">PriceCharting reference data (US dollars). Not a UK resale valuation.</small><div class="cex-price-grid">${pcPairs.map(([label,key])=>`<span><small>${label}</small><b>${moneyUSD(pcPrice[key])}</b></span>`).join('')}${pcRecord.salesVolume!=null?`<span><small>Annual sales volume</small><b>${escapeText(pcRecord.salesVolume)}</b></span>`:''}</div>${!pcPairs.length?'<small class="muted">No PriceCharting price for this edition.</small>':''}</div>`:'';
 const nearby=(cexAction?.suggestions||[]).map((candidate,index)=>
   `<button class="btn secondary" onclick="reviewCeXSearch(${index})">${escapeText(candidate.product)}</button>`).join(' ');
 window.buyCheckSession.cexSuggestions=cexAction?.suggestions||[];
 const noCex=cexAction&&cexAction.status!=='Live'&&!cexAction.variants?.length?
   `<div class="notice"><strong>${escapeText(cexAction.status||'No CeX match')}</strong><p>${escapeText(cexAction.detail||'')}</p><p>Try the title and platform printed on the item, or scan its barcode.</p><button class="btn secondary" onclick="editPhotoDescription()">Shorten search</button> <button class="btn secondary" onclick="scanBarcode()">Scan barcode</button> <button class="btn secondary" onclick="document.getElementById('bcOverride').focus()">Enter verified value</button> ${window.buyCheckSession.cexId?'<button class="btn secondary" onclick="changeCexMatch()">Search CeX matches again</button>':''}</div>`:'';
 const cexPrices=cexAction?.status==='Live'?
   `<div class="cex-price-grid"><span><small>CeX retail</small><b>${cexAction.retail!=null?money(cexAction.retail):'Unavailable'}</b></span><span><small>CeX cash trade-in</small><b>${cexTradeText(cexAction.cash,cexAction.cashSource)}</b></span><span><small>CeX voucher trade-in</small><b>${cexTradeText(cexAction.voucher,cexAction.voucherSource)}</b></span></div>`+
   ((cexTradeHint(cexAction.cashSource)||cexTradeHint(cexAction.voucherSource))?
    '<small class="muted">'+[cexTradeHint(cexAction.cashSource),cexTradeHint(cexAction.voucherSource)].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join(' · ')+'</small>':''):'';
 const cexPrompt=d.marketValue==null&&cexAction?.variants?.length?cexVariantCards(cexAction.variants):
   d.marketValue==null&&cexAction?.status==='Live'&&cexAction.productId?
   `<button class="btn primary" onclick="chooseCexVariant('${String(cexAction.productId).replace(/'/g,'')}','${String(cexAction.grade||'').replace(/'/g,'')}')">Confirm CeX record to use UK retail price</button>`:'';
 ev.innerHTML=`${cexPrompt?'<div class="action-required"><strong>Action needed — choose the edition or contents</strong>'+cexPrompt+'</div>':''}${cexPrices}${noCex}${nearby?`<div class="notice"><strong>Check a nearby title</strong><p>Choose a suggestion only if it matches your item. This starts a new search.</p>${nearby}</div>`:''}${ebayMarketListings(d.evidence,Boolean(noCex),true)}<details class="evidence-details"><summary>View price evidence</summary>${priceReference}<div class="evidence-panel"><div id="valuationBreakdown"></div>${identityCard(d.lockedIdentity)}${(d.evidence||[]).filter(row=>row.provider!=='eBay UK'&&!(cexPrompt&&row.provider==='CeX UK')).map(evidenceRow).join('')}<small class="muted method-note">${d.method||''}</small></div></details>`;
 const session=window.buyCheckSession;
 const accessoryCosts=await loadAccessoryCosts(d.lockedIdentity||d.provisionalIdentity,session.condition);
 if(current()){session.accessoryCosts=accessoryCosts;applySmartValuation();}
};
window.buyLookupChanged=()=>{
 const old=window.buyCheckSession;
 if(!$('#bcDesc')||!old)return;
 window.buyCheckSession={item:old.item,seed:old.seed,condition:old.condition,pcId:null,cexId:null};
 $('#bcOverride').value='';$('#bcMarket').value='';$('#autoEvidence').innerHTML='';
 const status=$('#autoSearchStatus');
 status.classList.remove('action-required');status.textContent='Ready to search.';
 $('#autoSearchBtn').disabled=false;
 renderPriceHeader();renderBuyLinks();buyCheckCalc();
};
window.runConfirmedSearch=async({cexId=null,cexGrade=null,prefetched=null}={})=>{
 const q=$('#bcDesc')?.value.trim()||'',barcode=$('#bcBarcode')?.value.trim()||'';
 const session=window.buyCheckSession,status=$('#autoSearchStatus'),evidence=$('#autoEvidence'),button=$('#autoSearchBtn');
 if(!session||!button)return;
 if(!q&&!barcode){status.textContent='Enter an item name or barcode first.';return;}
 const requestId=(session.requestId||0)+1;
 const current=()=>window.buyCheckSession===session&&session.requestId===requestId&&button.isConnected;
 session.requestId=requestId;session.cexId=cexId;session.benchmark=null;session.valuation=null;session.evidence=[];session.ebayOptions=[];
 if(session.ebayComparable){clearBuyOverride();buyCheckCalc();}
 $('#bcMarket').value='';button.disabled=true;status.textContent='Checking live market evidence…';
 renderBuyLinks();buyCheckCalc();
 try{
  const params=new URLSearchParams({q,barcode,cexGrade:cexGrade??cexGradeForBuyCheck()});
  if(session.item)params.set('stockPrice','1');
  if(session.pcId)params.set('id',session.pcId);
  if(cexId)params.set('cexId',cexId);
  if(session.manualCexChoice)params.set('cexChoose','1');
  const data=prefetched||await loadPriceLookup(params);
  if(!current())return;
  await renderMarketResult(data,current);
 }catch(error){
  if(current()){
   status.textContent='Price lookup interrupted';
   evidence.innerHTML=`<p>${escapeText(error.message)}</p><button type="button" class="btn primary" id="retryPriceLookup">Retry price check</button>`;
   $('#retryPriceLookup').onclick=()=>runConfirmedSearch({cexId,cexGrade});
  }
 }finally{if(current())button.disabled=false;}
};
async function loadPriceLookup(params){
 let response;
 try{response=await fetch('/api/market-search?'+params,{cache:'no-store'});}
 catch{throw Error('Could not reach RetroHQ. Check your connection and retry.');}
 let data;
 try{data=await response.json();}
 catch{throw Error('RetroHQ returned an incomplete price response. Retry from here.');}
 if(!response.ok||!data||typeof data!=='object'||data.ok===false)throw Error(data?.status||'Price lookup could not finish. Try again.');
 return data;
}
window.autoMarketSearch=()=>{
 buyLookupChanged();
 const session=window.buyCheckSession,seed=session?.seed;
 const same=seed&&seed.q===$('#bcDesc')?.value.trim()&&seed.barcode===$('#bcBarcode')?.value.trim();
 if(same)session.pcId=seed.pcId;
 return runConfirmedSearch({cexId:same?seed.cexId:null});
};
window.reviewCeXSearch=index=>{
 const candidate=window.buyCheckSession?.cexSuggestions?.[index];
 if(!candidate)return;
 $('#bcDesc').value=candidate.query;$('#bcBarcode').value='';
 buyLookupChanged();window.buyCheckSession.manualCexChoice=true;return runConfirmedSearch();
};
window.refineMarketSearch=query=>{$('#bcDesc').value=query;$('#bcBarcode').value='';return autoMarketSearch();};
window.selectMarketCandidate=id=>{window.buyCheckSession.pcId=String(id);return runConfirmedSearch();};
window.chooseCexVariant=async(productId,grade)=>{if(!productId)return;window.buyCheckSession.cexId=productId;await runConfirmedSearch({cexId:productId,cexGrade:grade||cexGradeForBuyCheck()});};
window.changeCexMatch=async()=>{window.buyCheckSession.manualCexChoice=true;window.buyCheckSession.cexId=null;await runConfirmedSearch({cexId:null,cexGrade:cexGradeForBuyCheck()});};
window.cexGradeForBuyCheck=()=>{if(window.buyCheckSession?.lockedIdentity?.type==='software')return window.buyCheckSession.cexCatalogueGrade||'Select exact game variant';const condition=window.buyCheckSession?.condition||'Good';if(condition==='Poor')return 'Discounted';return $('#bcBox')?.checked?'Boxed':'Unboxed';};
window.renderBuyGradeHint=()=>{const box=$('#bcGradeHint');if(!box)return;const grade=cexGradeForBuyCheck(),condition=window.buyCheckSession?.condition||'Good',v=window.buyCheckSession?.valuation,p=window.buyCheckSession?.profile||{};if(window.buyCheckSession?.lockedIdentity?.type==='software'){box.innerHTML=`<strong>Game condition and contents</strong><span>${condition} condition · ${$('#bcBox')?.checked?'case included':'no case'}. CeX catalogue: ${escapeText(window.buyCheckSession?.cexCatalogueGrade||'choose the exact condition and contents below')}. Shop condition does not imply CeX Mint. Prices follow the selected game record.</span>`;return;}box.innerHTML=`<strong>CeX comparison: ${grade}</strong><span>Chosen automatically from ${condition.toLowerCase()} condition${condition==='Poor'?'':' + '+($('#bcBox')?.checked?'box included':'no box')}. </span>${v?.adjustments?.length?`<small>RetroHQ has deducted ${money(v.adjustments.reduce((a,x)=>a+x.amount,0))} for missing essentials from the CeX benchmark.</small>`:''}${v?.unresolved?.length?`<small>⚠ ${v.unresolved.join(' · ')}</small>`:''}${!v&&((p.controller&&!$('#bcController')?.checked)||(p.cables&&!$('#bcCables')?.checked))?'<small>Missing essentials will be valued after the product is identified.</small>':''}`;};
window.clearBuyOverride=()=>{const o=$('#bcOverride');if(o)o.value='';if(window.buyCheckSession)window.buyCheckSession.ebayComparable=null;};
window.setBuyCondition=async(condition)=>{window.buyCheckSession=window.buyCheckSession||{};window.buyCheckSession.condition=condition;[...document.querySelectorAll('.quality-buttons button')].forEach(b=>b.classList.toggle('active',b.dataset.quality===condition));clearBuyOverride();renderBuyGradeHint();buyCheckCalc();if(window.buyCheckSession.pcId||window.buyCheckSession.evidence?.some(x=>x.provider==='CeX UK')){window.buyCheckSession.cexId=null;await runConfirmedSearch({cexGrade:cexGradeForBuyCheck()});}else applySmartValuation();};
window.buyAccessoryChanged=async(kind)=>{clearBuyOverride();renderBuyGradeHint();if(kind==='box'&&(window.buyCheckSession?.pcId||window.buyCheckSession?.evidence?.some(x=>x.provider==='CeX UK'))){window.buyCheckSession.cexId=null;await runConfirmedSearch({cexGrade:cexGradeForBuyCheck()});return;}applySmartValuation();};

window.renderBuyLinks=()=>{const q=($('#bcDesc')?.value||'').trim();const box=$('#bcLinks');if(!box)return;box.innerHTML=q?`<details class="live-research"><summary>More price research</summary><div class="research-buttons"><a class="btn secondary" target="_blank" rel="noopener" href="${ebayUrl(q,false)}">eBay UK active ↗</a><a class="btn secondary" target="_blank" rel="noopener" href="${ebayUrl(q,true)}">eBay UK sold ↗</a><a class="btn secondary" target="_blank" rel="noopener" href="https://www.ebay.co.uk/sh/research">eBay Product Research ↗</a><a class="btn secondary" target="_blank" rel="noopener" href="${cexUrl(q)}">CeX UK ↗</a><a class="btn secondary" target="_blank" rel="noopener" href="${googleUrl(q)}">Google UK ↗</a></div><small class="muted">These open the real provider search using your description. Provider pages open in a new tab.</small></details>`:`<p class="muted">Enter a description to generate live research links.</p>`;};

window.buyCheckCalc=()=>{const hint=$('#overrideHint');const chosen=window.buyCheckSession?.ebayComparable;if(hint)hint.textContent=chosen?money(chosen.price)+' selected from eBay UK · '+chosen.title+'. Asking price only. Save value to apply it.':$('#bcOverride')?.value.trim()?'Manual selling estimate active. Check it against market evidence.':'CeX retail is a reference benchmark, not a guaranteed eBay sale price.';renderBuyingDecision('bc');};
window.recordPass=()=>{const d=$('#bcDesc').value.trim(),raw=$('#bcAsk').value.trim(),ask=raw===''?null:Number(raw);if(!d)return alert('Describe the item first.');state.researchHistory=state.researchHistory||[];state.researchHistory.push({date:new Date().toISOString(),description:d,asking:ask,decision:'PASS'});closeModal();alert('Pass recorded in research history. No inventory item was created.');};
window.recordWatch=()=>{const d=$('#bcDesc').value.trim(),raw=$('#bcAsk').value.trim(),ask=raw===''?null:Number(raw);if(!d)return alert('Describe the item first.');state.researchHistory=state.researchHistory||[];state.researchHistory.push({date:new Date().toISOString(),description:d,asking:ask,decision:'WATCH'});closeModal();alert('Saved to research/watch history. No inventory item was created.');};
window.saveAcquisition=(next=false)=>{
 try{
  if(window.buyCheckSession?.item)throw Error('Use Save value to this item.');
  if($('#autoSearchBtn')?.disabled)throw Error('Wait for the current search to finish before saving.');
  const session=window.buyCheckSession||{},text=v=>{v=String(v||'').trim();if(/[<>"`]/.test(v))throw Error('Use plain text without markup or quotation marks.');return v;};
  const title=text(session.lockedIdentity?.confirmedProduct||$('#bcDesc').value);if(!title)throw Error('Enter or identify the item first.');
  const raw=$('#bcAsk').value,price=Number(raw),v=$('#bcOverride').value||$('#bcMarket').value,market=v===''?null:Number(v);
  if(raw.trim()===''||!Number.isFinite(price)||price<0)throw Error('Enter the purchase price, including zero if free.');
  if(market!==null&&(!Number.isFinite(market)||market<0))throw Error('Enter a valid value or leave it unknown.');
  const area=text($('#bcArea').value),shelf=text($('#bcShelf').value),batchName=text($('#bcBatch').value),batch=state.items.find(i=>i.batchName===batchName&&i.batchId);let valuation=session.valuation?JSON.parse(JSON.stringify(session.valuation)):null;
  if(session.ebayComparable)valuation={finalValue:market,acquisitionValue:market,benchmark:market,
   benchmarkLabel:'Selected eBay asking price',source:'Selected eBay asking price',confidence:'selected-asking-price',ebayComparable:session.ebayComparable,timestamp:today()};
  else if(valuation&&$('#bcOverride').value){valuation.finalValue=market;valuation.acquisitionValue=market;valuation.source='Manual override over stored evidence';valuation.confidence='override';}
  const item={id:Math.max(Date.now(),...state.items.map(i=>i.id+1)),title,manufacturer:'',category:$('#bcCategory').value,source:'Buy Check',buy:Math.round(price*100)/100,baseMarket:market,marketIsConditionSpecific:true,valuation,needsIdentification:!session.lockedIdentity,needsValuation:market===null,status:'Acquired',condition:session.condition||'Good',acquiredCondition:session.condition||'Good',accessories:{box:$('#bcBox').checked,controller:$('#bcController').checked,cables:$('#bcCables').checked},identity:session.lockedIdentity||null,cexGrade:cexGradeForBuyCheck(),cexProductId:session.evidence?.find(x=>x.provider==='CeX UK'&&x.status==='Live')?.productId||null,cexProduct:session.cexCatalogueProduct||null,barcode:text($('#bcBarcode').value),area,shelf,location:[area,shelf].filter(Boolean).join(' / ')||'Unassigned',acquiredDate:today(),batchId:batchName?(batch?.batchId||crypto.randomUUID()):null,batchName:batchName||null,velocity:70,notes:'',photoData:acquisitionPhoto,photos:acquisitionPhoto?1:0,buyingEstimate:buyingEstimate('bc'),marketEvidence:session.evidence||[],processingCosts:0,listing:null,sale:null,timeline:[['Acquired',today()+' · purchased for '+money(price)+(batchName?' · '+batchName:'')]]};
  state.items.push(item);if(!persistState()){state.items.pop();return;}
  if(next){
   const carry=[['bcArea',area],['bcShelf',shelf]].filter(([id])=>$('#'+id).dataset.userSet);
   const ready=sourcingScans.findIndex(scan=>scan.status==='Ready');
   buyCheck(null,ready<0?null:sourcingScans.splice(ready,1)[0]);
   for(const [id,value] of carry){const field=$('#'+id);field.value=value;field.dataset.userSet='1';}
   $('#bcBatch').value=batchName;
  }else{closeModal();go('inventory');}
 }catch(e){$('#acquireError').textContent=e.message;$('#acquireError').className='action-required';$('#acquireError').scrollIntoView({block:'nearest'});}
};
window.buyFromCheck=()=>saveAcquisition(false);

window.quickBuy=(seed={})=>{acquisitionPhoto=seed.photo||null;if(!seed.photo)photoSearchNote='';open(`<h2>${seed.valuation?'Complete acquisition':'⚡ Quick Capture'}</h2><p class="muted">${seed.valuation?'Confirm the purchase details and add the valued item to inventory.':'Already bought it and short on time? Record it now; RetroHQ will bring missing identification or valuation back into HQ Today.'}</p>
<div class="identify-box"><div class="identify-tabs"><button class="btn secondary" onclick="scanBarcode()">▥ Scan barcode</button><button class="btn secondary" onclick="photoIdentify()">Photo search</button><button class="btn secondary" onclick="document.querySelector('#qDesc').focus()">⌕ Description</button></div><div class="formgrid"><div class="field full"><label>Describe the item</label><input id="qDesc" class="input" placeholder="e.g. Pokémon Emerald GBA PAL cartridge only" value="${(seed.desc||'').replace(/"/g,'&quot;')}" oninput="parseDescription();renderQuickLinks()"><small class="muted">Loose/unboxed items are fine — describe what you know.</small></div><div class="field"><label>Barcode / EAN</label><input id="qBarcode" class="input" inputmode="numeric" onkeydown="if(event.key==='Enter'){event.preventDefault();findCandidates();}" value="${seed.barcode||''}"></div><div class="field"><label>Identification status</label><div id="identifyStatus" class="evidence-status">${seed.desc?'Carried from Buy Check':'Waiting for confirmation'}</div></div></div><button class="btn primary" onclick="findCandidates()">Find likely matches</button><small class="muted">Photo search automatically sends your chosen photo to OpenAI; API charges apply.</small><div id="candidateBox"></div><div id="qLinks"></div></div>
<div class="formgrid"><div class="field full"><label>Confirmed item / title</label><input id="qTitle" class="input" value="${(seed.desc||'').replace(/"/g,'&quot;')}"></div><div class="field"><label>Category</label><select id="qCat" class="select" onchange="acquisitionCategoryChanged('q',this)">${acquisitionCategoryOptions()}</select></div><div class="field"><label>Manufacturer</label><select id="qMan" class="select">${manufacturers.map(x=>`<option>${x}</option>`).join('')}</select></div><div class="field"><label>Condition</label><select id="qCond" class="select" onchange="quickCaptureGradeChanged()">${Object.keys(factors).map(x=>`<option ${x===(seed.cond||'Good')?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Included</label><div class="accessory-checks quick-accessories"><label><input id="qBox" type="checkbox" onchange="this.dataset.userSet='1';quickCaptureGradeChanged()" ${seed.accessories?.box?'checked':''}> Box</label><label><input id="qController" type="checkbox" ${seed.accessories?.controller?'checked':''}> Controller</label><label><input id="qCables" type="checkbox" ${seed.accessories?.cables?'checked':''}> Cables</label></div></div><div class="field"><label>Region</label><select id="qRegion" class="select"><option>UK / PAL</option><option>Europe / PAL</option><option>USA / NTSC</option><option>Japan / NTSC-J</option><option>Region free / N/A</option><option>Unknown</option></select></div><div class="field"><label>Area</label><input id="qArea" class="input" placeholder="e.g. Stockroom"></div><div class="field"><label>Shelf</label><input id="qShelf" class="input" placeholder="e.g. B2"></div></div>
<div class="formgrid"><div class="field"><label>Verified UK market value</label><input id="qMarket" class="input" type="number" value="${seed.market??''}" oninput="updateQuickIntel()" placeholder="Optional now"></div><div class="field"><label>Amount paid</label><input id="qBuy" class="input" type="number" value="${seed.ask??''}" oninput="updateQuickIntel()"></div></div><div id="acquisitionPhotoSummary"></div>${buyingCostsHtml("q",seed.buyingEstimate?.costs)}<div id="qIntel" class="decision-panel"></div>
<div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn secondary" onclick="saveQuickBuy(true)">Save & next</button><button class="btn primary" onclick="saveQuickBuy(false)">Save item</button></div>`);window.quickBuySeed=seed;if(seed.accessories&&$('#qBox'))$('#qBox').dataset.userSet='1';defaultGameBox('q',seed.identity);window.quickCaptureLookupState={pcId:seed.identity?.pricechartingProductId||null,cexId:null,query:null,requestId:0,autoValueApplied:false,searched:false};inferAcquisitionCategory('q',seed.identity);applyAcquisitionDefaults('q');const platform=seed.identity?.platform||'';if(/^PlayStation/.test(platform))$('#qMan').value='Sony';else if(/^Xbox/.test(platform))$('#qMan').value='Microsoft';else if(/Game Boy|Nintendo/.test(platform))$('#qMan').value='Nintendo';parseDescription();renderQuickLinks();renderAcquisitionPhoto();updateQuickIntel();};

window.renderQuickLinks=()=>{const q=($('#qDesc')?.value||'').trim(),box=$('#qLinks');if(!box)return;box.innerHTML=q?`<div class="live-research"><strong>Live research links</strong><div class="research-buttons"><a class="btn secondary" target="_blank" rel="noopener" href="${ebayUrl(q,false)}">eBay active ↗</a><a class="btn secondary" target="_blank" rel="noopener" href="${ebayUrl(q,true)}">eBay sold ↗</a><a class="btn secondary" target="_blank" rel="noopener" href="${cexUrl(q)}">CeX UK ↗</a><a class="btn secondary" target="_blank" rel="noopener" href="${googleUrl(q)}">Google UK ↗</a></div></div>`:'';};

function buyingCostsHtml(prefix,costs={}){
 const fee=state.settings.fees.eBay,defaultPercent=fee?.type==='percent'?fee.value:'';
 return '<details class="card"><summary>Estimated selling costs</summary><p class="muted">eBay fee estimate is editable. Enter postage, packaging and preparation, including zero when none. These are estimates, not actual sale costs.</p><div class="formgrid">'+[['feePercent','Fees (%)',costs.feePercent??defaultPercent],['postage','Seller postage (£)',costs.postage],['packaging','Packaging (£)',costs.packaging],['preparation','Preparation / repairs (£)',costs.preparation]].map(([key,label,value])=>'<label>'+label+'<input class="input" id="'+prefix+key+'" type="number" min="0" step="0.01" value="'+(value??'')+'" oninput="'+(prefix==='bc'?'buyCheckCalc()':'updateQuickIntel()')+'"></label>').join('')+'</div></details>';
}
function buyingEstimate(prefix){
 const value=prefix==='bc'?($('#bcOverride')?.value.trim()||$('#bcMarket')?.value):$('#qMarket')?.value;
 const costs={};for(const k of ['feePercent','postage','packaging','preparation'])costs[k]=$('#'+prefix+k)?.value??'';
 const result=RetroBuying.estimate(value,$(prefix==='bc'?'#bcAsk':'#qBuy')?.value,costs,state.settings.offerPct);
 return {...result,costs:result.costs||Object.fromEntries(Object.entries(costs).map(([k,v])=>[k,v===''?null:Number(v)])),capturedAt:new Date().toISOString(),basis:prefix==='bc'&&$('#bcOverride')?.value.trim()?'Manual selling estimate':'Market reference / entered estimate'};
}
function renderBuyingDecision(prefix){
 const box=$(prefix==='bc'?'#bcDecision':'#qIntel');if(!box)return;const e=buyingEstimate(prefix);
 if(prefix==='bc'&&!e.ready&&!$('#bcMarket')?.value&&!$('#bcOverride')?.value&&(window.buyCheckSession?.evidence||[]).some(x=>x.provider==='PriceCharting'&&x.status==='Live'))e.reason='Game identified. There is no confirmed UK selling value yet. Select the exact CeX match or enter a verified manual selling estimate, then complete costs.';
 box.innerHTML=e.ready?'<div><span>Estimated sale</span><strong>'+money(e.price)+'</strong></div><div><span>Estimated selling costs</span><strong>'+money(e.total)+'</strong></div><div><span>Estimated profit after purchase</span><strong>'+(e.profit===null?'Enter purchase price':money(e.profit))+'</strong></div><div><span>Maximum buy</span><strong>'+money(e.maxBuy)+'</strong><small>Lower of configured buying target and break-even after costs</small></div><div><strong>'+e.decision+'</strong><small>Estimate only. Confirm exact item, condition and selling evidence.</small></div>':'<p class="muted">'+escapeText(e.reason)+'</p>';
}
function renderAcquisitionPhoto(){const box=$('#acquisitionPhotoSummary');if(box)box.innerHTML=RetroBuying.validPhoto(acquisitionPhoto)?'<p><strong>Photo identified: '+escapeText(photoSearchNote)+'</strong> <button class="btn secondary" onclick="editPhotoDescription()">Correct description</button></p><p>Reference photo will travel with this item.</p><img src="'+acquisitionPhoto+'" alt="Acquisition reference photo" style="max-height:120px;max-width:100%"><button class="btn secondary" onclick="removeAcquisitionPhoto()">Remove photo</button>':'';}
window.removeAcquisitionPhoto=()=>{acquisitionPhoto=null;renderAcquisitionPhoto();renderPriceHeader(window.buyCheckSession?.lockedIdentity,window.buyCheckSession?.evidence);};
function buyingSnapshotHtml(i){const e=i.buyingEstimate;if(!e)return '';return '<div class="card"><h3>Buying decision at acquisition</h3><p>'+(e.ready?'Estimated sale '+money(e.price)+' · estimated costs '+money(e.total)+' · estimated profit '+(e.profit===null?'unknown':money(e.profit)):'Costs or selling estimate were incomplete when acquired.')+'</p><small>Historical estimate, not actual sale profit.</small></div>';}

function defaultGameBox(prefix,identity){const box=$('#'+prefix+'Box');if(identity?.type==='software'&&box&&!box.dataset.userSet){box.checked=true;box.dataset.userSet='default';}}
window.scanBarcode=()=>{if(demoMode)return alert('Return to your saved workspace for live barcode search.');$('#photoIdentifyPanel')?.remove();photoGeneration++;const target=$('#identityCaptureTools')||modal;RetroCapture.scan(target,code=>{
 const identityQuery=$('#existingIdentityQuery');
 if(identityQuery){clearExistingIdentitySelection(true);identityQuery.value=code;searchExistingIdentity();return;}
 const quick=!!$('#qBarcode');$(quick?'#qBarcode':'#bcBarcode').value=code;$(quick?'#qDesc':'#bcDesc').value='';acquisitionPhoto=null;photoSearchNote='';if(quick){$('#qTitle').value='';window.quickCaptureLookupState={requestId:0};findCandidates();}else autoMarketSearch();});};
let photoSearchNote='';
const sourcingScans=[];
let sourcingScanRunning=false;
function renderSourcingQueue(){
 const box=$('#bcSourcingQueue');
 if(!box||window.buyCheckSession?.item)return;
 box.innerHTML=sourcingScans.length?`<details class="card" open><summary>Scan queue · ${sourcingScans.length}</summary>${sourcingScans.map((scan,index)=>`
  <div class="row"><div><strong>${escapeText(scan.query||'Photo '+(index+1))}</strong><p>${escapeText(scan.status)}${scan.error?' · '+escapeText(scan.error):''}</p></div>
  ${scan.image&&['Ready','Review match','Needs retry'].includes(scan.status)?`<button class="btn secondary" onclick="openSourcingScan(${index})">Open scan</button>`:''}
  ${scan.image&&scan.status==='Needs retry'?`<button class="btn secondary" onclick="retrySourcingScan(${index})">Retry</button>`:''}
  <button class="btn secondary" onclick="removeSourcingScan(${index})">Remove</button></div>`).join('')}</details>`:'';
}
window.queueSourcingPhoto=file=>{
 if(!file||demoMode)return;
 if(sourcingScans.length>=8){$('#autoSearchStatus').textContent='Scan queue full. Open or remove a scan first.';return;}
 sourcingScans.push({file,status:'Queued'});renderSourcingQueue();processSourcingScans();
};
window.openSourcingScan=index=>{
 const scan=sourcingScans[index];
 if(!scan?.image||!['Ready','Review match','Needs retry'].includes(scan.status))return;
 if($('#bcAsk')?.value.trim()||$('#bcOverride')?.value.trim()){
  if(!confirm('Open the queued scan and discard the unsaved price or cost on this screen?'))return;
 }
 sourcingScans.splice(index,1);buyCheck(null,scan);
};
window.removeSourcingScan=index=>{sourcingScans.splice(index,1);renderSourcingQueue();};
window.retrySourcingScan=index=>{
 const scan=sourcingScans[index];
 if(scan?.status==='Needs retry'){scan.status='Queued';scan.error='';renderSourcingQueue();processSourcingScans();}
};
async function processSourcingScans(){
 if(sourcingScanRunning)return;
 sourcingScanRunning=true;
 try{
  let scan;
  while((scan=sourcingScans.find(row=>row.status==='Queued'))){
   scan.status='Checking photo';renderSourcingQueue();
   try{
    scan.image=scan.image||await RetroCapture.photo(scan.file);
    delete scan.file;
    if(!sourcingScans.includes(scan))continue;
    const suggestion=scan.suggestion||await loadPhotoSuggestion(scan.image);
    if(!sourcingScans.includes(scan))continue;
    scan.suggestion=suggestion;
    scan.query=[suggestion.title,suggestion.platform].filter(Boolean).join(' ');
    if(suggestion.confidence==='high'&&suggestion.title.trim()){
     scan.status='Checking prices';renderSourcingQueue();
     scan.result=await loadPriceLookup(new URLSearchParams({q:scan.query,cexGrade:'Unboxed'}));
     scan.status='Ready';
    }else scan.status='Review match';
   }catch(error){scan.status='Needs retry';scan.error=error.message;}
   renderSourcingQueue();
  }
 }finally{sourcingScanRunning=false;}
}
async function loadPhotoSuggestion(image){
 const r=await fetch('/api/identify-photo',{method:'POST',headers:{'Content-Type':'application/json','X-RetroHQ-Action':'identify-photo'},body:JSON.stringify({image})});
 const data=await r.json();
 if(!r.ok||!data.ok||!data.suggestion)throw Error(data.status||'Photo identification failed.');
 return data.suggestion;
}
window.editPhotoDescription=()=>{const tools=$('#bcSearchTools'),el=$('#qDesc')||$('#bcDesc');if(tools)tools.open=true;el?.focus();el?.select();};
let selectedPhoto=null,photoBusy=false,photoGeneration=0;
window.photoIdentify=()=>{
 RetroCapture.stop();
 if(demoMode)return alert('Photo identification uses a live service. Return to your saved workspace first.');
 if(photoBusy)return;
 selectedPhoto=null;photoGeneration++;photoBusy=false;
 $('#photoIdentifyPanel')?.remove();const panel=document.createElement('section');panel.id='photoIdentifyPanel';panel.className='card';
 panel.innerHTML='<h3>Photo search</h3><p id="photoSetup" class="muted">Take or choose one item photo. Identification starts automatically.</p><input id="identifyPhotoFile" hidden type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onchange="prepareIdentifyPhoto(this.files[0])"><button id="choosePhotoButton" class="btn secondary" onclick="document.querySelector(\'#identifyPhotoFile\').click()">Take / choose another photo</button><img id="identifyPreview" alt="Selected item photo" hidden style="max-width:100%;max-height:220px"><small class="muted">Your chosen photo is sent to OpenAI automatically. API charges apply. A compressed reference photo is kept locally if you save the item.</small><button id="identifyPhotoButton" hidden class="btn secondary" onclick="identifySelectedPhoto()">Retry photo search</button><div id="photoResult" role="status" aria-live="polite"></div>';

 const identityTools=$('#identityCaptureTools');
 if(identityTools)panel.querySelector('small.muted').textContent='Your chosen photo is sent to OpenAI for identification. API charges apply.';
 (identityTools||modal).prepend(panel);panel.querySelector('#identifyPhotoFile').click();fetch('/api/photo-status').then(r=>r.json()).then(d=>{if(panel.isConnected)panel.querySelector('#photoSetup').textContent=d.configured?'Photo service configured.':'Setup needed: add OPENAI_API_KEY to Codespaces secrets, then restart the server.';}).catch(()=>{if(panel.isConnected)panel.querySelector('#photoSetup').textContent='Photo service status unavailable.';});
};
window.prepareIdentifyPhoto=async file=>{
 const panel=$('#photoIdentifyPanel'),generation=++photoGeneration;selectedPhoto=null;
 if(!panel||!file||photoBusy)return;panel.querySelector('#identifyPhotoButton').hidden=true;const result=panel.querySelector('#photoResult');result.textContent='Preparing photo…';
 try{
  const image=await RetroCapture.photo(file);
  if(generation!==photoGeneration||!panel.isConnected)return;
  selectedPhoto=image;const preview=panel.querySelector('#identifyPreview');preview.src=image;preview.hidden=false;result.textContent='Photo ready. Starting search…';await identifySelectedPhoto();
 }catch(error){if(generation===photoGeneration&&panel.isConnected)result.textContent=error.message;}
};
window.identifySelectedPhoto=async()=>{
 const panel=$('#photoIdentifyPanel'),generation=photoGeneration;if(!panel||photoBusy)return;
 const result=panel.querySelector('#photoResult');
 if(!selectedPhoto){result.textContent='Take or choose a photo first.';return;}
 photoBusy=true;panel.querySelector('#choosePhotoButton').disabled=true;panel.querySelector('#identifyPhotoButton').hidden=true;panel.querySelector('#identifyPhotoButton').disabled=true;result.textContent='Identifying the item…';
 try{const v=await loadPhotoSuggestion(selectedPhoto);
  if(!panel.isConnected||generation!==photoGeneration)return;
  result.innerHTML='<h4>Suggested identity — please check</h4><p>'+escapeText(v.visible_details)+'</p><p>'+escapeText(v.uncertainty)+'</p><p>Confidence: '+escapeText(v.confidence)+'</p><label>Item description<input id="photoSuggestion" class="input"></label><button class="btn primary" onclick="usePhotoSuggestion()">Use this description and find matches</button>';
  panel.querySelector('#photoSuggestion').value=[v.title,v.platform].filter(Boolean).join(' ');
  if(v.confidence==='high'&&v.title.trim()){photoSearchNote=[v.title,v.platform].filter(Boolean).join(' ');usePhotoSuggestion();}
 }catch(error){if(panel.isConnected&&generation===photoGeneration){result.textContent=error.message;panel.querySelector('#identifyPhotoButton').hidden=false;}}
 finally{photoBusy=false;if(panel.isConnected){panel.querySelector('#identifyPhotoButton').disabled=false;panel.querySelector('#choosePhotoButton').disabled=false;}}
};
window.usePhotoSuggestion=()=>{
 const title=$('#photoSuggestion')?.value.trim();if(!title)return alert('Enter an item description or try a clearer photo.');
 const identityQuery=$('#existingIdentityQuery');
 if(identityQuery){
  clearExistingIdentitySelection(true);identityQuery.value=title;
  selectedPhoto=null;photoGeneration++;$('#photoIdentifyPanel').remove();searchExistingIdentity();return;
 }
 acquisitionPhoto=selectedPhoto;photoSearchNote=title;
 const quick=!!$('#qDesc'),desc=$(quick?'#qDesc':'#bcDesc');if(!desc)return;
 desc.value=title;$(quick?'#qBarcode':'#bcBarcode').value='';
 if(quick){$('#qTitle').value=title;$('#qMarket').value='';window.quickBuySeed={};window.quickCaptureLookupState={requestId:0};}else{buyLookupChanged();}
 selectedPhoto=null;photoGeneration++;$('#photoIdentifyPanel').remove();renderAcquisitionPhoto();if(quick)findCandidates();else{$('#bcSearchTools').open=false;autoMarketSearch();}
};
window.parseDescription=()=>{const d=($('#qDesc')?.value||'').toLowerCase();if(d.includes('pal')||d.includes(' uk'))$('#qRegion').value='UK / PAL';};
// Quick Capture uses the same real UK market connector as Buy Check.
// Never erase the purchase amount, condition or stockroom location during lookup.
const quickSafeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const quickJsArg=v=>quickSafeHtml(JSON.stringify(String(v??'')));
const quickCaptureGrade=()=>$('#qCond')?.value==='Poor'?'Discounted':$('#qBox')?.checked?'Boxed':'Unboxed';
window.quickCaptureSelectPC=id=>{window.quickCaptureLookupState.pcId=id;window.quickCaptureLookupState.cexId=null;findCandidates();};
window.quickCaptureSelectCeX=(id,grade)=>{window.quickCaptureLookupState.cexId=id;window.quickCaptureLookupState.cexGrade=grade;findCandidates();};
window.quickCaptureRefine=q=>{$('#qDesc').value=q;window.quickCaptureLookupState.pcId=null;window.quickCaptureLookupState.cexId=null;findCandidates();};
window.quickCaptureGradeChanged=()=>{updateQuickIntel();const lookup=window.quickCaptureLookupState;if(lookup?.searched){lookup.cexId=null;lookup.cexGrade=null;findCandidates();}};
window.findCandidates=async()=>{
 const d=$('#qDesc')?.value.trim()||'',b=$('#qBarcode')?.value.trim()||'',query=d||b;
 if(!query)return alert('Enter a description or barcode first.');
 const lookup=window.quickCaptureLookupState||(window.quickCaptureLookupState={requestId:0});
 const key=d+'|'+b;
 if(lookup.query!==null&&lookup.query!==key){lookup.pcId=null;lookup.cexId=null;lookup.cexGrade=null;if(lookup.autoValueApplied&&$('#qMarket'))$('#qMarket').value='';lookup.autoValueApplied=false;window.quickBuySeed=window.quickBuySeed||{};window.quickBuySeed.identity=null;window.quickBuySeed.valuation=null;}
 lookup.query=key;lookup.searched=true;
 const requestId=(lookup.requestId||0)+1;lookup.requestId=requestId;
 const box=$('#candidateBox'),status=$('#identifyStatus');
 status.textContent='Searching PriceCharting, CeX UK and eBay market evidence…';
 box.innerHTML='<p class="muted">Searching live providers…</p>';
 const p=new URLSearchParams({q:query,barcode:b,cexGrade:lookup.cexGrade||quickCaptureGrade()});
 if(lookup.pcId)p.set('id',lookup.pcId);
 if(lookup.cexId)p.set('cexId',lookup.cexId);
 try{
  const data=await loadPriceLookup(p);
  if(requestId!==lookup.requestId||!$('#candidateBox'))return;
  if(data.needsRefinement){
   status.textContent='Choose the correct console generation';
   box.innerHTML='<div class="candidate-list">'+(data.refinements||[]).map(x=>'<button class="candidate-card" onclick="quickCaptureRefine('+quickJsArg(x.query)+')"><strong>'+quickSafeHtml(x.label)+'</strong></button>').join('')+'</div>';
   return;
  }
  if(data.needsConfirmation){
   status.classList.add('action-required');status.textContent=photoSearchNote?'Photo identified — confirm the exact catalogue edition below':'Choose the exact PriceCharting item';
   box.innerHTML='<div class="candidate-list">'+(data.candidates||[]).slice(0,6).map(x=>'<button class="candidate-card" onclick="quickCaptureSelectPC('+quickJsArg(x.id)+')"><strong>'+quickSafeHtml(x['product-name'])+'</strong><small>'+quickSafeHtml(x['console-name'])+'</small></button>').join('')+'</div>';
   return;
  }
  const ev=data.evidence||[],cex=ev.find(x=>x.provider==='CeX UK');
  defaultGameBox('q',data.lockedIdentity||data.provisionalIdentity);inferAcquisitionCategory('q',data.lockedIdentity||data.provisionalIdentity);if(data.lockedIdentity?.confirmedProduct){const title=$('#qTitle');if(title&&(!title.value.trim()||title.value===d||title.value===b||title.value===lookup.lastAutoTitle)){title.value=data.lockedIdentity.confirmedProduct;lookup.lastAutoTitle=title.value;}window.quickBuySeed=window.quickBuySeed||{};window.quickBuySeed.identity=data.lockedIdentity;}
  const summary=ev.map(x=>'<div class="evidence-row"><strong>'+quickSafeHtml(x.provider)+' — '+quickSafeHtml(x.status)+'</strong><small>'+quickSafeHtml(x.detail||'')+'</small>'+(x.provider==='CeX UK'&&x.status==='Live'?'<div class="cex-price-grid"><span><small>Retail</small><b>'+(x.retail!=null?money(x.retail):'Unavailable')+'</b></span><span><small>Cash trade-in</small><b>'+cexTradeText(x.cash,x.cashSource)+'</b></span><span><small>Voucher trade-in</small><b>'+cexTradeText(x.voucher,x.voucherSource)+'</b></span></div><small>'+quickSafeHtml([cexTradeHint(x.cashSource),cexTradeHint(x.voucherSource)].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' · '))+'</small>':'')+'</div>').join('');
  let actions='';
  if(cex?.variants?.length){
   actions='<p class="muted">Choose the exact CeX variant:</p><div class="candidate-list">'+cex.variants.map(x=>'<button class="candidate-card" onclick="quickCaptureSelectCeX('+quickJsArg(x.productId)+','+quickJsArg(x.grade)+')"><strong>'+quickSafeHtml(x.product)+'</strong><small>Retail '+(x.retail!=null?money(x.retail):'—')+' · Cash '+cexTradeText(x.cash,x.cashSource)+' · Voucher '+cexTradeText(x.voucher,x.voucherSource)+' · '+quickSafeHtml(x.grade)+'</small></button>').join('')+'</div>';
  }else if(cex?.status==='Live'&&cex.productId&&data.marketValue==null){
   actions='<button class="btn primary" onclick="quickCaptureSelectCeX('+quickJsArg(cex.productId)+','+quickJsArg(cex.grade||quickCaptureGrade())+')">Confirm this exact CeX match — '+quickSafeHtml(cex.product)+'</button>';
  }
  box.innerHTML='<div class="evidence-panel">'+summary+actions+'</div>';
  if(data.marketValue!=null&&Number(data.marketValue)>0){
   const title=$('#qTitle'),current=title?.value.trim()||'';
   if(title&&(!current||current===d||current===lookup.lastAutoTitle))title.value=data.lockedIdentity?.confirmedProduct||cex?.product||d;
   lookup.lastAutoTitle=title?.value||'';
   const market=$('#qMarket');
   if(market&&(lookup.autoValueApplied||!market.value.trim())){market.value=Number(data.marketValue).toFixed(2);lookup.autoValueApplied=true;}
   window.quickBuySeed=window.quickBuySeed||{};
   window.quickBuySeed.marketIsConditionSpecific=true;window.quickBuySeed.evidence=data.evidence||[];window.quickBuySeed.cexGrade=cex?.grade||null;
   window.quickBuySeed.identity=data.lockedIdentity||null;
   const platform=data.lockedIdentity?.platform||'';

   if($('#qMan')){if(/^PlayStation/.test(platform))$('#qMan').value='Sony';else if(/^Xbox/.test(platform))$('#qMan').value='Microsoft';else if(/Game Boy|Nintendo/.test(platform))$('#qMan').value='Nintendo';}
   status.textContent='✓ UK CeX retail benchmark loaded'+(data.lockedIdentity?.source==='cex-confirmed'?' — CeX record confirmed':'');
  }else{
   if(lookup.autoValueApplied&&$('#qMarket')){$('#qMarket').value='';lookup.autoValueApplied=false;}
   status.textContent=cex?.status==='Live'?'CeX match found — confirmation needed':'No confident UK price yet — see provider results below';
  }
  updateQuickIntel();
 }catch(error){
  if(requestId!==lookup.requestId)return;
  status.textContent=error.message||'Live market lookup unavailable';
  box.innerHTML='<div class="provider-warning">'+quickSafeHtml(error.message)+'</div>';
 }
};
window.updateQuickIntel=()=>renderBuyingDecision('q');
window.saveQuickBuy=(next=false)=>{const title=($('#qTitle').value||$('#qDesc').value).trim(),buy=Number($('#qBuy').value||0),marketRaw=$('#qMarket').value,market=marketRaw===''?null:Number(marketRaw);if(!title)return alert('Enter at least a description/title.');if(!$('#qBuy').value.trim()||!Number.isFinite(buy)||buy<0||market!==null&&(!Number.isFinite(market)||market<0))return alert('Enter the amount paid (zero if free) and a valid value, or leave the value blank.');const area=$('#qArea').value.trim(),shelf=$('#qShelf').value.trim(),seed=window.quickBuySeed||{},accessories={box:$('#qBox')?.checked||false,controller:$('#qController')?.checked||false,cables:$('#qCables')?.checked||false},valuation=seed.valuation?JSON.parse(JSON.stringify(seed.valuation)):null;if(valuation){valuation.finalValue=market;valuation.acquisitionValue=market;valuation.recommendedMax=Math.round((Number(market)||0)*(state.settings.offerPct/100)*100)/100;valuation.profile=valuation.profile||completenessProfile(seed.identity);}state.items.push({id:Date.now(),title,manufacturer:$('#qMan').value,category:$('#qCat').value,source:seed.valuation?'Buy Check':'Quick Capture',buy,baseMarket:market,marketIsConditionSpecific:true,valuation,needsIdentification:!seed.identity,needsValuation:market===null,status:'Acquired',condition:$('#qCond').value,acquiredCondition:$('#qCond').value,accessories,cexGrade:seed.cexGrade||null,identity:seed.identity||null,region:$('#qRegion').value,barcode:$('#qBarcode').value.trim(),searchDescription:$('#qDesc').value.trim(),area,shelf,location:[area,shelf].filter(Boolean).join(' / ')||'Unassigned',velocity:70,acquiredDate:today(),notes:market===null?'Needs valuation':'',photoData:acquisitionPhoto,photos:acquisitionPhoto?1:0,buyingEstimate:buyingEstimate('q'),marketEvidence:seed.evidence||seed.valuation?.evidence||[],processingCosts:0,listing:null,sale:null,timeline:[['Acquired',market===null?'Quick captured · valuation required.':`Acquired at ${money(buy)} against RetroHQ value ${money(market)}.`],...(valuation?[['Valuation',`${valuation.benchmarkLabel||'UK benchmark'} ${money(valuation.benchmark)} → RetroHQ ${money(valuation.finalValue)}.`]]:[])]});if(!persistState()){state.items.pop();backdrop.classList.add('hidden');return;}if(next){quickBuy();}else{closeModal();go('inventory');}};
window.tradeIn=()=>bundleModal('Trade in',true);
window.bundleModal=(type,credit)=>{open(`<h2>${type}</h2>${credit?`<div class="formgrid"><div class="field"><label>Trade account</label><select id="tradeCustomer" class="select"><option value="">Walk-in / none</option>${state.customers.map(c=>`<option value="${c.id}">${escapeText(c.name)} · ${money(c.credit)} credit</option>`).join('')}</select></div><div class="field"><label>Payment method</label><select id="offerType" class="select" onchange="toggleMixed()"><option>Cash</option><option>Store Credit</option><option>Mixed</option></select></div><div class="field mixed hidden"><label>Cash part</label><input id="mixedCash" class="input" type="number"></div><div class="field mixed hidden"><label>Store-credit part</label><input id="mixedCredit" class="input" type="number"></div></div><p>Enter the agreed amount for each item. Store Credit adds the configured bonus. For Mixed, the cash and credit parts must add up to the item amounts.</p>`:''}<div id="bundleRows">${bundleRow()}</div><p id="bundleError" role="alert"></p><div class="modal-actions"><button class="btn secondary" onclick="addBundleRow()">+ Add item</button><button class="btn primary" onclick="saveBundle('${type}',${credit})">Complete</button></div>`);updateBundleIntel();};
function bundleRow(){return `<div class="bundle-row"><input class="input bt" placeholder="Item title"><select class="select bman">${manufacturers.map(x=>`<option>${x}</option>`).join('')}</select><select class="select bcond" onchange="updateBundleIntel()">${Object.keys(factors).map(x=>`<option>${x}</option>`).join('')}</select><input class="input bm" type="number" placeholder="Excellent value" oninput="updateBundleIntel()"><input class="input bo" type="number" placeholder="Amount paid" oninput="updateBundleIntel()"><div class="bundle-intel"></div></div>`;}
window.addBundleRow=()=>{$('#bundleRows').insertAdjacentHTML('beforeend',bundleRow());updateBundleIntel();};window.toggleMixed=()=>$$('.mixed').forEach(x=>x.classList.toggle('hidden',$('#offerType').value!=='Mixed'));window.updateBundleIntel=()=>$$('.bundle-row').forEach(r=>{const x=acquisitionIntel(Number(r.querySelector('.bm').value),r.querySelector('.bcond').value,Number(r.querySelector('.bo').value));r.querySelector('.bundle-intel').innerHTML=`<small>Condition ${money(x.conditionValue)}</small><strong>Offer ${money(x.recommended)} · Margin ${x.margin.toFixed(0)}% · HQ ${x.hq}</strong>`;});
window.saveBundle=(type,credit)=>{if(credit){saveTradeIn(type);return;}const batchId=crypto.randomUUID(),batchName=type+' '+today();$$('.bundle-row').forEach((r,n)=>{const title=r.querySelector('.bt').value;if(!title)return;const cond=r.querySelector('.bcond').value,base=Number(r.querySelector('.bm').value),x=acquisitionIntel(base,cond,Number(r.querySelector('.bo').value)),cash=Number(r.querySelector('.bo').value)||x.recommended;const buy=cash;state.items.push({id:Date.now()+n,title,manufacturer:r.querySelector('.bman').value,category:'Video Game',source:type,batchId,batchName,acquiredDate:today(),buy,baseMarket:base||buy*2,condition:cond,acquiredCondition:cond,status:'Needs cleaning',location:'Unassigned',velocity:75,notes:'',photos:0,processingCosts:0,listing:null,sale:null,timeline:[['Acquired',`${type}; Cash.`]]});});closeModal();go('inventory');};
function tradePence(raw,label){
 const text=String(raw??'').trim();
 const value=Number(text);
 if(!/^\d+(?:\.\d{1,2})?$/.test(text)||!Number.isFinite(value)||value>1000000)throw Error('Enter a valid '+label+' in pounds and pence.');
 return Math.round(value*100);
}
function saveTradeIn(type){
 const error=$('#bundleError');
 try{
  const kind=$('#offerType').value, accountId=Number($('#tradeCustomer').value);
  const customer=state.customers.find(c=>c.id===accountId);
  if(kind!=='Cash'&&!customer)throw Error('Choose a trade account for store credit.');
  const rows=$$('.bundle-row').map(row=>({
   title:tradeText(row.querySelector('.bt').value,180),
   manufacturer:row.querySelector('.bman').value,condition:row.querySelector('.bcond').value,
   market:row.querySelector('.bm').value,paid:row.querySelector('.bo').value
  })).filter(row=>row.title||row.market||row.paid);
  if(!rows.length||rows.some(row=>!row.title))throw Error('Enter a title for each trade-in item.');
  const paid=rows.map(row=>tradePence(row.paid,'agreed item amount'));
  if(kind==='Store Credit'){
   const multiplier=1+Number(state.settings.storeCreditBonus)/100;
   if(!Number.isFinite(multiplier)||multiplier<1)throw Error('Check the store credit bonus in Settings.');
   paid.forEach((amount,index)=>{paid[index]=Math.round(amount*multiplier);});
  }
  const total=paid.reduce((sum,amount)=>sum+amount,0);
  let credit=kind==='Store Credit'?total:0;
  if(kind==='Mixed'){
   credit=tradePence($('#mixedCredit').value,'store-credit part');
   const cash=tradePence($('#mixedCash').value,'cash part');
   if(cash+credit!==total)throw Error('Cash and store credit must add up to the agreed item amounts.');
  }
  const batchId=crypto.randomUUID(),date=today(),firstId=state.items.reduce((id,item)=>Math.max(id,item.id+1),Date.now());
  const items=rows.map((row,index)=>({
   id:firstId+index,title:row.title,manufacturer:row.manufacturer,category:'Uncategorised',
   source:type,batchId,batchName:type+' '+date,acquiredDate:date,buy:paid[index]/100,tradeCustomerId:customer?.id??null,
   baseMarket:row.market?tradePence(row.market,'optional market value')/100:null,
   needsValuation:!row.market,needsIdentification:true,condition:row.condition,acquiredCondition:row.condition,
   status:'Acquired',location:'Unassigned',velocity:75,notes:'',photos:0,processingCosts:0,listing:null,sale:null,
   timeline:[['Acquired',type+' · '+kind+' · batch '+batchId]]
  }));
  const before={items:state.items,customers:state.customers,creditIssued:state.creditIssued};
  state.items=[...state.items,...items];
  if(credit){
   state.customers=state.customers.map(c=>c!==customer?c:{...c,credit:(Math.round(c.credit*100)+credit)/100,
    ledger:[...c.ledger,[date,kind+' trade-in credit · batch '+batchId,credit/100]]});
   state.creditIssued=(Math.round(state.creditIssued*100)+credit)/100;
  }
  if(!persistState()){Object.assign(state,before);throw Error('Trade-in could not be saved.');}
  closeModal();go('inventory');
 }catch(errorMessage){error.textContent=errorMessage.message;}
}
let managerSession=null;
function managerActive(){return !demoMode&&managerSession&&Date.now()<managerSession.expires;}
function managerControl(){
 if(demoMode)return '';
 return managerActive()?'<button class="btn secondary" onclick="managerSignOut()">Manager sign out</button>'
  :'<button class="btn secondary" onclick="managerLogin()">Manager sign in</button>';
}
async function managerRequest(payload){
 const response=await fetch('/api/trade-manager',{method:'POST',headers:{'Content-Type':'application/json','X-RetroHQ-Action':'trade-manager'},body:JSON.stringify(payload)});
 const result=await response.json();
 if(!response.ok||!result.ok)throw Error(result.status||'Manager access is unavailable.');
 return result;
}
window.managerLogin=(id=null)=>{
 if(demoMode)return;
 open('<h2>Manager sign in</h2><form id="managerForm"><label>Manager password<input id="managerPassword" class="input" type="password" autocomplete="current-password" required></label><p id="managerError" role="alert"></p><div class="modal-actions"><button type="button" class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn primary" type="submit">Sign in</button></div></form>');
 const form=$('#managerForm');
 form.onsubmit=async event=>{
  event.preventDefault();
  const button=form.querySelector('button[type=submit]');
  if(button.disabled)return;
  button.disabled=true;
  const input=$('#managerPassword'),password=input.value;
  input.value='';
  try{
   const data=await managerRequest({action:'login',password});
   if(!form.isConnected){managerRequest({action:'logout',token:data.token}).catch(()=>{});return;}
   managerSession={token:data.token,expires:Date.now()+data.expiresIn*1000};
   closeModal();render();
   if(id!==null)editTradeAccount(id);
  }catch(error){if(form.isConnected)$('#managerError').textContent=error.message;}
  finally{button.disabled=false;}
 };
};
window.managerSignOut=()=>{
 const session=managerSession;
 managerSession=null;
 if(session)managerRequest({action:'logout',token:session.token}).catch(()=>{});
 render();
};
window.removedStock=()=>{
 if(!managerActive()){managerLogin();return;}
 const rows=state.items.filter(item=>item.stockRemoval).sort((a,b)=>b.stockRemoval.date.localeCompare(a.stockRemoval.date));
 open('<h2>Removed stock</h2><p>Restore a physical item to the inventory when it is available again.</p>'
  +(rows.length?rows.map(item=>`<div class="row"><div><strong>${escapeText(item.title)}</strong><small class="table-note">Stock #${item.id} · ${escapeText(item.stockRemoval.date.slice(0,10))} · ${escapeText(item.stockRemoval.reason)}</small></div><button class="btn secondary" onclick="stockRemovalDialog(${item.id},false)">Restore</button></div>`).join(''):'<p>No removed items.</p>')
  +'<div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Close</button></div>');
};
window.stockRemovalDialog=(id,remove)=>{
 if(!managerActive()){managerLogin();return;}
 const item=state.items.find(i=>i.id===id);
 if(!item||(remove?!RetroCheckout.available(item):!item.stockRemoval))return;
 const title=remove?'Remove from stock':'Restore to stock';
 const effect=remove?'This removes this physical copy from Inventory and checkout. You can restore it from Removed stock.':'This makes the item available in RetroHQ again.';
 const ebay=item.liveListingId?(remove?' The eBay listing stays live. RetroHQ pauses new imports for this listing variation while the item is removed.':' Restoring the item re-enables normal listing imports if no other copies remain removed.'):'';
 open(`<h2>${title}</h2><p><strong>${escapeText(item.title)}</strong> · Stock #${id}</p><p>${effect}${ebay}</p>
 <form id="stockRemovalForm"><label>Reason<input name="reason" class="input" maxlength="240" required></label><p id="stockRemovalError" role="alert"></p>
 <div class="modal-actions"><button class="btn secondary" type="button" onclick="${remove?'closeModal()':'removedStock()'}">Cancel</button><button class="btn primary" type="submit">${title}</button></div></form>`);
 const form=$('#stockRemovalForm');
 form.onsubmit=async event=>{
  event.preventDefault();
  const button=form.querySelector('button[type=submit]');
  if(button.disabled)return;
  button.disabled=true;
  try{
   if(!managerActive())throw Error('Manager session expired. Sign in again from Inventory.');
   const session=managerSession;
   const reason=new FormData(form).get('reason');
   const next=RetroItems.changeStockRemoval(item,remove,reason,new Date().toISOString());
   await managerRequest({action:'authorise',token:session.token});
   if(!form.isConnected||session!==managerSession)return;
   const index=state.items.indexOf(item);
   if(index<0)throw Error('Stock changed. Reopen this item before trying again.');
   state.items[index]=next;
   if(!persistState()){state.items[index]=item;throw Error('The change could not be saved.');}
   closeModal();go('inventory');
   if(!remove)removedStock();
  }catch(error){if(form.isConnected)$('#stockRemovalError').textContent=error.message;}
  finally{button.disabled=false;}
 };
};
function tradeText(value,max){
 const text=String(value??'').trim();
 if(text.length>max||/[<>"`\x00-\x1f]/.test(text)||/^javascript:/i.test(text))throw Error('Use plain text within the field limit.');
 return text;
}
const customerFields=[
 ['name','Full name','text','name',120],['email','Email address','email','email',160],['phone','Phone number','tel','tel',40],
 ['addressLine1','Address line 1','text','address-line1',160],['addressLine2','Address line 2','text','address-line2',160],
 ['town','Town / city','text','address-level2',100],['county','County / region','text','address-level1',100],
 ['postcode','Postcode','text','postal-code',24],['country','Country','text','country-name',100]
];
function customerInputs(account={}){
 return customerFields.map(([key,label,type,autocomplete,max])=>`<label>${label}<input name="${key}" class="input" type="${type}" autocomplete="${autocomplete}" maxlength="${max}" ${key==='name'?'required':''} value="${escapeText(account[key]||'')}"></label>`).join('');
}
function readCustomerDetails(fields){
 return Object.fromEntries(customerFields.map(([key,,,,max])=>[key,tradeText(fields.get(key),max)]));
}
function customerEntry(){
 return `<section class="card"><h2>New customer account</h2><p>Enter a name and any contact or address details you have.</p>
 <form id="customerEntryForm" onsubmit="saveNewCustomer(event)"><div class="formgrid">${customerInputs()}</div>
 <p id="customerEntryError" role="alert"></p><div class="modal-actions"><button type="button" class="btn secondary" onclick="go('customers')">Cancel</button>
 <button class="btn primary" type="submit">Create account</button></div></form></section>`;
}
function customerDetail(){
 const account=state.customers.find(c=>c.id===state.activeCustomer);
 if(!account)return '<p>Customer account unavailable.</p>';
 const {purchases,returns,tradeIns}=RetroCheckout.customerPurchases(state,account.id);
 const address=[account.addressLine1,account.addressLine2,account.town,account.county,account.postcode,account.country].filter(Boolean);
 const describe=items=>items.map(escapeText).join(' + ');
 const date=value=>escapeText(String(value||'Date unknown').slice(0,10));
 return `<div class="toolbar"><button class="btn secondary" onclick="go('customers')">Back to Trade Accounts</button></div>
  <div class="hero"><div><h2>${escapeText(account.name)}</h2><p>Customer account</p></div><div class="hero-actions">
   <button class="btn primary" onclick="manualSale(null,${account.id})">Record sale for this customer</button>
   ${demoMode?'':'<button class="btn secondary" onclick="editTradeAccount('+account.id+')">Edit account / correct credit</button>'}</div></div>
  <div class="grid metrics">${metric('Available store credit',money(account.credit),'Current balance')}${metric('Purchases',purchases.length,'Linked transactions')}
   ${metric('Recorded purchase total',money(purchases.reduce((sum,row)=>sum+row.total,0)/100),'Before returns · all payment types')}</div>
  <section class="card"><h3>Contact details</h3><dl><dt>Address</dt><dd>${address.length?address.map(escapeText).join('<br>'):'Not recorded'}</dd>
   <dt>Email</dt><dd>${escapeText(account.email||'Not recorded')}</dd><dt>Phone</dt><dd>${escapeText(account.phone||'Not recorded')}</dd></dl></section>
  <section class="card"><h3>Purchase history</h3>${purchases.map(row=>`<div class="row"><div><strong>${describe(row.items)}</strong>
   <small class="table-note">${date(row.date)} · ${escapeText(row.channel||'Sale')}${row.returned?' · Returned':''}</small>
   <small class="table-note">Store credit used ${money(row.credit/100)} · Other payment ${money(row.paid/100)}</small></div><strong>${money(row.total/100)}</strong></div>`).join('')||'<p>No purchases linked yet.</p>'}</section>
  ${returns.length?`<section class="card"><h3>Returns</h3>${returns.map(row=>`<div class="row"><span>${date(row.date)} · ${escapeText(row.title)}</span><strong>${row.refund===null?'Refund to verify':'Refund '+money(row.refund/100)}</strong></div>`).join('')}</section>`:''}
  ${tradeIns.length?`<section class="card"><h3>Trade-ins</h3>${tradeIns.map(row=>`<div class="row"><div><strong>${describe(row.items)}</strong><small class="table-note">${date(row.date)}</small></div><strong>${money(row.total/100)} paid</strong></div>`).join('')}</section>`:''}
  <section class="card"><h3>Store-credit ledger</h3>${account.ledger.slice().reverse().map(row=>`<div class="row"><span>${date(row[0])} · ${escapeText(row[1])}</span><strong>${money(row[2])}</strong></div>`).join('')||'<p>No credit activity yet.</p>'}</section>`;
}
window.tradeAccount=id=>{
 if(!state.customers.some(c=>c.id===id))return;
 if(!backdrop.classList.contains('hidden'))closeModal();
 state.activeCustomer=id;go('customerDetail');
};
window.editTradeAccount=id=>{
 const account=state.customers.find(c=>c.id===id);
 if(!account||demoMode)return;
 if(!managerActive()){managerLogin(id);return;}
 open(`<h2>Edit trade account</h2><form id="tradeEditForm">
  <div class="formgrid">${customerInputs(account)}
  <label>Corrected credit balance (£)<input name="balance" class="input" type="number" min="0" step="0.01" value="${Number(account.credit).toFixed(2)}" required></label></div>
  <label>Reason for change<input name="reason" class="input" maxlength="240" required></label><p id="tradeEditError" role="alert"></p>
  <div class="modal-actions"><button type="button" class="btn secondary" onclick="tradeAccount(${id})">Cancel</button><button class="btn primary" type="submit">Save manager change</button></div></form>`);
 const form=$('#tradeEditForm');
 form.onsubmit=async event=>{
  event.preventDefault();
  const button=form.querySelector('button[type=submit]');
  if(button.disabled)return;
  button.disabled=true;
  try{
   if(!managerActive())throw Error('Manager session expired. Reopen the account to sign in again.');
   const session=managerSession, fields=new FormData(form);
   const details=readCustomerDetails(fields);
   const reason=tradeText(fields.get('reason'),240),balance=tradePence(fields.get('balance'),'corrected balance');
   if(!details.name||!reason)throw Error('Enter a name and a reason for the change.');
   const previous=Math.round(account.credit*100),delta=balance-previous;
   const changes=Object.keys(details).filter(key=>details[key]!==String(account[key]||''));
   if(!delta&&!changes.length)throw Error('Change the details or credit balance first.');
   await managerRequest({action:'authorise',token:session.token});
   if(!form.isConnected||session!==managerSession)return;
   if(state.customers.find(c=>c.id===id)!==account)throw Error('This account changed. Reopen it before saving.');
   const note=['Manager correction',delta?'balance '+money(previous/100)+' → '+money(balance/100):'',changes.length?'edited '+changes.join(', '):'',reason].filter(Boolean).join(' · ');
   const before=state.customers;
   state.customers=before.map(c=>c!==account?c:{...c,...details,credit:balance/100,ledger:[...c.ledger,[new Date().toISOString(),note,delta/100]]});
   if(!persistState()){state.customers=before;throw Error('The account change could not be saved.');}
   closeModal();render();tradeAccount(id);
  }catch(error){if(form.isConnected)$('#tradeEditError').textContent=error.message;}
  finally{button.disabled=false;}
 };
};
window.newCustomer=()=>go('customerNew');
window.saveNewCustomer=event=>{
 event.preventDefault();
 try{
  const details=readCustomerDetails(new FormData(event.currentTarget));
  if(!details.name)throw Error('Enter a customer name.');
  const id=state.customers.reduce((next,c)=>Math.max(next,c.id+1),Date.now());
  state.customers.push({id,...details,credit:0,ledger:[]});
  if(!persistState()){state.customers.pop();return;}
  tradeAccount(id);
 }catch(error){$('#customerEntryError').textContent=error.message;}
};
window.syncSaleFulfilment=i=>{if(!i.sale)return;if(i.status==='Sold')i.sale.status='Ready to dispatch';else if(['Packaged','Dispatched','Delivered'].includes(i.status))i.sale.status=i.status;else if(i.status==='Completed'&&['In Store EPOS','Manual / Cash'].includes(i.sale.channel))i.sale.status='Collected in store';};
function saleFulfilmentControls(i){const phases=['Sold','Packaged','Dispatched','Delivered','Completed'],next=phases[phases.indexOf(i.status)+1];return i.sale&&!i.sale.reviewNeeded&&phases.includes(i.status)&&i.status!=='Completed'?`<button class="btn primary" onclick="advanceFulfilment(${i.id})">Mark ${next.toLowerCase()}</button>`:'';}
window.advanceFulfilment=id=>{const i=state.items.find(i=>i.id===id),phases=['Sold','Packaged','Dispatched','Delivered','Completed'];if(!i?.sale||i.sale.reviewNeeded)return;const n=phases.indexOf(i.status);if(n<0||n>=phases.length-1)return;i.status=phases[n+1];i.sale.status=i.status;i.timeline.push(['Fulfilment',i.status+' recorded locally; no marketplace update sent.']);render();};
window.editItem=id=>{
 const i=state.items.find(x=>x.id===id);if(!i)return;
 open('<h2>Edit item details</h2><p>'+escapeText(i.title)+'</p><div class="formgrid"><label>Purchase price (£)<input id="editBuy" class="input" type="number" min="0" step="0.01"></label><label>Preparation costs (£)<input id="editPreparation" class="input" type="number" min="0" step="0.01" placeholder="Unknown"></label><label>Category<select id="editCategory" class="select"></select></label><label>eBay listed price<input id="editEbayPrice" class="input" readonly></label><label>HQ UK market value (£)<input id="editValue" class="input" type="number" min="0" step="0.01" placeholder="Unknown"></label><label>Area<input id="editArea" class="input"></label><label>Shelf / location<input id="editShelf" class="input"></label></div><label>Notes<textarea id="editItemNotes"></textarea></label><p class="muted">The eBay listed price comes from your saved listing. Enter an HQ value only when you have evidence for it. Leave unknown costs and values blank where applicable.</p><div id="editItemError" role="status"></div><div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn secondary" onclick="identifyExistingItem('+id+')">Correct product details</button><button class="btn primary" onclick="saveItemEdit('+id+')">Save details</button></div>');
 $('#editBuy').value=i.buy??'';$('#editPreparation').value=i.processingCosts??'';if(RetroItems.sold(i))$('#editValue').disabled=true;$('#editValue').value=independentMarketValue(i)??'';
 const options=new Set(['Video Game','Console','Toy','Accessory','Trading Card','Clothing','Collectible','Other','Uncategorised',i.category]);
 for(const category of options)if(category)$('#editCategory').add(new Option(category,category));
 $('#editCategory').value=i.category||'Uncategorised';$('#editEbayPrice').value=knownMoney(ebayListedPrice(i));$('#editValue').dataset.original=$('#editValue').value;$('#editArea').value=i.area||'';$('#editShelf').value=i.shelf||(!i.area?i.location||'':'');$('#editItemNotes').value=i.notes||'';
};
window.saveItemEdit=id=>{
 try{const n=state.items.findIndex(i=>i.id===id),previous=state.items[n];const next=RetroItems.edit(previous,{category:$('#editCategory').value,buy:$('#editBuy').value,processingCosts:$('#editPreparation').value,value:$('#editValue').value,valueChanged:$('#editValue').value!==$('#editValue').dataset.original,area:$('#editArea').value,shelf:$('#editShelf').value,notes:$('#editItemNotes').value,offerPct:state.settings.offerPct},new Date().toISOString());state.items[n]=next;if(!persistState()){state.items[n]=previous;backdrop.classList.add('hidden');return;}closeModal();render();}catch(e){$('#editItemError').textContent=e.message;}
};
window.checkItemMarket=id=>{
 const item=state.items.find(record=>record.id===id);
 if(item)buyCheck(item);
};
window.saveExistingValue=(checkNext=false)=>{
 const session=window.buyCheckSession,item=session?.item;
 const error=$('#acquireError');
 if(!item||!error)return;
 try{
  if($('#autoSearchBtn').disabled)throw Error('Wait for the current search to finish.');
  const index=state.items.indexOf(item);
  if(index<0||!RetroCheckout.available(item))throw Error('Stock changed. Reopen the item before saving.');
  const override=$('#bcOverride').value.trim(),raw=override||$('#bcMarket').value;
  const now=new Date().toISOString();
  if(raw===''||!Number.isFinite(Number(raw))||Number(raw)<0)throw Error('Check the exact item and UK benchmark, or enter a manual value.');
  const value=Math.round(Number(raw)*100)/100;
  const comparable=session.ebayComparable;
  const valuation={...(comparable?{}:session.valuation),finalValue:value,acquisitionValue:item.valuation?.acquisitionValue??null,timestamp:now,stale:false,staleReasons:[]};
  if(comparable)Object.assign(valuation,{source:'Selected eBay asking price',confidence:'selected-asking-price',
   benchmark:value,benchmarkLabel:'Selected eBay asking price',ebayComparable:comparable});
  else if(override)Object.assign(valuation,{source:'Manual inventory valuation',confidence:'manual'});
  if(override)valuation.recommendedMax=Math.round(value*state.settings.offerPct)/100;
  const cex=(session.evidence||[]).find(row=>row.provider==='CeX UK'&&row.status==='Live');
  const accessories={box:$('#bcBox').checked,controller:$('#bcController').checked,cables:$('#bcCables').checked};
  state.items[index]=RetroItems.saveValuation(item,{value,valuation,marketEvidence:session.evidence||[],condition:session.condition,accessories,
   cexProductId:cex?.productId??null,cexGrade:cex?.grade??null,cexProduct:cex?.product??null},now);
  if(!persistState()){state.items[index]=item;return;}
  const next=checkNext?nextImportedPriceCheck(item):null;
  closeModal();
  if(next){openItem(next.id);buyCheck(next);}else render();
 }catch(exception){error.textContent=exception.message;error.className='action-required';}
};
function processingControls(i){
 if(RetroItems.sold(i))return '<p>This item is sold. Manage fulfilment and returns in Sales.</p><button class="btn secondary" onclick="setTab(\'Sales\')">View sale</button>';
 if(i.status==='Listed')return '<p>Processing is finished. This item is listed; recording its sale will update stock automatically.</p>';
 const phase=RetroItems.stage(i);
 if(phase==='Ready to list')return '<h3>Preparation complete</h3><p>Record an existing listing, or record a sale when the customer has paid. Listing here only updates RetroHQ; it does not publish to a marketplace.</p><button class="btn primary" onclick="setTab(\'Listing\')">Continue to listing</button> <button class="btn secondary" onclick="previousStage('+i.id+')">Back to preparing</button>';
 return '<h3>Prepare stock</h3><p>Acquired → Preparing → Ready to list</p><p>Clean, test, repair, photograph and price as needed during Preparing.</p><button class="btn secondary" '+(phase==='Acquired'?'disabled':'')+' onclick="previousStage('+i.id+')">Back</button> <button class="btn primary" '+(phase==='Ready to list'?'disabled':'')+' onclick="nextStage('+i.id+')">'+(phase==='Acquired'?'Start preparing':phase==='Ready to list'?'Ready to list':'Mark ready to list')+'</button>';
}
function moveProcessing(id,direction){try{const n=state.items.findIndex(i=>i.id===id);if(n<0)return;state.items[n]=RetroItems.transition(state.items[n],direction);render();}catch(e){alert(e.message);}}
window.nextStage=id=>moveProcessing(id,1);
window.previousStage=id=>moveProcessing(id,-1);
window.markValuationStale=(i,reason)=>{i.needsValuation=true;if(i.valuation){i.valuation.stale=true;i.valuation.staleReasons=i.valuation.staleReasons||[];if(!i.valuation.staleReasons.includes(reason))i.valuation.staleReasons.push(reason);i.valuation.confidence='stale';}i.timeline.push(['Revaluation required',reason]);};
window.damageItem=id=>{const i=state.items.find(x=>x.id===id);i.status='Needs repair';markValuationStale(i,'Damage discovered; previous valuation retained as history but is no longer current.');i.timeline.push(['Needs repair','Damage discovered.']);render();};
window.customerReturn=id=>{const i=state.items.find(x=>x.id===id);if(i?.sale?.productionKey){go('production');return alert('Use the production order review to record a physical return.');}if(i?.sale?.externalKey){go('sales');return alert('Use Review / restore in the eBay queue after physically receiving all returned units.');}if(!i?.sale)return alert('This item has no current recorded sale to return.');open(`<h2>Customer return</h2><p class="muted">Keep the original sale history, capture why it came back, and return the physical item to the repair queue.</p><div class="formgrid"><div class="field"><label>Customer email</label><input id="returnEmail" class="input" type="email" placeholder="customer@example.com"></div><div class="field"><label>Return reason</label><select id="returnReason" class="select"><option>Faulty / not working</option><option>Damaged</option><option>Not as described</option><option>Changed mind</option><option>Wrong item</option><option>Other</option></select></div><div class="field"><label>Refund amount</label><input id="returnRefund" class="input" type="number" step="0.01" value="${Number(i.sale.price||0).toFixed(2)}"></div><div class="field full"><label>Notes</label><textarea id="returnNotes" rows="4" placeholder="Fault reported, condition on return, accessories missing, etc."></textarea></div></div><div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveCustomerReturn(${id})">Return to repair stock</button></div>`);};
window.saveCustomerReturn=id=>{const i=state.items.find(x=>x.id===id);if(!i?.sale)return;if(i.sale.productionKey)return alert('Use the production order review.');const original=JSON.parse(JSON.stringify(i.sale)),email=($('#returnEmail')?.value||'').trim(),reason=$('#returnReason')?.value||'Other',refund=Math.max(0,Number($('#returnRefund')?.value)||0),notes=($('#returnNotes')?.value||'').trim();i.returns=i.returns||[];i.returns.push({date:today(),email,reason,refund,notes,originalSale:original});i.saleHistory=i.saleHistory||[];i.saleHistory.push({...original,outcome:'Returned',returnDate:today(),refund});i.sale=null;i.listing=null;i.status='Needs repair';i.location='Repair Queue';markValuationStale(i,`Customer return: ${reason}. Inspect and revalue before resale.`);i.timeline.push(['Customer return',`${reason} · refund ${money(refund)}${email?' · '+email:''}`]);i.timeline.push(['Needs repair','Returned item placed back into stock for repair / inspection.']);closeModal();state.view='item';state.activeItem=id;state.activeTab='Processing';render();};
window.updateCondition=(id,c)=>{const i=state.items.find(x=>x.id===id),old=i.condition;if(old===c)return;i.condition=c;markValuationStale(i,`Condition changed ${old} → ${c}.`);i.timeline.push(['Condition changed',`${old} → ${c}`]);render();};
window.toggleAccessory=(id,key)=>{const i=state.items.find(x=>x.id===id);if(!i.accessories)return;i.accessories[key]=!i.accessories[key];const label=key[0].toUpperCase()+key.slice(1);if(i.accessories[key]&&i.valuation){i.valuation.adjustments=(i.valuation.adjustments||[]).filter(a=>a.type!==key);i.valuation.unresolved=(i.valuation.unresolved||[]).filter(x=>!x.toLowerCase().includes(key==='controller'?'controller':'cable'));const deduction=i.valuation.adjustments.reduce((a,x)=>a+Number(x.amount||0),0);i.valuation.finalValue=Math.max(0,Math.round((Number(i.valuation.benchmark||0)-deduction)*100)/100);i.valuation.acquisitionValue=i.valuation.acquisitionValue??i.valuation.finalValue;i.valuation.recommendedMax=Math.round(i.valuation.finalValue*(state.settings.offerPct/100)*100)/100;i.valuation.staleReasons=(i.valuation.staleReasons||[]).filter(r=>!r.toLowerCase().includes(key==='controller'?'controller':'cable'));i.valuation.stale=i.valuation.staleReasons.length>0;i.valuation.confidence=i.valuation.stale?'stale':i.valuation.unresolved.length?'partial':i.valuation.adjustments.length?'adjusted':'benchmark';i.needsValuation=i.valuation.stale||i.valuation.unresolved.length>0;}else if(!i.accessories[key]&&['controller','cables'].includes(key)){markValuationStale(i,`${label} removed; replacement adjustment must be refreshed.`);}i.timeline.push(['Completeness',`${label} ${i.accessories[key]?'added':'removed'}.`]);render();};
window.addProcessingCost=id=>{const i=state.items.find(x=>x.id===id),amount=Number(prompt('Processing cost to add (£)','0'));if(!Number.isFinite(amount)||amount<=0)return;const reason=prompt('What was the cost for?','Replacement / repair / cleaning')||'Processing cost';if(i.processingCosts===null)return alert('Record total preparation costs in Edit prices & details first; the imported total is unknown.');i.processingCosts=Number(i.processingCosts||0)+amount;i.timeline.push(['Processing cost',`${reason}: ${money(amount)}`]);render();};
window.addPhoto=id=>{const i=state.items.find(x=>x.id===id);i.photos++;i.timeline.push(['Photo added','Photo record added.']);render();};window.createListing=id=>{const i=state.items.find(x=>x.id===id);if(!i||!RetroCheckout.available(i))return;const raw=prompt('Record an existing eBay listing price (£). This does not publish to eBay.',saleDefaultPrice(i));if(raw===null)return;const price=Number(raw);if(!raw.trim()||!Number.isFinite(price)||price<0)return alert('Enter a valid listing price.');i.listing={channel:'eBay',price:Math.round(price*100)/100,date:today()};i.status='Listed';i.timeline.push(['Listed',`Existing eBay listing recorded locally at ${money(price)}.`]);render();};
function saleDefaultPrice(i){const raw=i.valuation?.finalValue??i.baseMarket;if(i.needsValuation||raw==null||raw===''||!Number.isFinite(Number(raw))||Number(raw)<0)return '';return marketValue(i);}
window.editLocalListing=id=>{const i=state.items.find(x=>x.id===id);if(!i?.listing||!RetroOps.active(i))return;const raw=prompt('Record the actual listing price (£). This does not change the marketplace.',i.listing.price);if(raw===null)return;const value=Number(raw);if(!raw.trim()||!Number.isFinite(value)||value<0)return alert('Enter a valid price.');const before=JSON.parse(JSON.stringify(i));(i.listingHistory||(i.listingHistory=[])).push({date:new Date().toISOString(),before:{...i.listing}});i.listing.price=Math.round(value*100)/100;i.timeline.push(['Listing price changed',new Date().toISOString()+' · '+money(before.listing.price)+' → '+money(value)+' recorded locally']);if(!persistState()){state.items[state.items.indexOf(i)]=before;return;}render();};
let saleBasket=[],saleTransactionId=null,savingSale=false;
window.manualSale=(id,customerId=null)=>{
 const items=state.items.filter(RetroCheckout.available),first=items.find(i=>i.id===id)||items[0];if(!first)return alert('No items available.');
 saleBasket=[{id:first.id,price:saleDefaultPrice(first)}];saleTransactionId=crypto.randomUUID();
 open(`<h2>Record sale</h2><p>Prices start at the RetroHQ market value. Change them to the agreed sale price.</p><div id="saleLines"></div><button class="btn secondary" onclick="addSaleItem()">Add another item</button>
 <div class="formgrid"><label>Channel<select id="saleChannel" class="select" onchange="saleChannelChanged()">${Object.keys(state.settings.fees).map(c=>`<option ${c===(first.listing?.channel==='eBay Live'?'eBay':first.listing?.channel||'In Store EPOS')?'selected':''}>${escapeText(c)}</option>`).join('')}</select></label>
 <label>Discount type<select id="saleDiscountType" class="select" onchange="saleSummary()"><option value="fixed">£ off basket</option><option value="percent">% off basket</option></select></label><label>Overall discount<input id="saleDiscount" class="input" type="number" min="0" step="0.01" value="0" oninput="saleSummary()"></label></div>
 <details><summary>Channel fees (editable)</summary><div class="formgrid"><label>Fee type<select id="feeType" class="select" onchange="saleSummary()"><option value="percent">Percentage</option><option value="fixed">Fixed £ per transaction</option></select></label><label>Fee value<input id="feeValue" class="input" type="number" min="0" step="0.01" oninput="saleSummary()"></label></div></details>
 <div class="formgrid"><label>Customer account (optional)<select id="saleCustomer" class="select" onchange="saleCustomerChanged()"><option value="">Walk-in / no account</option>${state.customers.map(c=>`<option value="${c.id}" ${c.id===customerId?'selected':''}>${escapeText(c.name)}${c.postcode?' · '+escapeText(c.postcode):''}</option>`).join('')}</select></label>
 <label>Use store credit (£)<input id="saleCredit" class="input" type="number" min="0" step="0.01" value="0" oninput="saleSummary()"><small id="saleCreditBalance" class="muted"></small></label></div>
 <p class="muted">Choose an account to link the purchase. Leave store credit at £0 to take the full payment separately.</p>
 <div id="saleSummary" role="status"></div><div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button id="saveSaleButton" class="btn primary" onclick="saveSale()">Save sale</button></div>`);
 renderSaleLines();saleCustomerChanged();saleChannelChanged();
};
window.saleCustomerChanged=()=>{
 const customer=state.customers.find(c=>c.id===Number($('#saleCustomer').value));
 $('#saleCredit').value='0';
 $('#saleCredit').disabled=!customer||customer.credit<=0;
 $('#saleCreditBalance').textContent=customer?money(customer.credit)+' available':'Select an account to use store credit.';
 saleSummary();
};
function saleInput(){return {lines:saleBasket,channel:$('#saleChannel').value,discountType:$('#saleDiscountType').value,discount:$('#saleDiscount').value,feeType:$('#feeType').value,feeValue:$('#feeValue').value,customerId:Number($('#saleCustomer').value)||null,credit:$('#saleCredit').value};}
function renderSaleLines(){
 $('#saleLines').innerHTML=saleBasket.map((line,n)=>'<div class="formgrid"><label>Item '+(n+1)+'<select class="select" onchange="changeSaleItem('+n+',this.value)">'+state.items.filter(i=>RetroCheckout.available(i)&&(i.id===line.id||!saleBasket.some(x=>x.id===i.id))).map(i=>'<option value="'+i.id+'" '+(i.id===line.id?'selected':'')+'>'+escapeText(i.title)+'</option>').join('')+'</select></label><label>Sale price (£)<input class="input sale-line-price" type="number" min="0" step="0.01" value="'+line.price+'" placeholder="Enter price — market value unknown" oninput="changeSalePrice('+n+',this.value)"></label>'+(saleBasket.length>1?'<button class="btn secondary" onclick="removeSaleItem('+n+')">Remove item</button>':'')+'</div>').join('');
}
window.changeSalePrice=(n,value)=>{saleBasket[n].price=value;saleSummary();};
window.changeSaleItem=(n,id)=>{const i=state.items.find(i=>i.id===Number(id));if(!i)return;saleBasket[n]={id:i.id,price:saleDefaultPrice(i)};renderSaleLines();saleSummary();};
window.addSaleItem=()=>{const i=state.items.find(i=>RetroCheckout.available(i)&&!saleBasket.some(x=>x.id===i.id));if(!i)return alert('No more available stock.');saleBasket.push({id:i.id,price:saleDefaultPrice(i)});renderSaleLines();saleSummary();};
window.removeSaleItem=n=>{saleBasket.splice(n,1);renderSaleLines();saleSummary();};
window.saleChannelChanged=()=>{const channel=$('#saleChannel').value,preset=state.settings.fees[channel];$('#feeType').value=preset.type;$('#feeValue').value=preset.value;saleSummary();};
window.saleSummary=()=>{try{const q=RetroCheckout.quote(state,saleInput());$('#saleSummary').innerHTML='<div class="card"><p>Subtotal '+money(q.subtotal/100)+' · Discount '+money(q.discount/100)+'</p><p>Sale total <strong>'+money(q.total/100)+'</strong> · Fees '+money(q.fee/100)+'</p><p>Trade credit '+money(q.credit/100)+' · <strong>Remaining to pay '+money(q.due/100)+'</strong></p><small>Saving confirms payment has been received. Credit is a payment method, not an additional discount.</small></div>';$('#saveSaleButton').disabled=false;}catch(e){$('#saleSummary').textContent=e.message;$('#saveSaleButton').disabled=true;}};
window.saveSale=()=>{
 if(savingSale)return;savingSale=true;
 try{const next=RetroCheckout.complete(state,saleInput(),saleTransactionId,today()),previous={items:state.items,customers:state.customers,transactions:state.transactions};
 Object.assign(state,{items:next.items,customers:next.customers,transactions:next.transactions});
 if(!persistState()){Object.assign(state,previous);backdrop.classList.add('hidden');return;}
 saleTransactionId=null;closeModal();if(state.view==='customerDetail')render();else go('sales');
 }catch(e){if($('#saleSummary'))$('#saleSummary').textContent=e.message;}finally{savingSale=false;}
};
window.setReportPeriod=p=>{if(!['today','7','30','all'].includes(p))return;state.reportPeriod=p;render();};
window.saveNotes=id=>{const i=state.items.find(x=>x.id===id);i.notes=$('#notes').value;i.timeline.push(['Notes','Notes updated.']);render();};window.saveSettings=()=>{state.settings.offerPct=Number($('#offerPct').value);state.settings.storeCreditBonus=Number($('#creditBonus').value);state.settings.greenMargin=Number($('#green').value);state.settings.yellowMargin=Number($('#yellow').value);state.settings.accessoryAllowances=state.settings.accessoryAllowances||{};state.settings.accessoryAllowances.cables=Math.max(0,Number($('#cableAllowance')?.value)||0);render();};window.editFeePreset=()=>{const channel=prompt('Channel: eBay, Vinted, In Store EPOS, Manual / Cash, Website');if(!state.settings.fees[channel])return;const type=prompt('Type: percent or fixed',state.settings.fees[channel].type),value=Number(prompt('Value',state.settings.fees[channel].value));state.settings.fees[channel]={type,value};render();};
$('#nav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)go(b.dataset.view);});$('#menu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeModal();});
const sellerReturn=new URLSearchParams(window.location.search).get('ebaySeller');
if(sellerReturn&&!demoMode){
 state.view='settings';
 window.history.replaceState(null,'',window.location.pathname);
 setTimeout(()=>{
   const result=$('#sellerActionResult');
   if(result)result.textContent=sellerReturn==='connected'?'Seller authorised. Click Test seller APIs to verify the connection.':'Seller authorisation was not completed. Check your RuName and callback URL, then try again.';
 },50);
}
function commitWorkspace(next){
  if(!workspaceReady||storageFailed)throw Error('Workspace saving is unavailable. Reload before continuing.');
  if(next.liveEbay?.stockSetup?.completed&&!state.liveEbay?.stockSetup?.completed){const saved=localStorage.getItem(workspaceKey);if(saved)localStorage.setItem(workspaceKey+'.before-ebay-stock-setup',saved);}
  if(next.liveEbay?.inventoryBaseline&&!state.liveEbay?.inventoryBaseline){const saved=localStorage.getItem(workspaceKey);if(saved)localStorage.setItem(workspaceKey+'.before-ebay-inventory',saved);}
  if(next.liveEbay?.salesHistoryVersion&&!state.liveEbay?.salesHistoryVersion){const saved=localStorage.getItem(workspaceKey);if(saved)localStorage.setItem(workspaceKey+'.before-ebay-sales',saved);}
  if(next.liveEbay?.inlineVersion&&!state.liveEbay?.inlineVersion){const saved=localStorage.getItem(workspaceKey);if(saved)localStorage.setItem(workspaceKey+'.before-inline-import',saved);}
  if(next.stockCsv?.imports?.length&&!state.stockCsv?.imports?.length){const saved=localStorage.getItem(workspaceKey);if(saved)localStorage.setItem(workspaceKey+'.before-stock-csv',saved);}
  const previous={};for(const k of RetroBackup.fields){previous[k]=state[k];if(next[k]===undefined)delete state[k];else state[k]=next[k];}
  if(!persistState()){for(const k of RetroBackup.fields){if(previous[k]===undefined)delete state[k];else state[k]=previous[k];}throw Error('Save failed. Previous saved stock is retained.');}
}
const epos=RetroEPOS.install({state:()=>state,money,escape:escapeText,today,commit:commitWorkspace,render,
 price:item=>item.listing?.channel==='In Store EPOS'&&Number.isFinite(item.listing.price)?item.listing.price:independentMarketValue(item)
});
const marketOverview=RetroOverviewUI.install({state:()=>state,demo:demoMode,fetch,escape:escapeText,render,commit:commitWorkspace,
 track(item){const next=JSON.parse(JSON.stringify(state));next.marketInsights=next.marketInsights||{version:1,targets:[]};const list=next.marketInsights.targets;if(list.length>=30)throw Error('Your watchlist is full (30 items).');if(list.some(t=>t.query===item.query&&t.grade===item.grade))return;list.push({id:crypto.randomUUID(),query:item.query,grade:item.grade,productId:item.productId||null,observations:[],candidates:[],status:'Not checked'});commitWorkspace(next);}
});
const marketInsights=RetroMarketUI.install({state:()=>state,demo:demoMode,fetch,escape:escapeText,render,commit:commitWorkspace});
const marketplace=RetroMarketplace.install({state,demo:demoMode,fetch,escape:escapeText,money,open,close:closeModal,render,showAllSales(){state.reportPeriod='all';},
 commit:commitWorkspace
});
const liveReturn=new URLSearchParams(location.search).get('ebayLive');
if(liveReturn&&!demoMode){state.view='production';history.replaceState(null,'',location.pathname);}
startSavedWorkspace();
})();
