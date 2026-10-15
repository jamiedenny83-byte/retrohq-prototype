/* Transaction amounts use integer pennies. Credit is payment, not a discount. */
(function(root){
'use strict';
const available=i=>!!i&&!i.sale&&!['Sold','Packaged','Dispatched','Delivered','Completed'].includes(i.status);
function pennies(value,label){if(value==null||String(value).trim()==='')throw Error('Enter '+label+'.');const n=Number(value);if(!Number.isFinite(n)||n<0||n>10000000)throw Error('Invalid '+label+'.');return Math.round(n*100);}
function allocate(total,weights){const sum=weights.reduce((a,b)=>a+b,0);if(!sum){if(total)throw Error('Cannot allocate an amount to a zero-total basket.');return weights.map(()=>0);}const rows=weights.map((w,index)=>({index,value:Math.floor(total*w/sum),fraction:total*w/sum%1}));let left=total-rows.reduce((a,r)=>a+r.value,0);for(const r of [...rows].sort((a,b)=>b.fraction-a.fraction||a.index-b.index)){if(!left)break;r.value++;left--;}return rows.map(r=>r.value);}
function quote(state,input){
 if(!Array.isArray(input.lines)||!input.lines.length)throw Error('Add an item to the sale.');
 const ids=new Set(),prices=input.lines.map(line=>{if(ids.has(line.id))throw Error('An item appears twice.');ids.add(line.id);if(!available(state.items.find(i=>i.id===line.id)))throw Error('An item is no longer available.');return pennies(line.price,'each sale price');});
 if(!Object.hasOwn(state.settings.fees,input.channel))throw Error('Choose a valid channel.');
 const subtotal=prices.reduce((a,b)=>a+b,0),discountValue=pennies(input.discount,'discount');
 if(!['fixed','percent'].includes(input.discountType)||!['fixed','percent'].includes(input.feeType))throw Error('Invalid fee or discount type.');
 if(input.discountType==='percent'&&discountValue>10000)throw Error('Discount cannot exceed 100%.');
 const discount=input.discountType==='percent'?Math.round(subtotal*discountValue/10000):discountValue;
 if(discount>subtotal)throw Error('Discount exceeds the basket total.');
 const discountParts=allocate(discount,prices),nets=prices.map((p,n)=>p-discountParts[n]),total=subtotal-discount;
 const feeValue=pennies(input.feeValue,'fee');if(input.feeType==='percent'&&feeValue>10000)throw Error('Fee cannot exceed 100%.');
 const fee=input.feeType==='percent'?Math.round(total*feeValue/10000):feeValue,credit=pennies(input.credit,'trade credit');
 const customer=input.customerId?state.customers.find(c=>c.id===input.customerId):null;
 if(input.customerId&&!customer)throw Error('Trade account not found.');
 if(credit&&!customer)throw Error('Select the trade account to redeem credit.');
 if(credit>total||customer&&credit>pennies(customer.credit,'account balance'))throw Error('Trade credit exceeds the balance or sale total.');
 const fees=allocate(fee,nets),credits=allocate(credit,nets);
 return {subtotal,discount,total,fee,credit,due:total-credit,lines:input.lines.map((line,n)=>({id:line.id,listedPrice:prices[n],discount:discountParts[n],price:nets[n],fee:fees[n],credit:credits[n]}))};
}
function complete(state,input,id,date){
 if(!id||(state.transactions||[]).some(t=>t.id===id))throw Error('This transaction has already been saved.');
 const receipt=quote(state,input),next=JSON.parse(JSON.stringify(state)),collected=['In Store EPOS','Manual / Cash'].includes(input.channel);
 for(const line of receipt.lines){const item=next.items.find(i=>i.id===line.id);item.sale={transactionId:id,channel:input.channel,price:line.price/100,originalPrice:line.listedPrice/100,discount:line.discount/100,feeType:'fixed',feeValue:line.fee/100,creditUsed:line.credit/100,customerId:input.customerId||null,shipping:0,packaging:0,date,status:collected?'Collected in store':'Ready to dispatch'};item.status=collected?'Completed':'Sold';item.timeline.push(['Sold',input.channel+' · transaction '+id+' · £'+(line.price/100).toFixed(2)]);if(collected)item.timeline.push(['Completed','Collected in store.']);}
 if(receipt.credit){const c=next.customers.find(c=>c.id===input.customerId);c.credit=(pennies(c.credit,'balance')-receipt.credit)/100;c.ledger.push([date,'Trade credit redeemed · transaction '+id,-receipt.credit/100]);}
 next.transactions=next.transactions||[];next.transactions.push({...receipt,id,date,channel:input.channel,customerId:input.customerId||null,currency:'GBP',amountUnit:'pence'});
 return next;
}
const api={available,quote,complete,allocate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetroCheckout=api;
})(typeof globalThis!=='undefined'?globalThis:this);
