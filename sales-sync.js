/* Sandbox reconciliation. Each RetroHQ inventory record is one physical unit. */
(function (root) {
'use strict';
const clone = value => JSON.parse(JSON.stringify(value));
const key = line => JSON.stringify(['ebay', 'sandbox', line.orderId, line.lineItemId]);
const available = item => !item.importHold && !item.sale && !['Sold','Packaged','Dispatched','Delivered','Completed'].includes(item.status);
const valid = line => line.paymentStatus === 'PAID' && ['NONE','NOT_REQUESTED'].includes(line.cancelState) &&
  !line.refundDetected && line.currency === 'GBP' && Number.isSafeInteger(line.quantity) && line.quantity > 0 &&
  Number.isFinite(line.price) && line.price >= 0 && line.eligible === true;
function ledger(state) { return state.ebaySync || (state.ebaySync = {lines:[], lastSync:null}); }
function ingest(state, lines, now = new Date().toISOString()) {
  const sync = ledger(state);
  for (const line of lines) {
    if (!line.orderId || !line.lineItemId) throw Error('Missing external order identity.');
    const id = key(line);
    let row = sync.lines.find(r => r.key === id);
    if (!row) { row = {key:id, itemIds:[], outcome:null}; sync.lines.push(row); }
    row.latest = clone(line); row.syncedAt = now;
    if (row.imported) {
      const changed = !valid(line) || ['quantity','price','sku','listingId','orderFee','orderShipping'].some(k => line[k] !== row.imported[k]);
      row.review = changed || !!row.review;
      for (const item of state.items.filter(i => row.itemIds.includes(i.id))) {
        if (item.sale?.externalKey !== id) continue;
        item.sale.reviewNeeded = !!row.review;
        item.sale.externalFulfillment = line.fulfillmentStatus;
        // A status update is evidence, not authority to move a physical item or restore stock.
      }
    }
  }
  sync.lastSync = now;
}
function propose(state, row) {
  if (row.outcome) return {status:row.outcome, items:[]};
  if (row.imported) return {status:row.review?'Review change':'Imported', items:[]};
  const line = row.latest;
  if (!valid(line)) return {status:'Payment / cancellation / currency review', items:[]};
  const bySku = line.sku ? state.items.filter(i => i.ebaySku === line.sku) : [];
  const byListing = line.listingId ? state.items.filter(i => i.ebayListingId === line.listingId) : [];
  // Conflicting identities cannot be resolved by choosing whichever field matched first.
  let candidates = bySku.length ? bySku : byListing;
  if (bySku.length && byListing.length && bySku.some(i => !byListing.includes(i)))
    return {status:'Conflicting SKU / listing links', items:[]};
  if (candidates.some(i => (line.sku && i.ebaySku && i.ebaySku !== line.sku) ||
      (line.listingId && i.ebayListingId && i.ebayListingId !== line.listingId)))
    return {status:'Conflicting SKU / listing links', items:[]};
  candidates = candidates.filter(available);
  return candidates.length === line.quantity ? {status:'Ready to import', items:candidates} :
    {status:candidates.length ? 'Quantity / duplicate links need matching' : 'Needs matching', items:[]};
}
function apply(state, rowKey, ids, now = new Date().toISOString()) {
  const row = ledger(state).lines.find(r => r.key === rowKey);
  if (!row || row.imported || row.outcome || !valid(row.latest)) throw Error('This order line cannot be imported.');
  const line = row.latest;
  if (new Set(ids).size !== line.quantity || ids.length !== line.quantity) throw Error('Select exactly one stock record per unit.');
  const items = ids.map(id => state.items.find(i => i.id === id));
  if (items.some(i => !i || !available(i))) throw Error('Selected stock is no longer available.');
  const cents = Math.round(line.price * 100), base = Math.floor(cents / items.length), remainder = cents % items.length;
  items.forEach((item, n) => {
    item.sale = {channel:'eBay Sandbox', externalKey:row.key, orderId:line.orderId, lineItemId:line.lineItemId,
      price:(base + (n < remainder ? 1 : 0))/100, quantity:1, date:line.date,
      feeType:'fixed', feeValue:line.orderLineCount===1&&line.quantity===1?line.orderFee:null,
      shipping:null, packaging:null, shippingRevenue:line.orderLineCount===1&&line.quantity===1?line.orderShipping:null,
      costsConfirmed:false, status:line.fulfillmentStatus==='FULFILLED'?'Dispatched':'Ready to dispatch', externalFulfillment:line.fulfillmentStatus};
    item.status = line.fulfillmentStatus==='FULFILLED'?'Dispatched':'Sold';
    item.timeline = item.timeline || [];
    item.timeline.push(['eBay Sandbox sale', 'Imported paid order; stock allocation confirmed ' + now]);
  });
  row.itemIds = [...ids]; row.imported = clone(line); row.importedAt = now; row.review = false;
}
function restore(state, rowKey, reason, now = new Date().toISOString()) {
  const row = ledger(state).lines.find(r => r.key === rowKey);
  if (!row?.imported || row.outcome) throw Error('No active imported line to reverse.');
  const items = row.itemIds.map(id => state.items.find(i => i.id === id));
  if (items.some(i => i?.sale?.externalKey !== rowKey)) throw Error('Stock changed; inspect individual records before reversing.');
  if (!reason?.trim()) throw Error('Record the reason and confirm all units are physically in stock.');
  items.forEach(item => {
    (item.saleHistory || (item.saleHistory=[])).push({...clone(item.sale), outcome:reason, reversedAt:now});
    item.sale = null; item.listing = null; item.status = 'Needs testing'; item.needsValuation = true;
    item.timeline.push(['eBay stock restored', 'Physical return / cancellation confirmed ' + now]);
  });
  row.outcome = 'Reversed — retained for duplicate protection'; row.reason = reason; row.reversedAt = now; row.review = false;
}
function acceptChange(state, rowKey) {
  const row=ledger(state).lines.find(r=>r.key===rowKey);
  if (!row?.imported || row.outcome || !valid(row.latest) ||
      ['quantity','sku','listingId'].some(k=>row.latest[k]!==row.imported[k]))
    throw Error('Payment, refunds, quantity or identity changed. Keep under review; verify in Seller Hub.');
  const items=row.itemIds.map(id=>state.items.find(i=>i.id===id));
  if (items.some(i=>i?.sale?.externalKey!==rowKey)) throw Error('Stock allocation changed. Review individual records.');
  const cents=Math.round(row.latest.price*100),base=Math.floor(cents/items.length),remainder=cents%items.length;
  items.forEach((item,n)=>{
    item.sale.price=(base+(n<remainder?1:0))/100;item.sale.costsConfirmed=false;item.sale.reviewNeeded=false;
    if(row.latest.orderLineCount===1&&row.latest.quantity===1){item.sale.feeValue=row.latest.orderFee;item.sale.shippingRevenue=row.latest.orderShipping;}
    item.timeline.push(['eBay amount review','Confirmed updated order evidence; actual costs need reconfirmation.']);
  });
  (row.history||(row.history=[])).push(row.imported);row.imported=clone(row.latest);row.review=false;
}
function economics(item) {
  const s = item.sale;
  if (!s?.externalKey) return null;
  if (!s.costsConfirmed || s.reviewNeeded) return {profit:null, margin:null};
  const profit = Math.round((s.price + s.shippingRevenue - Number(item.buy || 0) -
    Number(item.processingCosts || 0) - s.feeValue - s.shipping - s.packaging) * 100)/100;
  return {profit, margin:s.price + s.shippingRevenue ? profit/(s.price + s.shippingRevenue)*100 : 0};
}
function confirmCosts(item, costs) {
  if (!item.sale?.externalKey || item.sale.reviewNeeded) throw Error('Resolve order changes before confirming costs.');
  for (const field of ['feeValue','shipping','packaging','shippingRevenue']) {
    if (!Number.isFinite(costs[field]) || costs[field] < 0) throw Error('Enter actual amounts, including explicit zeroes.');
  }
  Object.assign(item.sale, costs, {costsConfirmed:true});
}
// One atomic browser-storage record contains stock and the deduplication ledger.
// Compare the last read value to reject stale tabs; Web Locks serialise browser writers.
function storage(storage, name = 'retrohq.sandbox.v84') {
  let last = storage.getItem(name);
  return {
    load() { if (!last) return null; const data=JSON.parse(last); if (data.version!==1 || !Array.isArray(data.state?.items)) throw Error('Unsupported or damaged saved inventory.'); return data.state; },
    save(state) {
      if (storage.getItem(name) !== last) throw Error('Another tab changed inventory. Reload this tab before continuing.');
      const next = JSON.stringify({version:1, state}); storage.setItem(name,next); last=next;
    }
  };
}
const api={key,valid,available,ingest,propose,apply,restore,acceptChange,economics,confirmCosts,storage};
if (typeof module !== 'undefined' && module.exports) module.exports=api;
else root.RetroSales=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
