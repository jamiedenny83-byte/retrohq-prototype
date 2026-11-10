/* Route-specific resale estimates. Purchase and payout use separate evidence. */
(function(root){
'use strict';
const categories=['Games','Consoles','Accessories'],costs=['purchase','shipping','buyerFees','destination','repair','risk'];
const amount=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const routes={
 'ebay-cex':{buy:'eBay',sell:'CeX cash',cexRole:'sell'},
 'cex-ebay':{buy:'CeX retail',sell:'eBay',cexRole:'buy'},
 'ebay-store':{buy:'eBay',sell:'In store'},
 'cex-store':{buy:'CeX retail',sell:'In store',cexRole:'buy'}
};
const route=row=>Object.hasOwn(routes,row.route)?routes[row.route]:routes['ebay-cex'];
function routeLabel(row){
 const selected=route(row);
 const buy=selected.buy==='eBay'?'Buy on eBay':'Buy from CeX retail';
 const sell={eBay:'Sell on eBay','CeX cash':'Sell to CeX for cash','In store':'Sell in store'}[selected.sell];
 return buy+' → '+sell;
}
const needsEditionCheck=title=>/\b(?:\d{2,}\s*[- ]?in\s*[- ]?1|multicart|reproduction|repro cartridge)\b/i.test(title||'');
const requiredCosts=row=>route(row).sell==='CeX cash'?costs:[...costs,'sellerFees'];
const fresh=(date,now)=>{const age=now-Date.parse(date);return Number.isFinite(age)&&age>=0&&age<=86400000;};
function estimate(row){
 const chosen=route(row),purchase=chosen.cexRole==='buy'?row.cex?.retail:row.costs?.purchase;
 const proceeds=chosen.cexRole==='sell'?row.cex?.cash:row.expectedSale;
 const values=requiredCosts(row).map(key=>key==='purchase'?purchase:row.costs?.[key]);
 const known=values.reduce((total,value)=>total+(amount(value)?Math.round(value*100):0),0);
 const complete=values.every(amount);
 const landed=complete?known/100:null;
 const knownNet=amount(purchase)&&amount(proceeds)?(Math.round(proceeds*100)-known)/100:null;
 return {purchase,proceeds,landed,knownNet,profit:complete?knownNet:null};
}
function evaluate(row,now=Date.now()){
 const chosen=route(row);
 const reasons=[];if(!categories.includes(row.category))reasons.push('Choose category');
 if(row.route!==undefined&&!Object.hasOwn(routes,row.route))reasons.push('Choose a supported resale route');
 if(!row.identityConfirmed||!row.platform||!row.condition||!row.completeness)reasons.push('Confirm exact identity, platform, condition and completeness');
 if(needsEditionCheck(row.sourceTitle)||needsEditionCheck(row.title))reasons.push('Multicart or reproduction wording requires separate edition review');
 if(chosen.cexRole){
  const quoted=chosen.cexRole==='sell'?row.cex?.verified&&amount(row.cex.cash):row.cex?.retailVerified&&amount(row.cex.retail)&&row.cex.retail>0;
  if(!quoted||!row.cex?.productId||!row.cex?.product)reasons.push('Select an exact CeX '+(chosen.cexRole==='sell'?'cash quote':'retail price'));
  if(!fresh(row.cex?.checkedAt,now))reasons.push('Refresh the CeX quote (24 hour limit)');
 }
 if(chosen.cexRole!=='sell'&&(!amount(row.expectedSale)||row.expectedSale<=0||!String(row.saleEvidence||'').trim()||!fresh(row.saleCheckedAt,now)))reasons.push('Confirm a sale estimate and its evidence (24 hour limit)');
 if(!fresh(row.checkedAt,now))reasons.push('Recheck purchase offer (24 hour limit)');
 if(row.source==='eBay Browse'&&row.environment!=='production')reasons.push('Production market evidence required');
 if(!row.available||!row.fixedPrice||row.currency!=='GBP')reasons.push('Available GBP fixed-price offer required');
 if(chosen.buy==='eBay'&&!/^https:\/\/(?:www\.)?ebay\.co\.uk\/itm\/[a-zA-Z0-9/?&=._%+-]+$/.test(row.url||''))reasons.push('Valid eBay UK offer link required');
 const {landed,profit}=estimate(row);
 if(landed===null)reasons.push('Enter every cost, including explicit zero');
 if(reasons.length)return {eligible:false,reasons,profit:null,landed:null,roi:null};
 const minimum=amount(row.minProfit)?row.minProfit:2,roi=landed?profit/landed*100:null;
 if(profit<=0||profit<minimum)reasons.push('Below minimum profit');
 return {eligible:!reasons.length,reasons,landed,profit,roi};
}
function top(rows,category,now=Date.now()){return rows.filter(r=>r.category===category).map(row=>({row,...evaluate(row,now)})).filter(r=>r.eligible).sort((a,b)=>b.profit-a.profit||b.roi-a.roi).slice(0,10);}
const api={categories,costs,routes,route,routeLabel,needsEditionCheck,requiredCosts,estimate,evaluate,top};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetroOpportunities=api;
})(typeof globalThis!=='undefined'?globalThis:this);
