/* The till quotes and saves through the shared stock checkout. */
(function(root){
'use strict';
const channel='In Store EPOS';
const groups=[['all','All stock'],['games','Games'],['consoles','Consoles'],['accessories','Accessories'],['other','Other']];
const conditions=[['all','All conditions'],['new','New'],['used','Used']];
function stockGroup(item){
 const category=String(item.category||'').toLowerCase().split(/:|>/).at(-1).trim();
 if(/accessor|controller/.test(category))return 'accessories';
 if(/console|hardware/.test(category)&&!/video games?\s*&\s*consoles?/.test(category))return 'consoles';
 if(/video games?|software/.test(category))return 'games';
 return 'other';
}
function stockCondition(item){
 const condition=String(item.condition||'').trim().toLowerCase();
 if(/^(?:brand[ -]new|new|sealed|factory[ -]sealed)\b/.test(condition))return 'new';
 if(/used|pre[ -]owned|excellent|mint|good|fair|poor|acceptable|like new|as new|unboxed|discounted|refurbished|for parts/.test(condition))return 'used';
 return 'unknown';
}
function filterStock(items,{query='',group='all',condition='all',selected=[]}={}){
 const taken=new Set(selected);
 const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
 return items.filter(item=>{
  if(!root.RetroCheckout.available(item)||taken.has(item.id))return false;
  if(group!=='all'&&stockGroup(item)!==group)return false;
  if(condition!=='all'&&stockCondition(item)!==condition)return false;
  const text=[item.title,item.platform,item.identity?.platform,item.manufacturer,item.category,item.condition,item.stockSku,item.liveSku,item.ebaySku,item.barcode,item.identity?.barcode,item.location].filter(Boolean).join(' ').toLowerCase();
  return words.every(word=>text.includes(word));
 });
}
function install(c){
 const $=selector=>document.querySelector(selector),e=c.escape,m=c.money;
 const moneyPence=value=>m(value/100);
 let query='',group='all',condition='all',limit=40,lines=[],customerId=null,credit='0',discount='0',transactionId=null,saving=false,lastSale=null;
 function input(){
  const fee=c.state().settings.fees[channel]||{type:'fixed',value:0};
  return {lines,channel,discountType:'fixed',discount,feeType:fee.type,feeValue:fee.value,customerId,credit};
 }
 function stock(){
  return filterStock(c.state().items,{query,group,condition,selected:lines.map(line=>line.id)});
 }
 function filterButtons(choices,selected,handler,label){
  return '<div class="epos-filters" aria-label="'+label+'">'+choices.map(([key,text])=>
   '<button class="btn '+(key===selected?'primary':'secondary')+'" aria-pressed="'+(key===selected)+'" onclick="'+handler+'(\''+key+'\')">'+text+'</button>').join('')+'</div>';
 }
 function stockHtml(){
  const matches=stock();
  return '<p class="muted">'+matches.length+' available '+(matches.length===1?'item':'items')+'</p>'
   +(matches.length?'<div class="epos-stock-grid">'+matches.slice(0,limit).map(item=>{
    const price=c.price(item);
    return `<button class="epos-stock-item" onclick="eposAdd(${item.id})"><strong>${e(item.title)}</strong>
     <small>${e([item.platform||item.identity?.platform,item.condition,item.location].filter(Boolean).join(' · '))}</small>
     <span>${Number.isFinite(price)?m(price):'Enter price'}</span></button>`;
   }).join('')+'</div>':'<p>No available stock matches. Change your search or filters.</p>')
   +(matches.length>limit?'<button class="btn secondary" onclick="eposMore()">Show more stock</button>':'');
 }
 function basketHtml(){
  const items=new Map(c.state().items.map(item=>[item.id,item]));
  return lines.length?lines.map(line=>`<div class="epos-basket-row"><strong>${e(items.get(line.id)?.title||'Unavailable item')}</strong>
   <label>Price (£)<input class="input" id="eposPrice-${line.id}" type="number" min="0" step="0.01" value="${e(line.price)}" oninput="eposPrice(${line.id},this.value)"></label>
   <button class="btn secondary" onclick="eposRemove(${line.id})" aria-label="Remove ${e(items.get(line.id)?.title||'item')}">Remove</button></div>`).join(''):'<p>Choose an item to start the sale.</p>';
 }
 function totalsHtml(){
  if(!lines.length)return '<p class="epos-due">Amount due <strong>£0.00</strong></p>';
  let quote;
  try{quote=root.RetroCheckout.quote(c.state(),input());}
  catch(error){return '<p class="warning-text">'+e(error.message)+'</p>';}
  return `<dl class="epos-totals"><dt>Basket subtotal</dt><dd>${moneyPence(quote.subtotal)}</dd>
   ${quote.discount?'<dt>Discount</dt><dd>'+moneyPence(quote.discount)+'</dd>':''}
   <dt>Sale total</dt><dd>${moneyPence(quote.total)}</dd>
   ${quote.credit?'<dt>Store credit</dt><dd>'+moneyPence(quote.credit)+'</dd>':''}</dl>
   <p class="epos-due">Amount due <strong id="eposAmountDue">${moneyPence(quote.due)}</strong></p>
   <div class="epos-payment-buttons">${quote.due>0?
    '<button class="btn secondary" onclick="eposPay(\'cash\')">Cash received</button><button class="btn primary" onclick="eposPay(\'card\')">Card payment received</button>':
    '<button class="btn primary" onclick="eposPay(\''+(quote.credit?'store-credit':'no-charge')+'\')">Complete sale</button>'}</div>
   <small>Record payment here after taking it at the till or terminal.</small>`;
 }
 function paint(){
  if(!$('#eposStock'))return;
  $('#eposStock').innerHTML=stockHtml();
  $('#eposBasket').innerHTML=basketHtml();
  $('#eposSummary').innerHTML=totalsHtml();
 }
 function view(){
  const customer=c.state().customers.find(account=>account.id===customerId);
  return `<section class="epos-layout" id="eposPanel"><div class="card epos-stock">
   <h2>Find stock</h2><label for="eposSearch">Search title, platform, SKU or barcode</label>
   <input class="input counter-input" id="eposSearch" type="search" value="${e(query)}" placeholder="Search available stock" oninput="eposSearch(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();eposSelectSearch()}">
   <div id="eposFilters">${filterButtons(groups,group,'eposGroup','Stock category')}${filterButtons(conditions,condition,'eposCondition','Item condition')}</div>
   <div id="eposStock">${stockHtml()}</div></div>
   <div class="card epos-basket"><h2>Basket</h2><p id="eposNotice" role="status">${lastSale?'Sale recorded · '+moneyPence(lastSale.total)+' total.':''}</p>
   <div id="eposBasket">${basketHtml()}</div>
   <details ${customerId||Number(discount)?'open':''}><summary>Customer, store credit and discount</summary>
    <label>Customer account<select class="select" onchange="eposCustomer(this.value)"><option value="">Walk-in / no account</option>
    ${c.state().customers.map(account=>'<option value="'+account.id+'" '+(account.id===customerId?'selected':'')+'>'+e(account.name)+(account.postcode?' · '+e(account.postcode):'')+'</option>').join('')}</select></label>
    <label>Store credit (£)<input class="input" id="eposCredit" type="number" min="0" step="0.01" value="${e(credit)}" ${customer?.credit>0?'':'disabled'} oninput="eposCredit(this.value)"></label>
    <small id="eposCreditAvailable">${customer?m(customer.credit)+' available':''}</small>
    <label>Basket discount (£)<input class="input" type="number" min="0" step="0.01" value="${e(discount)}" oninput="eposDiscount(this.value)"></label>
   </details><div id="eposSummary" aria-live="polite">${totalsHtml()}</div></div></section>`;
 }
 function selectFilter(kind,value){
  const choices=kind==='group'?groups:conditions;
  if(!choices.some(([key])=>key===value))return;
  if(kind==='group')group=value;else condition=value;
  limit=40;
  $('#eposFilters').innerHTML=filterButtons(groups,group,'eposGroup','Stock category')+filterButtons(conditions,condition,'eposCondition','Item condition');
  $('#eposStock').innerHTML=stockHtml();
 }
 root.eposGroup=value=>selectFilter('group',value);
 root.eposCondition=value=>selectFilter('condition',value);
 root.eposSearch=value=>{query=value;limit=40;$('#eposStock').innerHTML=stockHtml();};
 root.eposMore=()=>{limit+=40;$('#eposStock').innerHTML=stockHtml();};
 root.eposSelectSearch=()=>{const matches=stock();if(query.trim()&&matches.length===1)root.eposAdd(matches[0].id);};
 root.eposAdd=id=>{
  const item=c.state().items.find(row=>row.id===id);
  if(!root.RetroCheckout.available(item)||lines.some(line=>line.id===id))return;
  const price=c.price(item);
  if(!transactionId)transactionId=crypto.randomUUID();
  lines.push({id,price:price??''});lastSale=null;
  $('#eposNotice').textContent='';paint();
  if(price==null)$('#eposPrice-'+id)?.focus();
  else{const search=$('#eposSearch');search?.focus();search?.select();}
 };
 root.eposRemove=id=>{lines=lines.filter(line=>line.id!==id);paint();};
 root.eposPrice=(id,value)=>{const line=lines.find(line=>line.id===id);if(line){line.price=value;$('#eposSummary').innerHTML=totalsHtml();}};
 root.eposCustomer=value=>{
  customerId=Number(value)||null;credit='0';
  const customer=c.state().customers.find(account=>account.id===customerId);
  const field=$('#eposCredit');field.value=credit;field.disabled=!(customer?.credit>0);
  $('#eposCreditAvailable').textContent=customer?m(customer.credit)+' available':'';
  $('#eposSummary').innerHTML=totalsHtml();
 };
 root.eposCredit=value=>{credit=value;$('#eposSummary').innerHTML=totalsHtml();};
 root.eposDiscount=value=>{discount=value;$('#eposSummary').innerHTML=totalsHtml();};
 root.eposPay=method=>{
  if(saving||!lines.length||!transactionId)return;
  saving=true;
  try{
   const next=root.RetroCheckout.complete(c.state(),{...input(),paymentMethod:method},transactionId,c.today());
   c.commit(next);
   lastSale=next.transactions.at(-1);
   lines=[];transactionId=null;credit='0';discount='0';customerId=null;query='';
   c.render();$('#eposSearch')?.focus();
  }catch(error){const notice=$('#eposNotice');if(notice)notice.textContent=error.message;}
  finally{saving=false;}
 };
 return {view};
}
root.RetroEPOS={install,filterStock};
})(typeof globalThis!=='undefined'?globalThis:this);
