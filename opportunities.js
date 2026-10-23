/* Potential CeX cash resale estimates, never automatic purchases or guaranteed payouts. */
(function(root){
'use strict';
const categories=['Games','Consoles','Accessories'],costs=['purchase','shipping','buyerFees','destination','repair','risk'];
const amount=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
function evaluate(row,now=Date.now()){
 const reasons=[];if(!categories.includes(row.category))reasons.push('Choose category');
 if(!row.identityConfirmed||!row.platform||!row.condition||!row.completeness)reasons.push('Confirm exact identity, platform, condition and completeness');
 if(!row.cex?.verified||!row.cex.productId||!amount(row.cex.cash)||!row.cex.product)reasons.push('Verified CeX cash evidence required');
 const age=now-Date.parse(row.cex?.checkedAt);if(!Number.isFinite(age)||age<0||age>86400000)reasons.push('Refresh CeX cash evidence (24 hour limit)');
 const offerAge=now-Date.parse(row.checkedAt);if(!Number.isFinite(offerAge)||offerAge<0||offerAge>86400000)reasons.push('Recheck purchase offer (24 hour limit)');
 if(row.source==='eBay Browse'&&row.environment!=='production')reasons.push('Production market evidence required');
 if(!row.available||!row.fixedPrice||row.currency!=='GBP')reasons.push('Available GBP fixed-price offer required');
 if(!/^https:\/\/(?:www\.)?ebay\.co\.uk\/itm\//i.test(row.url||''))reasons.push('Valid eBay UK offer link required');
 if(!costs.every(k=>amount(row.costs?.[k])))reasons.push('Enter every landed cost, including explicit zero');
 if(reasons.length)return {eligible:false,reasons,profit:null,landed:null,roi:null};
 const landed=Math.round(costs.reduce((s,k)=>s+row.costs[k],0)*100)/100,profit=Math.round((row.cex.cash-landed)*100)/100;
 const minimum=amount(row.minProfit)?row.minProfit:2,roi=landed?profit/landed*100:null;
 if(profit<minimum)reasons.push('Below minimum cash profit');
 return {eligible:!reasons.length,reasons,landed,profit,roi};
}
function top(rows,category,now=Date.now()){return rows.filter(r=>r.category===category).map(row=>({row,...evaluate(row,now)})).filter(r=>r.eligible).sort((a,b)=>b.profit-a.profit||b.roi-a.roi).slice(0,10);}
const api={categories,costs,evaluate,top};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetroOpportunities=api;
})(typeof globalThis!=='undefined'?globalThis:this);
