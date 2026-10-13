/* Portable backups; restore is replacement, never a merge of sales ledgers. */
(function(root){
'use strict';
const fields=['items','customers','settings','creditIssued','researchHistory','ebaySync'];
const maxBytes=5*1024*1024;
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const fail=message=>{throw Error(message);};
function validate(state){
 if(!object(state)||!Array.isArray(state.items)||!Array.isArray(state.customers)||!object(state.settings)||!object(state.settings.fees))fail('This file is missing inventory, accounts or settings.');
 function walk(x,key='',depth=0){
  if(depth>30)fail('Backup nesting is too deep.');
  if(typeof x==='string'&&(/[<>`\u0000-\u0008]/.test(x)||(!['externalKey','key'].includes(key)&&x.includes('"'))||/^\s*javascript:/i.test(x)))fail('Some backup text contains unsupported markup or quotation characters. Nothing was restored.');
  if(typeof x==='number'&&!Number.isFinite(x))fail('Invalid number in backup.');
  if(x&&typeof x==='object')for(const [k,v]of Object.entries(x)){
   if(['__proto__','prototype','constructor'].includes(k))fail('Unsupported object field in backup.');walk(v,k,depth+1);
  }
 }
 walk(state);
 const ids=new Set();
 for(const i of state.items){
  if(!object(i)||!Number.isSafeInteger(i.id)||ids.has(i.id)||typeof i.title!=='string'||!i.title.trim()||typeof i.status!=='string'||!Array.isArray(i.timeline)||i.timeline.some(t=>!Array.isArray(t)||t.length<2||t.some(v=>typeof v!=='string')))fail('Invalid or duplicate inventory record.');
  if(i.photoData!=null&&!(typeof i.photoData==='string'&&i.photoData.length<=250000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(i.photoData)))fail('Invalid reference photo.');
  ids.add(i.id);
  for(const k of ['buy','processingCosts'])if(typeof i[k]!=='number'||!Number.isFinite(i[k])||i[k]<0)fail('Invalid purchase or processing cost.');
  if(i.sale!=null&&(!object(i.sale)||typeof i.sale.price!=='number'||i.sale.price<0||typeof i.sale.date!=='string'))fail('Invalid sale record.');
 }
 const customerIds=new Set();
 for(const c of state.customers){if(!object(c)||!Number.isSafeInteger(c.id)||customerIds.has(c.id)||typeof c.name!=='string'||!Number.isFinite(c.credit)||!Array.isArray(c.ledger))fail('Invalid trade account.');customerIds.add(c.id);}
 for(const k of ['offerPct','storeCreditBonus','greenMargin','yellowMargin'])if(!Number.isFinite(state.settings[k]))fail('Invalid business settings.');
 for(const fee of Object.values(state.settings.fees))if(!object(fee)||!['fixed','percent'].includes(fee.type)||!Number.isFinite(fee.value)||fee.value<0)fail('Invalid fee settings.');
 if(!Number.isFinite(state.creditIssued))fail('Invalid credit total.');
 const sync=state.ebaySync;
 if(sync!=null&&(!object(sync)||!Array.isArray(sync.lines)))fail('Invalid sales import history.');
 const keys=new Set();
 for(const row of sync?.lines||[]){
  if(!object(row)||typeof row.key!=='string'||keys.has(row.key)||!object(row.latest)||!Array.isArray(row.itemIds)||row.itemIds.some(id=>!ids.has(id))||new Set(row.itemIds).size!==row.itemIds.length)fail('Invalid or duplicate order history.');
  if(row.key!==JSON.stringify(['ebay','sandbox',row.latest.orderId,row.latest.lineItemId]))fail('Order identity does not match its history.');
  if(row.imported&&(!object(row.imported)||row.itemIds.length!==row.imported.quantity))fail('Incomplete stock allocation in order history.');
  keys.add(row.key);
 }
 for(const i of state.items)if(i.sale?.externalKey){const row=sync?.lines.find(r=>r.key===i.sale.externalKey);if(!row?.imported||row.outcome||!row.itemIds.includes(i.id))fail('A sale is missing its duplicate-protection history.');}
 for(const row of sync?.lines||[])if(row.imported&&!row.outcome&&row.itemIds.some(id=>state.items.find(i=>i.id===id)?.sale?.externalKey!==row.key))fail('Order history and stock do not agree.');
 const clean={};for(const k of fields)if(state[k]!==undefined)clean[k]=state[k];return clean;
}
function pack(state,mode){return JSON.stringify({format:'retrohq-backup',version:2,workspace:mode,exportedAt:new Date().toISOString(),state});}
function parse(text,mode){
 if(new TextEncoder().encode(text).length>maxBytes)fail('Backup exceeds the 5 MB limit.');
 let data;try{data=JSON.parse(text);}catch{fail('This is not a valid JSON backup.');}
 if(!object(data))fail('Unsupported backup.');
 const legacy=data.version===1&&data.format===undefined;
 if(!legacy&&(data.version!==2||data.format!=='retrohq-backup'||!['demo','saved'].includes(data.workspace)))fail('Unsupported backup version.');
 const state=validate(data.state);
 const demo=state.items.some(i=>i.source==='Demo fixture')||(state.ebaySync?.lines||[]).some(r=>String(r.latest.orderId).startsWith('DEMO-'));
 const workspace=legacy?(demo?'demo':'saved'):data.workspace;
 if(workspace!==mode||(mode==='saved'&&demo))fail('Demo and saved-workspace backups must be restored in their matching workspace.');
 return {state,legacy,exportedAt:data.exportedAt||null,items:state.items.length,sales:state.items.filter(i=>i.sale).length,accounts:state.customers.length};
}
function restore(storage,workspace,key,state){
 // Recovery copy must succeed before replacing anything. A failed final save leaves current stock intact.
 const previous=storage.getItem(key);if(!previous)fail('No current workspace to protect.');
 storage.setItem(key+'.before-restore',previous);
 workspace.save(state);
 return previous;
}
const api={fields,maxBytes,validate,pack,parse,restore};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetroBackup=api;
})(typeof globalThis!=='undefined'?globalThis:this);
