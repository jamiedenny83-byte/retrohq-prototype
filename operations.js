/* Inventory operations. Missing dates/costs remain unknown. */
(function(root){
'use strict';
const round=n=>Math.round(n*100)/100;
const amount=n=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n))&&Number(n)>=0;
const active=i=>!i.sale&&!['Sold','Packaged','Dispatched','Delivered','Completed'].includes(i.status);
function age(value,now=new Date().toISOString()){if(!value)return null;const a=Date.parse(value),b=Date.parse(now);return Number.isFinite(a)&&Number.isFinite(b)&&a<=b?Math.floor((b-a)/86400000):null;}
function economics(i){
 const s=i.sale;if(!s||s.reviewNeeded||!s.costsConfirmed||(i.returns||[]).length||(i.saleHistory||[]).length)return {profit:null,margin:null,roi:null,net:null};
 const fields=[s.price,s.feeValue,s.shipping,s.packaging,s.shippingRevenue,s.promotion,i.buy,i.processingCosts];
 if(!fields.every(amount))return {profit:null,margin:null,roi:null,net:null};
 const revenue=Number(s.price)+Number(s.shippingRevenue),fee=s.feeType==='percent'?Number(s.price)*Number(s.feeValue)/100:Number(s.feeValue),net=round(revenue-fee-Number(s.shipping)-Number(s.packaging)-Number(s.promotion)),invested=Number(i.buy)+Number(i.processingCosts),profit=round(net-invested);
 return {profit,net,margin:revenue?profit/revenue*100:0,roi:invested?profit/invested*100:null};
}
function queue(items,now){return items.filter(active).map(i=>({item:i,days:age(i.acquiredDate,now),listedDays:age(i.listing?.date,now),issues:[...(!i.acquiredDate?['Acquisition date missing']:[]),...(!i.location||i.location==='Unassigned'?['Storage location missing']:[]),...(i.needsValuation?['Value needed']:[])]})).sort((a,b)=>(b.days??-1)-(a.days??-1));}
function batches(items){const groups=new Map();for(const i of items){if(!i.batchId)continue;let g=groups.get(i.batchId);if(!g){g={id:i.batchId,name:i.batchName||i.batchId,items:[],investment:0,recovered:0,profit:0,pending:0,sold:0};groups.set(i.batchId,g);}g.items.push(i);g.investment+=Number(i.buy)||0;const e=economics(i);if(i.sale){g.sold++;if(e.profit===null)g.pending++;else{g.recovered+=e.net;g.profit+=e.profit;}}else if(i.saleHistory?.length||i.returns?.length)g.pending++;}return [...groups.values()].map(g=>({...g,investment:round(g.investment),recovered:round(g.recovered),profit:round(g.profit),remaining:round(Math.max(0,g.investment-g.recovered))}));}
function recommendation(i,market,feePercent,margin,now){
 if(!active(i)||!i.listing)return {action:'Prepare listing',price:null};
 if(age(i.listing.date,now)===null)return {action:'Record listing date before reviewing age',price:null};
 if(age(i.listing.date,now)<30)return {action:'Keep current price; review after 30 days',price:null};
 const c=i.buyingEstimate?.costs||{},values=[market,feePercent,margin,i.buy,i.processingCosts,c.postage,c.packaging];
 if(!values.every(amount)||feePercent+margin>=100||i.needsValuation)return {action:'Refresh value and selling costs before changing price',price:null};
 const floor=Math.ceil((Number(i.buy)+Number(i.processingCosts)+Number(c.postage)+Number(c.packaging))/(1-feePercent/100-margin/100)*100)/100;
 const price=round(Math.max(floor,Number(market)));return {action:price<Number(i.listing.price)?'Review a lower asking price':'Review photos, completeness and demand before reducing',price,floor};
}
const api={age,active,economics,queue,batches,recommendation};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetroOps=api;
})(typeof globalThis!=='undefined'?globalThis:this);
