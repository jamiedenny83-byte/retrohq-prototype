(function(root){
'use strict';
root.RetroOverviewUI={install(c){
 const e=c.escape,$=q=>document.querySelector(q),data=()=>c.state().marketOverview||{version:1,feeds:{}};
 let category='games',guideGroup='games',trendCategory='games',grade='cib',busy=false,scheduled=false,message='',guideMessage='',compareMessage='',attempted={};
 const money=(n,currency='GBP')=>n==null?'Not supplied':new Intl.NumberFormat('en-GB',{style:'currency',currency}).format(n);
 const date=value=>value?new Date(value).toLocaleString('en-GB'):'Never';
 function partNote(part){return (part?.error?'<div class="notice"><strong>'+e(part.error)+'</strong><p>'+e(part.detail||'Previous data is retained until this source responds.')+'</p></div>':'')+'<p class="muted">Last successful check: '+e(date(part?.checkedAt))+(part?.checkedAt&&Date.now()-Date.parse(part.checkedAt)>86400000?' · OLD READING — verify on eBay':'')+'</p>';}
 function view(){
  if(c.demo)return '<div class="card"><h2>Market overview</h2><p>Return to your saved workspace for live category market data. Offline practice makes no provider calls.</p></div>';
  const f=data().feeds[category]||{};
  if(!busy&&!scheduled&&(!attempted[category]||Date.now()-attempted[category]>3600000)){scheduled=true;setTimeout(()=>{scheduled=false;if($('#marketOverviewPanel'))root.refreshOverview(false);},0);}
  return '<section id="marketOverviewPanel"><div class="hero"><div><small>HQ Market · wider market</small><h2>Rankings, trends and market watch</h2><p>Research games, consoles and accessories across the catalogue.</p></div></div>'+guideView()+movementView()+newsView()+'<div class="card"><div class="toolbar"><label>UK category<select class="select" onchange="overviewCategory(this.value)">'+[['games','Video games'],['consoles','Consoles'],['toys','Toys & games']].map(([v,label])=>'<option value="'+v+'" '+(category===v?'selected':'')+'>'+label+'</option>').join('')+'</select></label><button class="btn primary" onclick="refreshOverview(true)" '+(busy?'disabled':'')+'>Refresh category market</button></div><p id="overviewStatus" role="status">'+e(message||'Loading category evidence…')+'</p><p class="muted">Explore eBay’s category feeds and your PriceCharting guide independently of your watchlist.</p></div><div class="grid two"><div class="card"><h3>eBay UK best sellers</h3>'+partNote(f.best)+(f.best?.products?.length?'<ol class="market-ranking">'+f.best.products.map((x,n)=>'<li><strong>'+e(x.title)+'</strong><small>'+e(x.prices?.length?x.prices.slice(0,3).map(p=>'From '+money(p.value)+' · '+p.condition).join(' / '):'Price not supplied')+'</small><a class="btn secondary" href="https://www.ebay.co.uk/p/'+x.epid+'" target="_blank" rel="noopener noreferrer">View product</a><button class="btn secondary" onclick="watchOverview(\'best\','+n+')">Track prices</button></li>').join('')+'</ol>':'<p>'+(f.best?.error?'Best-seller data is currently unavailable. For completed sales, use <a href="https://www.ebay.co.uk/help/selling/selling-tools/product-research?id=4853" target="_blank" rel="noopener noreferrer">eBay Product Research</a>.':'No best-selling products returned.')+'</p>')+'<details><summary>What this ranking means</summary><p>eBay supplies the category ranking. “From” prices are active listing references by condition.</p></details></div>'+activeView(f.active)+'</div></section>';
 }
 function activeView(part){
  const label={games:'video games',consoles:'consoles',toys:'toys and games'}[category];
  const rows=part?.listings||[];
  const summary=part?.median==null?'Range unavailable for this sample.':'Median '+money(part.median)+' · middle half '+money(part.lower)+' to '+money(part.upper)+'.';
  return '<div class="card"><h3>eBay UK · active '+label+'</h3>'+partNote(part)
   +(rows.length?'<ol class="market-ranking">'+rows.map(row=>'<li><strong>'+e(row.title)+'</strong><span>'+money(row.value)+' asking</span><small>'+e(row.condition)+'</small><a href="'+e(row.url)+'" target="_blank" rel="noopener noreferrer">View listing</a></li>').join('')+'</ol>'
    :'<p>'+(part?.ok&&!part.listings?'Refresh category market to load individual listings.':'No active listings available for this category.')+'</p>')
   +(part?.ok?'<details><summary>Asking-price sample · '+part.count+' UK listings</summary><p>'+summary+' Prices exclude postage.</p></details>':'')+'</div>';
 }
 const groupNames={games:'Video games',consoles:'Consoles',accessories:'Accessories',all:'All categories'};
 function guideView(){
  const guide=data().guide,group=guide?.groups[guideGroup],disabled=busy?'disabled':'';
  return `<div class="card"><h2>Catalogue top 10</h2><p>PriceCharting reference prices and reported annual trading volume across your supplied guide.</p>
   <div class="toolbar"><label>Category or platform<select aria-label="Category or platform" class="select" onchange="overviewGuideGroup(this.value)">${[...new Set([...Object.keys(groupNames),...Object.keys(guide?.groups||{})])].map(key=>'<option value="'+e(key)+'" '+(key===guideGroup?'selected':'')+'>'+e(groupNames[key]||key.slice(9))+'</option>').join('')}</select></label>
   <label>Condition / completeness<select class="select" onchange="overviewGuideGrade(this.value)">${[['loose','Loose'],['cib','Complete / boxed'],['new','New / sealed']].map(([key,label])=>'<option value="'+key+'" '+(key===grade?'selected':'')+'>'+label+'</option>').join('')}</select></label></div>
   <details ${guide?'':'open'}><summary>${guide?'Update PriceCharting guide':'Load PriceCharting guide'}</summary>
    <p>Choose the actual date and a PriceCharting price-guide CSV. Reference prices are in USD.</p>
    <div class="toolbar"><label>Guide date<input class="input" type="date" id="marketGuideDate" value="${e(guide?.date||new Date().toISOString().slice(0,10))}" ${disabled}></label>
    <label>PriceCharting CSV<input class="input" type="file" id="marketGuideFile" accept=".csv,text/csv" onchange="importMarketGuide(this.files[0])" ${disabled}></label></div>
   </details>
   <p id="guideStatus" role="status">${e(guideMessage)}</p>
   ${guide?`<p>${group?.count||0} products in this group · guide dated ${e(guide.date)} · ${group?.volumeKnown||0} with annual volume</p>
    <div class="grid two">${guideRanking('Top 10 · highest reference prices',group?.value?.[grade]||[],false)}${guideRanking('Top 10 · reported annual volume',group?.volume||[],true)}</div>`
    :'<p>Load a guide to see the catalogue rankings for games, consoles and accessories.</p>'}</div>`;
 }
 function movementView(){
  const movement=data().movement,group=movement?.groups[trendCategory+':'+grade],period=movement?movement.days+' days':'90 days',disabled=busy?'disabled':'';
  const compareLink='<a href="https://www.pricecharting.com/big-movers" target="_blank" rel="noopener noreferrer">See recent PriceCharting movers</a>';
  function ranking(title,rows){
   return '<div><h3>'+title+'</h3>'+(rows?.length?'<ol class="market-ranking">'+rows.map(row=>'<li><strong>'+e(row.title)+'</strong><span>'+(row.change>0?'+':'')+row.change.toFixed(1)+'%</span><small>'+e(row.platform)+' · '+money(row.previous,'USD')+' → '+money(row.value,'USD')+(row.volume===null?'':' · '+row.volume+' annual units')+'</small><a href="https://www.pricecharting.com/game/'+row.id+'" target="_blank" rel="noopener noreferrer">View reference</a></li>').join('')+'</ol>'
    :'<p class="muted">'+(movement?'No qualifying movement for this selection.':'Load two dated guides to measure the change.')+'</p>')+'</div>';
  }
  return `<div class="card"><h2>Market trends</h2>
   <div class="toolbar"><label>Trend category<select aria-label="Trend category" class="select" onchange="overviewTrendCategory(this.value)">${['games','consoles','accessories'].map(key=>'<option value="'+key+'" '+(key===trendCategory?'selected':'')+'>'+groupNames[key]+'</option>').join('')}</select></label><span>Condition: ${{loose:'Loose',cib:'Complete / boxed',new:'New / sealed'}[grade]}</span></div>
   <p id="compareStatus" role="status">${e(compareMessage)}</p>
   <p>${movement?e(movement.from)+' to '+e(movement.to)+' · '+period+' · '+(group?.matched||0)+' comparable prices for this selection.':'Compare two guide snapshots taken about three months apart for a 90-day view.'}</p>
   <div class="grid two">${ranking('Top 10 rising · '+period,group?.rising)}${ranking('Top 10 falling · '+period,group?.falling)}</div>
   <details><summary>Research shortlist</summary><p>Rising prices with at least 20 reported annual units. Check UK completed sales and condition before using these as buying leads.</p>${ranking('Items to watch',group?.watch)}</details>
   <details id="marketCompareGuides"><summary>Compare two dated guides</summary>
    <form onsubmit="event.preventDefault();compareMarketGuides()"><p>Choose earlier and later versions of the same PriceCharting guide. RetroHQ compares the same product and completeness grade across both dates.</p>
     <div class="formgrid"><label>Earlier guide date<input class="input" type="date" id="marketEarlierDate" required ${disabled}></label><label>Earlier guide CSV<input class="input" type="file" id="marketEarlierFile" accept=".csv,text/csv" required ${disabled}></label>
     <label>Later guide date<input class="input" type="date" id="marketLaterDate" value="${e(data().guide?.date||new Date().toISOString().slice(0,10))}" required ${disabled}></label><label>Later guide CSV<input class="input" type="file" id="marketLaterFile" accept=".csv,text/csv" required ${disabled}></label></div>
     <p><button class="btn primary" type="submit" ${disabled}>Compare guides</button></p>
    </form></details>
   <p>${compareLink} · their changes usually cover the latest week.</p></div>`;
 }
 function newsView(){
  return `<div class="card"><h2>Market watch</h2><p>Selected announcements and what to check in the resale market.</p>
   <div class="grid two">
    <article><h3>PS3 and PS Vita store closures</h3><small>Announced 1 July 2026 · UK closure window July 2027</small>
     <p>Sony plans to end new digital purchases on both devices in the UK. Previously purchased content remains available to download for the foreseeable future.</p>
     <p><strong>Watch:</strong> Compare UK sold prices and volume for PAL discs and cartridges before and after the closure, particularly titles with few other ways to play.</p>
     <a href="https://blog.playstation.com/2026/07/01/an-update-on-playstation-store-for-ps3-and-ps-vita/" target="_blank" rel="noopener noreferrer">Sony announcement</a></article>
    <article><h3>PlayStation disc production for new releases</h3><small>Announced 1 July 2026 · Scheduled for January 2028</small>
     <p>Sony plans to end disc production for new releases from January 2028. Existing releases and games due to release on disc before then are outside the change.</p>
     <p><strong>Watch:</strong> Track physical editions separately from digital releases, and check whether actual UK sell-through changes.</p>
     <a href="https://blog.playstation.com/2026/07/01/physical-disc-production-ending-in-january-2028-for-new-games-releasing-on-playstation-consoles/" target="_blank" rel="noopener noreferrer">Sony announcement</a></article>
   </div></div>`;
 }
 function guideRanking(title,rows,volume){return '<div><h3>'+title+'</h3>'+(rows.length?'<ol class="market-ranking">'+rows.map((x,n)=>'<li><strong>'+e(x.title)+'</strong><span>'+e(volume?x.volume+' annual units':money(x.prices[grade],'USD'))+'</span><small>'+e(x.platform)+' · '+e(grade.toUpperCase())+'</small><a class="btn secondary" href="https://www.pricecharting.com/game/'+x.id+'" target="_blank" rel="noopener noreferrer">View reference</a><button class="btn secondary" onclick="watchOverview(\''+(volume?'guideVolume':'guideValue')+'\','+n+')">Track item</button></li>').join('')+'</ol>':'<p>No supplied values for this metric/completeness. Unknown values are not zero.</p>')+'</div>';}
 function repaint(){if($('#marketOverviewPanel'))c.render();}
 root.refreshOverview=async force=>{if(c.demo||busy)return;const requested=category;busy=true;attempted[requested]=Date.now();message='Reading the '+requested+' category across eBay UK…';repaint();try{const old=data().feeds[requested];if(!force&&Array.isArray(old?.active?.listings)&&old.checkedAt&&Date.now()-Date.parse(old.checkedAt)<3600000){message='Showing the saved category readings; source check times are below.';return;}const r=await c.fetch('/api/market-overview?'+new URLSearchParams({category:requested}),{cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok)throw Error(d.status||'Category market unavailable');c.commit(RetroOverview.apply(c.state(),d));message='Category checked. Source errors and actual check times are shown below.';}catch(ex){message=ex.message+' Previous successful category readings are retained.';}finally{busy=false;repaint();}};
 root.overviewTrendCategory=value=>{if(['games','consoles','accessories'].includes(value))trendCategory=value;repaint();};
 root.overviewCategory=value=>{if(!['games','consoles','toys'].includes(value))return;category=value;message='';repaint();};root.overviewGuideGroup=value=>{if(Object.hasOwn(groupNames,value)||Object.hasOwn(data().guide?.groups||{},value))guideGroup=value;repaint();};root.overviewGuideGrade=value=>{if(['loose','cib','new'].includes(value))grade=value;repaint();};
 function saveGuide(guide,movement){
  const next=JSON.parse(JSON.stringify(c.state()));
  const market=next.marketOverview||(next.marketOverview={version:1,feeds:{}});
  if(!market.guide||guide.date>=market.guide.date)market.guide=guide;
  if(movement)market.movement=movement;
  RetroOverview.validate(market);
  c.commit(next);
 }
 function checkFile(file){
  if(!file||file.size>80*1024*1024)throw Error('Choose a price-guide CSV up to 80 MB.');
 }
 root.importMarketGuide=async file=>{
  if(!file||c.demo||busy)return;
  busy=true;
  try{
   checkFile(file);
   const sourceDate=$('#marketGuideDate').value,guide=RetroOverview.guide(await file.text(),sourceDate);
   if(data().guide&&guide.date<data().guide.date)throw Error('Choose a guide dated the same day or newer than the saved guide.');
   saveGuide(guide);
   guideMessage='Guide loaded. '+guide.stats.eligible+' eligible records.';
  }catch(error){guideMessage=error.message;}
  finally{busy=false;repaint();}
 };
 root.compareMarketGuides=async()=>{
  if(c.demo||busy)return;
  const earlier=$('#marketEarlierFile').files[0],later=$('#marketLaterFile').files[0];
  const from=$('#marketEarlierDate').value,to=$('#marketLaterDate').value;
  busy=true;
  let failed=false;
  try{
   checkFile(earlier);checkFile(later);
   const {current,movement}=RetroOverview.compareGuides(await earlier.text(),from,await later.text(),to);
   if(!Object.keys(movement.groups).length)throw Error('These guides have no matching products with usable prices in both snapshots.');
   saveGuide(current,movement);
   compareMessage='Compared '+movement.days+' days of catalogue prices.';
  }catch(error){failed=true;compareMessage=error.message;}
  finally{busy=false;repaint();if(failed&&$('#marketCompareGuides'))$('#marketCompareGuides').open=true;}
 };
 root.watchOverview=(kind,n)=>{const f=data().feeds[category]||{},g=data().guide?.groups[guideGroup],row=kind==='best'?f.best?.products?.[n]:kind==='guideVolume'?g?.volume?.[n]:g?.value?.[grade]?.[n];if(!row)return;try{c.track({query:(row.title+' '+(row.platform||'')).trim().slice(0,180),productId:kind.startsWith('guide')?row.id:null,grade:kind.startsWith('guide')?grade:'cib'});message='Added to My tracked items.';}catch(ex){message=ex.message;}repaint();};
 return {view};
}};
})(typeof globalThis!=='undefined'?globalThis:this);
