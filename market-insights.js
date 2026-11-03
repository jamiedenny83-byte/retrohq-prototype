/* Dated provider readings. No synthetic trends, currency conversions or future returns. */
(function(root){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),day=86400000;
const starters=['Silent Hill 2 PS2','The Simpsons Hit and Run PS2','Pokemon Emerald Game Boy Advance','Pokemon Crystal Game Boy Color','Mario Kart Double Dash GameCube','The Legend of Zelda Wind Waker GameCube','Paper Mario Thousand Year Door GameCube','Super Mario Sunshine GameCube','Resident Evil 4 GameCube','Metroid Prime GameCube'];
const empty=()=>({version:1,targets:starters.map((query,n)=>({id:'starter-'+n,query,grade:'cib',productId:null,observations:[],candidates:[],status:'Not checked'}))});
function validate(s){
 if(!s||s.version!==1||!Array.isArray(s.targets)||s.targets.length>30)throw Error('Invalid market watchlist.');
 const ids=new Set();for(const t of s.targets){if(!t||typeof t.id!=='string'||ids.has(t.id)||typeof t.query!=='string'||t.query.length<2||t.query.length>180||!['loose','cib','new'].includes(t.grade)||t.productId!=null&&!/^\d{1,16}$/.test(t.productId)||!Array.isArray(t.observations)||t.observations.length>1080||!Array.isArray(t.candidates)||t.candidates.length>6)throw Error('Invalid tracked market item.');ids.add(t.id);
  for(const o of t.observations)if(!o||!['pricecharting','ebay'].includes(o.provider)||o.currency!==(o.provider==='pricecharting'?'USD':'GBP')||!Number.isFinite(o.value)||o.value<0||!Number.isFinite(Date.parse(o.checkedAt))||typeof o.series!=='string'||!o.series||!['loose','cib','new'].includes(o.grade)||o.provider==='pricecharting'&&!/^\d{1,16}$/.test(o.productId||'')||o.provider==='ebay'&&(!Number.isSafeInteger(o.count)||o.count<5))throw Error('Invalid provider price history.');
  for(const p of t.candidates)if(!p||typeof p.id!=='string'||!/^\d{1,16}$/.test(p.id)||typeof p.title!=='string'||typeof p.platform!=='string')throw Error('Invalid catalogue candidate.');
  for(const o of t.observations){const expected=o.provider==='pricecharting'?JSON.stringify([o.productId,o.grade,'USD']):JSON.stringify([o.query,o.grade,'EBAY_GB','GBP','fixed-price-asking-v1']);if(o.series!==expected||o.provider==='ebay'&&typeof o.query!=='string')throw Error('Price history identity changed.');}
 }return s;
}
function apply(saved,id,response,now=Date.now()){
 const next=clone(saved),t=next.targets.find(t=>t.id===id);if(!t||!response?.ok||response.query!==t.query||response.grade!==t.grade)throw Error('Market reading does not match this tracked item.');
 t.lastAttempt=new Date(now).toISOString();t.status=['pricecharting','ebay'].map(k=>response[k]?.status||'Unavailable').join(' · ');
 t.candidates=(response.candidates||[]).filter(x=>/^\d{1,16}$/.test(x.id)&&typeof x.title==='string'&&typeof x.platform==='string').slice(0,6);
 for(const provider of ['pricecharting','ebay']){const p=response[provider];if(!p?.ok||!Number.isFinite(p.value)||p.value<0||!Number.isFinite(Date.parse(p.checkedAt))||Date.parse(p.checkedAt)>now+60000)continue;
  if(provider==='pricecharting'&&(p.productId!==t.productId||p.currency!=='USD'))continue;
  if(provider==='ebay'&&(p.currency!=='GBP'||!Number.isSafeInteger(p.count)||p.count<5||typeof p.query!=='string'))continue;
  const series=provider==='pricecharting'?JSON.stringify([p.productId,t.grade,'USD']):JSON.stringify([p.query,t.grade,'EBAY_GB','GBP','fixed-price-asking-v1']);
  const o={provider,series,grade:t.grade,checkedAt:p.checkedAt,value:p.value,currency:p.currency,...(provider==='pricecharting'?{productId:p.productId,title:p.title,platform:p.platform,annualVolume:typeof p.annualVolume==='number'&&Number.isFinite(p.annualVolume)&&p.annualVolume>=0?p.annualVolume:null}:{count:p.count,query:p.query})};
  const date=o.checkedAt.slice(0,10);t.observations=t.observations.filter(x=>!(x.provider===provider&&x.series===series&&x.checkedAt.slice(0,10)===date));t.observations.push(o);
 }
 t.observations.sort((a,b)=>Date.parse(a.checkedAt)-Date.parse(b.checkedAt));t.observations=t.observations.slice(-1080);return validate(next);
}
function summary(t,provider,period=30,now=Date.now()){
 let all=t.observations.filter(o=>o.provider===provider&&o.grade===t.grade&&Date.parse(o.checkedAt)<=now&&(provider!=='pricecharting'||o.productId===t.productId)).sort((a,b)=>Date.parse(a.checkedAt)-Date.parse(b.checkedAt));
 const latest=all.at(-1);if(!latest)return {target:t,latest:null,change:null,reason:'No live reading yet'};
 const stale=now-Date.parse(latest.checkedAt)>3*day;all=all.filter(o=>o.series===latest.series);
 const cutoff=Date.parse(latest.checkedAt.slice(0,10))-period*day,base=all.filter(o=>Date.parse(o.checkedAt.slice(0,10))<=cutoff&&Date.parse(o.checkedAt.slice(0,10))>=cutoff-3*day).at(-1);
 const change=!stale&&base&&base.value>0?Math.round((latest.value/base.value-1)*10000)/100:null;
 return {target:t,latest,base,change,stale,points:all,reason:stale?'Reading older than 3 days':!base?'Building '+period+'-day history':base.value<=0?'Zero baseline cannot give percentage change':null};
}
function rankings(saved,provider,period,now=Date.now()){
 const rows=saved.targets.map(t=>summary(t,provider,period,now));
 const fresh=rows.filter(r=>r.latest&&!r.stale),measured=fresh.filter(r=>r.change!==null);
 return {rows,volume:fresh.filter(r=>Number.isFinite(r.latest.annualVolume)).sort((a,b)=>b.latest.annualVolume-a.latest.annualVolume).slice(0,10),rising:measured.filter(r=>r.change>0).sort((a,b)=>b.change-a.change).slice(0,10),falling:measured.filter(r=>r.change<0).sort((a,b)=>a.change-b.change).slice(0,10),research:measured.filter(r=>r.change>0&&r.latest.annualVolume>=20).sort((a,b)=>b.change-a.change).slice(0,10)};
}
const api={empty,validate,apply,summary,rankings,starters};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetroMarket=api;
})(typeof globalThis!=='undefined'?globalThis:this);
