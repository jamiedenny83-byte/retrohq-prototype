/* Inventory operations. Missing dates/costs remain unknown. */
(function(root){
'use strict';
const round=n=>Math.round(n*100)/100;
const amount=n=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n))&&Number(n)>=0;
const active=i=>!i.importHold&&!i.sale&&!['Sold','Packaged','Dispatched','Delivered','Completed'].includes(i.status);
function age(value,now=new Date().toISOString()){if(!value)return null;const a=Date.parse(value),b=Date.parse(now);return Number.isFinite(a)&&Number.isFinite(b)&&a<=b?Math.floor((b-a)/86400000):null;}
function economics(i){
 const s=i.sale;if(!s||s.reviewNeeded||!s.costsConfirmed||(i.returns||[]).length||(i.saleHistory||[]).length)return {profit:null,margin:null,roi:null,net:null};
 const fields=[s.price,s.feeValue,s.shipping,s.packaging,s.shippingRevenue,s.promotion,i.buy,i.processingCosts];
 if(!fields.every(amount))return {profit:null,margin:null,roi:null,net:null};
 const revenue=Number(s.price)+Number(s.shippingRevenue),fee=s.feeType==='percent'?Number(s.price)*Number(s.feeValue)/100:Number(s.feeValue),net=round(revenue-fee-Number(s.shipping)-Number(s.packaging)-Number(s.promotion)),invested=Number(i.buy)+Number(i.processingCosts),profit=round(net-invested);
 return {profit,net,margin:revenue?profit/revenue*100:0,roi:invested?profit/invested*100:null};
}
function saleAmounts(i,defaultFee){
 const s=i.sale;if(!s)return {price:null,fee:null,feeType:null,feeValue:null,estimated:false};
 let type=s.feeType,value=s.feeValue,estimated=s.feeEstimated===true;
 const validFee=(t,v)=>['fixed','percent'].includes(t)&&typeof v==='number'&&Number.isFinite(v)&&v>=0;
 if(!validFee(type,value)&&!s.costsConfirmed&&['eBay','eBay Live'].includes(s.channel)&&validFee(defaultFee?.type,defaultFee?.value)){type=defaultFee.type;value=defaultFee.value;estimated=true;}
 const price=typeof s.price==='number'&&Number.isFinite(s.price)?s.price:null;
 return {price,fee:validFee(type,value)&&price!==null?round(type==='percent'?price*value/100:value):null,feeType:type,feeValue:value,estimated};
}
function reportPeriod(date,period,reference){
 if(period==='all')return true;
 if(!['today','7','30'].includes(period))return false;
 if(reference===undefined){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());reference=['year','month','day'].map(k=>parts.find(x=>x.type===k).value).join('-');}
 const day=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const n=Date.parse(value+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===value?n:null;};
 const a=day(date),b=day(reference);if(a===null||b===null)return false;const diff=(b-a)/86400000;return diff>=0&&diff<(period==='today'?1:Number(period));
}
const platformRules=[['PlayStation 5',/\b(ps5|playstation 5)\b/i],['PlayStation 4',/\b(ps4|playstation 4)\b/i],['PlayStation 3',/\b(ps3|playstation 3)\b/i],['PlayStation 2',/\b(ps2|playstation 2)\b/i],['Original Xbox',/\boriginal xbox\b/i],['Xbox 360',/\bxbox 360\b/i],['Xbox One',/\bxbox one\b/i],['Xbox Series',/\bxbox series\b/i],['Game Boy Advance',/\b(game ?boy advance|gba)\b/i],['Game Boy Color',/\b(game ?boy colo[u]?r|gbc)\b/i],['Nintendo 64',/\b(nintendo 64|n64)\b/i],['GameCube',/\b(gamecube|game cube)\b/i],['Dreamcast',/\bdreamcast\b/i],['SNES',/\b(snes|super nintendo)\b/i]];
function stockSystem(i){const explicit=String(i.platform||i.identity?.platform||'').trim(),value=explicit||i.title||'';return platformRules.find(x=>x[1].test(value))?.[0]||explicit||null;}
function systemStock(items){const groups=new Map();for(const i of items){if(!active(i)||!['Video Game','Console'].includes(i.category))continue;const platform=stockSystem(i);if(!platform)continue;let row=groups.get(platform);if(!row){row={platform,games:0,consoles:0,total:0};groups.set(platform,row);}row[i.category==='Video Game'?'games':'consoles']++;row.total++;}return [...groups.values()].sort((a,b)=>a.total-b.total||a.platform.localeCompare(b.platform));}
function queue(items,now){return items.filter(active).map(i=>({item:i,days:age(i.acquiredDate,now),listedDays:age(i.listing?.date,now),issues:[...(!amount(i.buy)||!amount(i.processingCosts)?['Purchase / preparation cost missing']:[]),...(!i.acquiredDate?['Acquisition date missing']:[]),...(!i.location||i.location==='Unassigned'?['Storage location missing']:[]),...(i.needsValuation?['Value needed']:[])]})).sort((a,b)=>(b.days??-1)-(a.days??-1));}
function batches(items){const groups=new Map();for(const i of items){if(i.importHold||!i.batchId)continue;let g=groups.get(i.batchId);if(!g){g={id:i.batchId,name:i.batchName||i.batchId,items:[],investment:0,recovered:0,profit:0,pending:0,sold:0};groups.set(i.batchId,g);}g.items.push(i);if(amount(i.buy)&&amount(i.processingCosts)&&g.investment!==null)g.investment+=Number(i.buy);else g.investment=null;const e=economics(i);if(i.sale){g.sold++;if(e.profit===null)g.pending++;else{g.recovered+=e.net;g.profit+=e.profit;}}else if(i.saleHistory?.length||i.returns?.length)g.pending++;}return [...groups.values()].map(g=>({...g,investment:g.investment===null?null:round(g.investment),recovered:round(g.recovered),profit:round(g.profit),remaining:g.investment===null?null:round(Math.max(0,g.investment-g.recovered))}));}
function recommendation(i,market,feePercent,margin,now){
 if(!active(i)||!i.listing)return {action:'Prepare listing',price:null};
 if(age(i.listing.date,now)===null)return {action:'Record listing date before reviewing age',price:null};
 if(age(i.listing.date,now)<30)return {action:'Keep current price; review after 30 days',price:null};
 const c=i.buyingEstimate?.costs||{},values=[market,feePercent,margin,i.buy,i.processingCosts,c.postage,c.packaging];
 if(!values.every(amount)||feePercent+margin>=100||i.needsValuation)return {action:'Refresh value and selling costs before changing price',price:null};
 const floor=Math.ceil((Number(i.buy)+Number(i.processingCosts)+Number(c.postage)+Number(c.packaging))/(1-feePercent/100-margin/100)*100)/100;
 const price=round(Math.max(floor,Number(market)));return {action:price<Number(i.listing.price)?'Review a lower asking price':'Review photos, completeness and demand before reducing',price,floor};
}
const api={age,active,economics,saleAmounts,reportPeriod,stockSystem,systemStock,queue,batches,recommendation};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetroOps=api;
})(typeof globalThis!=='undefined'?globalThis:this);

