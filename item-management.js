(function(root){
'use strict';
const sold=i=>!!i.sale||['Sold','Packaged','Dispatched','Delivered','Completed'].includes(i.status);
const steps=['Acquired','Preparing','Ready to list'];
const stage=i=>steps.includes(i.status)?i.status:i.status?.startsWith('Needs')?'Preparing':i.status;
function transition(item,direction){
 if(sold(item)||item.status==='Listed')throw Error('Sales and listing status are managed outside processing.');
 const current=stage(item),index=steps.indexOf(current);if(index<0)throw Error('Review this item status first.');
 const next=steps[Math.max(0,Math.min(steps.length-1,index+direction))];
 const copy=JSON.parse(JSON.stringify(item));if(next!==current){copy.status=next;copy.timeline.push(['Processing',current+' → '+next]);}return copy;
}
function edit(item,input,now){
 if(sold(item)&&input.valueChanged)throw Error('A sold item keeps its valuation; correct its costs or location only.');
 const number=(v,optional)=>{if(v==null||String(v).trim()===''){if(optional)return null;throw Error('Enter the purchase price, including zero for a free item.');}const n=Number(v);if(!Number.isFinite(n)||n<0)throw Error('Prices must be zero or positive.');return Math.round(n*100)/100;};
 const buy=number(input.buy,['ebay-production','stock-csv'].includes(item.importedFrom)),value=number(input.value,true),copy=JSON.parse(JSON.stringify(item));
 const text=v=>{const t=String(v||'').trim();if(/[<>"`\u0000-\u0008]/.test(t))throw Error('Use plain text without markup or double quotation marks.');return t;};
 const area=text(input.area),shelf=text(input.shelf),notes=text(input.notes);
 copy.editHistory=copy.editHistory||[];copy.editHistory.push({date:now,before:{buy:item.buy,baseMarket:item.baseMarket??null,valuation:item.valuation||null,area:item.area||'',shelf:item.shelf||'',location:item.location||'',notes:item.notes||''}});
 if(item.buy!==buy)copy.timeline.push(['Purchase price corrected',(item.buy===null?'Unknown':'£'+Number(item.buy).toFixed(2))+' → '+(buy===null?'Unknown':'£'+buy.toFixed(2))]);
 copy.buy=buy;if(input.processingCosts!==undefined){copy.editHistory.at(-1).before.processingCosts=item.processingCosts;copy.processingCosts=number(input.processingCosts,['ebay-production','stock-csv'].includes(item.importedFrom));}
 if(input.valueChanged){
  copy.baseMarket=value;copy.marketIsConditionSpecific=true;copy.needsValuation=value===null;
  copy.valuation={...(copy.valuation||{}),finalValue:value,source:'Manual inventory edit',confidence:value===null?'unknown':'manual',timestamp:now,stale:value===null,staleReasons:value===null?['Value cleared by user']:[],recommendedMax:value===null?null:Math.round(value*Number(input.offerPct)/100*100)/100};
  copy.timeline.push(['Value updated',value===null?'Value cleared; valuation required.':'Manual current value £'+value.toFixed(2)]);
 }
 copy.area=area;copy.shelf=shelf;copy.location=[area,shelf].filter(Boolean).join(' / ')||'Unassigned';copy.notes=notes;copy.timeline.push(['Details edited',now]);return copy;
}
const api={sold,steps,stage,transition,edit};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetroItems=api;
})(typeof globalThis!=='undefined'?globalThis:this);
