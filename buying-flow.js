/* Acquisition estimates are snapshots, never actual sale profit. */
(function(root){
'use strict';
const amount=x=>x==null||String(x).trim()===''?null:Number(x);
function estimate(value,paid,costs,rate){
 const price=amount(value),buy=amount(paid),c={};
 for(const k of ['feePercent','postage','packaging','preparation'])c[k]=amount(costs?.[k]);
 const invalid=[price,buy,...Object.values(c)].some(x=>x!==null&&(!Number.isFinite(x)||x<0))||c.feePercent>100;
 if(invalid)return {ready:false,reason:'Enter non-negative amounts and a fee percentage from 0 to 100.'};
 if(price===null||Object.values(c).some(x=>x===null))return {ready:false,reason:'Add a selling estimate and all costs, including explicit zeroes, to calculate profit.'};
 const fees=price*c.feePercent/100,total=fees+c.postage+c.packaging+c.preparation,net=price-total;
 const maxBuy=Math.max(0,Math.min(price*rate/100,net));
 return {ready:true,price,paid:buy,costs:c,fees,total,net,maxBuy,profit:buy===null?null:net-buy,decision:buy===null?'Enter asking price':buy<=maxBuy?'Inside buying target':'Over buying target'};
}
function validPhoto(x){return typeof x==='string'&&x.length<=250000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(x);}
const api={estimate,validPhoto};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetroBuying=api;
})(typeof globalThis!=='undefined'?globalThis:this);
