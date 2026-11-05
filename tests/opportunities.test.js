const {test}=require('node:test'),assert=require('node:assert/strict'),O=require('../opportunities');
const now=Date.parse('2026-10-23T12:00:00Z');
const row=()=>({category:'Games',identityConfirmed:true,platform:'PS2',condition:'Good complete',completeness:'PAL boxed with manual',source:'eBay Browse',environment:'production',currency:'GBP',fixedPrice:true,available:true,url:'https://www.ebay.co.uk/itm/123',checkedAt:new Date(now).toISOString(),cex:{verified:true,cash:30,productId:'CEX1',product:'Exact game',checkedAt:new Date(now).toISOString()},costs:{purchase:15,shipping:2,buyerFees:1,destination:1,repair:1,risk:2},minProfit:2});
test('all landed costs use CeX cash, never retail or voucher payout',()=>{const r=row();r.cex.retail=80;r.cex.voucher=40;const x=O.evaluate(r,now);assert.equal(x.landed,22);assert.equal(x.profit,8);assert.equal(x.eligible,true);});
test('unknown or stale evidence, auctions, Sandbox and unconfirmed identity stay out of Top10',()=>{for(const change of [r=>r.costs.shipping=null,r=>r.costs.buyerFees=undefined,r=>r.cex.cash=null,r=>r.cex.verified=false,r=>r.cex.checkedAt='2026-10-21',r=>r.checkedAt='2026-10-21',r=>r.fixedPrice=false,r=>r.environment='sandbox',r=>r.identityConfirmed=false,r=>r.currency='USD',r=>r.url='javascript:alert(1)',r=>r.costs.purchase=-1]){const r=row();change(r);assert.equal(O.evaluate(r,now).eligible,false);assert.equal(O.top([r],'Games',now).length,0);}});
test('rank separately per category by cash profit, cap at 10 and respect lower B2B target',()=>{const rows=Array.from({length:14},(_,n)=>({...row(),id:String(n),costs:{...row().costs,purchase:n}}));rows.push({...row(),category:'Consoles'});const t=O.top(rows,'Games',now);assert.equal(t.length,10);assert.equal(t[0].row.id,'0');assert.equal(O.top(rows,'Consoles',now).length,1);const r=row();r.costs.purchase=21;assert.equal(O.evaluate(r,now).eligible,true);r.minProfit=3;assert.equal(O.evaluate(r,now).eligible,false);});
test('a £13.99 eBay purchase with £1.50 CeX cash shows the £12.49 loss before extra costs',()=>{
 const r={...row(),title:'510 in 1 DS Game',costs:{purchase:13.99,shipping:0},cex:{...row().cex,cash:1.50}};
 assert.equal(O.estimate(r).knownNet,-12.49);
 assert.equal(O.estimate(r).profit,null);
 assert.match(O.evaluate(r,now).reasons.join(' '),/Multicart/);
 assert.equal(O.top([r],'Games',now).length,0);
});
test('CeX purchase uses retail and the selected eBay or in-store exit uses a checked sale estimate',()=>{
 const initial=row(),r={...initial,route:'cex-ebay',source:'CeX catalogue',url:'',expectedSale:30,saleEvidence:'Recent completed sales',
  saleCheckedAt:initial.checkedAt,cex:{...initial.cex,retail:15,retailVerified:true,cash:1.50},
  costs:{purchase:1.50,shipping:1,buyerFees:0,destination:2,repair:0,risk:1,sellerFees:3}};
 assert.equal(O.evaluate(r,now).profit,8);
 assert.equal(O.evaluate({...r,route:'cex-store'},now).profit,8);
 assert.equal(O.evaluate({...r,route:'ebay-store',url:initial.url},now).profit,21.5);
 assert.equal(O.evaluate({...r,saleEvidence:''},now).eligible,false);
 assert.equal(O.evaluate({...r,cex:{...r.cex,retailVerified:false}},now).eligible,false);
});
