/* Generic current-stock CSV. Only explicitly mapped stock fields are retained. */
(function(root){
'use strict';
const plain=(s,n=180)=>String(s||'').replace(/[<>"`\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
function parse(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>2*1024*1024)throw Error('Choose a stock CSV under 2 MB.');text=text.replace(/^\uFEFF/,'');
 const header=text.split(/\r?\n/)[0]||'',delimiter=[';',',','\t'].sort((a,b)=>header.split(b).length-header.split(a).length)[0];
 const rows=[];let row=[],field='',quote=false;
 for(let n=0;n<text.length;n++){const ch=text[n];if(ch==='"'){if(quote&&text[n+1]==='"'){field+='"';n++;}else quote=!quote;}else if(ch===delimiter&&!quote){row.push(field);field='';}else if((ch==='\n'||ch==='\r')&&!quote){if(ch==='\r'&&text[n+1]==='\n')n++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field='';}else field+=ch;}
 if(quote)throw Error('CSV has an unfinished quoted field.');row.push(field);if(row.some(x=>x.trim()))rows.push(row);
 if(rows.length<2||rows.length>1001)throw Error('Choose a header and 1–1,000 stock rows.');const headers=rows.shift().map(x=>plain(x,100));if(headers.some(h=>/order.?id|sale.?date|transaction.?id/i.test(h))&&!headers.some(h=>/stock|in stock/i.test(h)))throw Error('This looks like a sales export. Choose a current-stock CSV.');if(new Set(headers).size!==headers.length)throw Error('CSV column headings must be unique.');return {headers,rows};
}
const fields={title:['item name','product name','name','title','description'],quantity:['quantity','stock','stock quantity','in stock'],sku:['sku','product code','item code','stock code'],barcode:['barcode','ean','upc'],buy:['cost price','purchase price','unit cost','buy'],market:['selling price','retail price','price','market value'],location:['location','shelf'],condition:['condition'],listingId:['ebay listing id','listing id'],currency:['currency','currency code']};
function suggest(headers){const result={};for(const [k,names]of Object.entries(fields))result[k]=headers.findIndex(h=>names.includes(h.toLowerCase()));return result;}
function preview(data,mapping){
 if(!Number.isInteger(mapping.title)||mapping.title<0)throw Error('Map the item-name column first.');
 const value=(row,k)=>mapping[k]>=0?String(row[mapping[k]]||'').trim():'';
 const amount=v=>{if(!v)return null;const cleaned=v.replace(/^[£\s]+/,'');if(cleaned.includes(',')&&!/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned))throw Error('Use GBP prices with decimal points.');const n=Number(cleaned.replace(/,/g,''));if(!Number.isFinite(n)||n<0)throw Error('Invalid price.');return Math.round(n*100)/100;};
 return data.rows.map((r,n)=>{try{const currency=value(r,'currency').toUpperCase();if(currency&&!['GBP','£'].includes(currency))throw Error('This stock import accepts GBP only.');const title=plain(value(r,'title'));if(!title)throw Error('Missing item name.');const raw=value(r,'quantity');if(raw===''&&mapping.quantity>=0)throw Error('Missing quantity.');const quantity=raw===''?1:Number(raw);if(!Number.isSafeInteger(quantity)||quantity<0||quantity>2000)throw Error('Invalid quantity.');const listingId=value(r,'listingId');if(listingId&&!/^\d+$/.test(listingId))throw Error('Invalid eBay listing ID.');return {row:n+2,title,quantity,sku:plain(value(r,'sku')),barcode:plain(value(r,'barcode'),40),buy:amount(value(r,'buy')),market:amount(value(r,'market')),location:plain(value(r,'location'))||'Unassigned',condition:plain(value(r,'condition'))||'Unknown',listingId,error:null};}catch(e){return {row:n+2,error:e.message};}});
}
function unit(r,id,hash,date){const i={id,title:r.title,category:'Uncategorised',manufacturer:'',source:'CSV import',importedFrom:'stock-csv',stockSku:r.sku,barcode:r.barcode,buy:r.buy,processingCosts:null,baseMarket:r.market,marketIsConditionSpecific:true,needsValuation:r.market===null,needsIdentification:true,condition:r.condition,acquiredCondition:r.condition,location:r.location,status:r.listingId?'Listed':'Acquired',notes:'',photos:0,velocity:0,listing:null,sale:null,csvImportHash:hash,timeline:[['CSV stock imported',date+' · source row '+r.row+' · costs not supplied remain unknown']]};if(r.listingId){i.liveListingId=r.listingId;i.liveSku=r.sku;}return i;}
function apply(state,rows,hash,date){
 if(!Array.isArray(rows)||!rows.length||!/^[a-f0-9]{64}$/.test(hash)||rows.some(r=>r.error||typeof r.title!=='string'||r.title!==plain(r.title)||!Number.isSafeInteger(r.quantity)||r.quantity<0||!Number.isSafeInteger(r.row)||!['buy','market'].every(k=>r[k]===null||Number.isFinite(r[k])&&r[k]>=0)))throw Error('Resolve CSV errors before importing.');
 const next=JSON.parse(JSON.stringify(state));next.stockCsv=next.stockCsv||{imports:[],quarantine:[]};
 if(next.stockCsv.imports.some(x=>x.hash===hash))throw Error('This exact CSV has already been imported.');
 if(rows.reduce((n,r)=>n+r.quantity,0)>2000)throw Error('Import at most 2,000 physical units at a time.');
 const seen=new Set(),itemIds=[];let id=Math.max(0,...next.items.map(i=>i.id));
 for(const r of rows){const key=r.listingId?'ebay:'+r.listingId+':'+r.sku:r.sku?'sku:'+r.sku:'csv:'+hash+':'+r.row;
  if(seen.has(key)||r.listingId&&next.items.some(i=>i.liveListingId===r.listingId&&(i.liveSku||'')===r.sku)||r.sku&&next.items.some(i=>i.stockSku===r.sku)){next.stockCsv.quarantine.push({hash,row:r.row,key,record:r,reason:'Existing stock identity or repeated CSV row; no units added'});continue;}seen.add(key);
  for(let n=0;n<r.quantity;n++){const i=unit(r,++id,hash,date);next.items.push(i);itemIds.push(i.id);}
 }
 next.stockCsv.imports.push({hash,date,itemIds});return next;
}
function release(state,index,date){
 const next=JSON.parse(JSON.stringify(state)),row=next.stockCsv?.quarantine[index];if(!row||row.resolvedAt)throw Error('This CSV row has already been resolved.');const r=row.record,entry=next.stockCsv.imports.find(x=>x.hash===row.hash);
 if(!entry||!Number.isSafeInteger(r.quantity)||r.quantity<1||r.quantity>2000||r.title!==plain(r.title))throw Error('Invalid quarantined CSV quantity.');let id=Math.max(0,...next.items.map(i=>i.id));for(let n=0;n<r.quantity;n++){const i=unit(r,++id,row.hash,date);delete i.liveListingId;delete i.liveSku;i.listing=null;i.status='Acquired';i.timeline.push(['CSV duplicate reviewed','Confirmed separate unlisted physical unit.']);next.items.push(i);entry.itemIds.push(i.id);}row.resolvedAt=date;return next;
}
const api={parse,fields,suggest,preview,apply,release};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetroStockCsv=api;
})(typeof globalThis!=='undefined'?globalThis:this);
