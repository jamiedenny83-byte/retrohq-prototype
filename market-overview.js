/* Whole supplied guide rankings and category feeds; never derived from owned stock. */
(function(root){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
function* csvRows(text){let row=[],field='',quoted=false,closed=false;
 for(let n=0;n<=text.length;n++){const c=n===text.length?'\n':text[n];
  if(quoted){if(c==='"'){if(text[n+1]==='"'){field+='"';n++;}else{quoted=false;closed=true;}}else{if(n===text.length)throw Error('Unclosed CSV quotation.');field+=c;}}
  else if(c===','||c==='\n'||c==='\r'){row.push(field);field='';closed=false;if(row.length>200)throw Error('Too many CSV columns.');if(c!==','){if(c==='\r'&&text[n+1]==='\n')n++;if(row.some(x=>x.trim()))yield row;row=[];}}
  else if(c==='"'){if(field.trim()||closed)throw Error('Invalid CSV quotation.');quoted=true;field='';}
  else {if(closed&&!/\s/.test(c))throw Error('Unexpected text after CSV quotation.');if(!closed)field+=c;}
  if(field.length>6000)throw Error('CSV field too long.');
 }if(quoted)throw Error('Unclosed CSV quotation.');
}
const price=v=>{const t=String(v??'').trim().replace(/^\$/,'');if(!t)return null;if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(t))return null;const n=Number(t.replace(/,/g,''));return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:null;};
function guide(text,date,now=new Date().toISOString()){
 if(typeof text!=='string'||text.length>80*1024*1024)throw Error('Choose a PriceCharting guide smaller than 80 MB.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>now.slice(0,10))throw Error('Choose the actual guide date, not a future date.');
 const iterator=csvRows(text.replace(/^\uFEFF/,'')),first=iterator.next();if(first.done)throw Error('Empty price guide.');const columns=first.value.map(x=>x.trim().toLowerCase()),at=k=>columns.indexOf(k);
 if(['id','product-name','console-name'].some(k=>at(k)<0)||!['loose','cib','new'].some(k=>at(k+'-price')>=0))throw Error('Use the original PriceCharting price-guide CSV with product IDs, platform and price columns.');
 const groups={},seen=new Set(),stats={rows:0,eligible:0,excluded:0,duplicates:0,missingVolume:0};
 const top=(array,row,metric)=>{if(metric(row)==null)return;array.push(row);array.sort((a,b)=>metric(b)-metric(a)||a.id.localeCompare(b.id));if(array.length>10)array.length=10;};
 function add(key,row){if(!groups[key]){if(Object.keys(groups).length>=85)return;groups[key]={count:0,volumeKnown:0,annualUnits:0,volume:[],value:{loose:[],cib:[],new:[]},median:{},samples:{loose:[],cib:[],new:[]}};}const g=groups[key];g.count++;if(row.volume!==null){g.volumeKnown++;g.annualUnits+=row.volume;}top(g.volume,row,r=>r.volume);for(const grade of ['loose','cib','new']){top(g.value[grade],row,r=>r.prices[grade]);if(row.prices[grade]!==null)g.samples[grade].push(row.prices[grade]);}}
 for(const cells of iterator){if(++stats.rows>250000)throw Error('Guide exceeds 250,000 rows; use the video-games price guide.');const field=k=>String(cells[at(k)]??'').trim();
  const id=field('id'),title=field('product-name'),platform=field('console-name'),genre=field('genre');
  if(!/^\d{1,16}$/.test(id)||!title||title.length>250||platform.length>100||!/(?:\bps[1-5]\b|\bn64\b|\bgba\b|\bgbc\b|playstation|xbox|nintendo|gamecube|game\s?boy|nes\b|snes\b|dreamcast|mega drive|genesis|saturn|sega|atari|wii|switch|psp|vita|game gear|turbografx|neo geo)/i.test(platform)){stats.excluded++;continue;}
  if(seen.has(id)){stats.duplicates++;continue;}seen.add(id);
  if(field('currency')&&field('currency').toUpperCase()!=='USD')throw Error('PriceCharting CSV references must be USD. No currency conversion is applied.');
  const category=/systems?|consoles?/i.test(genre)?'consoles':/accessor|controller/i.test(genre)||/\b(?:controller|memory card|joystick|adapter|cable)\b/i.test(title)?'accessories':'games';
  const raw=field('sales-volume'),volume=/^\d+$/.test(raw)&&Number.isSafeInteger(Number(raw))?Number(raw):null;
  const row={id,title,platform,category,volume,prices:Object.fromEntries(['loose','cib','new'].map(k=>[k,price(field(k+'-price'))]))};
  if(volume===null)stats.missingVolume++;stats.eligible++;for(const key of ['all',category,'platform:'+platform])add(key,row);
 }
 if(!stats.eligible)throw Error('No supported game/console/accessory records in this guide.');
 for(const g of Object.values(groups)){for(const grade of ['loose','cib','new']){const a=g.samples[grade].sort((a,b)=>a-b),n=a.length;g.median[grade]=n?(n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2):null;}delete g.samples;}
 const result={source:'PriceCharting CSV',currency:'USD',date,importedAt:now,stats,groups};validate({version:1,feeds:{},guide:result});return result;
}
function apply(state,feed){if(!feed?.ok||!['games','consoles','toys'].includes(feed.category)||feed.marketplace!=='EBAY_GB')throw Error('Invalid category market feed.');const next=clone(state),market=next.marketOverview||(next.marketOverview={version:1,feeds:{}}),before=market.feeds[feed.category]||{};
 const saved={label:feed.label,checkedAt:feed.checkedAt};for(const key of ['best','active','high'])if(feed[key])saved[key]=feed[key].ok?clone(feed[key]):{...(before[key]||{}),error:feed[key]?.status||'Unavailable',detail:feed[key]?.detail||''};market.feeds[feed.category]=saved;return next;}
function validate(value){if(!value||value.version!==1||!value.feeds||typeof value.feeds!=='object'||Array.isArray(value.feeds))throw Error('Invalid market overview.');
 for(const [category,f]of Object.entries(value.feeds)){if(!['games','consoles','toys'].includes(category)||!f||typeof f!=='object')throw Error('Invalid category market data.');const sample=f.active;if(sample?.ok){const {median,lower,upper,count}=sample;if(sample.currency!=='GBP'||!Number.isInteger(count)||count<0||count>50||(count<8?[median,lower,upper].some(n=>n!==null):![lower,median,upper].every(n=>Number.isFinite(n)&&n>0)||lower>median||median>upper))throw Error('Invalid active listing sample.');}if((f.best?.products||[]).length>10||(f.high?.items||[]).length>10)throw Error('Too many category market records.');for(const row of f.best?.products||[])if(!/^\d{1,30}$/.test(row.epid)||typeof row.title!=='string')throw Error('Invalid best-selling product.');for(const row of f.high?.items||[])if(!safeUrl(row.url)||!Number.isFinite(row.value)||row.value<0||row.currency!=='GBP')throw Error('Invalid market listing.');}
 if(value.guide){const g=value.guide;if(g.source!=='PriceCharting CSV'||g.currency!=='USD'||!g.stats||!Number.isSafeInteger(g.stats.eligible)||!g.groups||Object.keys(g.groups).length>85)throw Error('Invalid price guide.');for(const k of ['rows','eligible','excluded','duplicates','missingVolume'])if(!Number.isSafeInteger(g.stats[k])||g.stats[k]<0)throw Error('Invalid guide coverage.');if(g.stats.rows!==g.stats.eligible+g.stats.excluded+g.stats.duplicates||g.stats.missingVolume>g.stats.eligible)throw Error('Guide coverage totals do not agree.');for(const group of Object.values(g.groups)){if(!Number.isSafeInteger(group.count)||group.count<0||group.count>g.stats.eligible||!Number.isSafeInteger(group.volumeKnown)||group.volumeKnown>group.count||!Number.isSafeInteger(group.annualUnits)||group.annualUnits<0)throw Error('Invalid guide totals.');for(const rows of [group.volume,...Object.values(group.value||{})]){if(!Array.isArray(rows)||rows.length>10)throw Error('Invalid guide ranking.');for(const row of rows){if(!/^\d{1,16}$/.test(row.id)||typeof row.title!=='string'||typeof row.platform!=='string'||row.volume!==null&&(!Number.isSafeInteger(row.volume)||row.volume<0))throw Error('Invalid guide item.');for(const n of Object.values(row.prices||{}))if(n!==null&&(!Number.isFinite(n)||n<0))throw Error('Invalid guide value.');}}}}
 return value;
}
function safeUrl(value){return typeof value==='string'&&/^https:\/\/(?:www\.)?ebay\.co\.uk\/itm\/[a-zA-Z0-9/?&=._%+|\-]+$/.test(value);}
const api={csvRows,price,guide,apply,validate,safeUrl};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetroOverview=api;
})(typeof globalThis!=='undefined'?globalThis:this);
