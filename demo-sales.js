/* Offline fixtures feed the same reconciliation engine as normalized eBay orders. */
(function (root) {
'use strict';
const storageKey = 'retrohq.demo.v84';
const clone = value => JSON.parse(JSON.stringify(value));
const scenarios = {
  paid:{label:'Paid sale',orderId:'DEMO-ORDER-1',description:'Silent Hill 2: one fictional PlayStation 2 game, in Good condition, on Demo shelf 1. Sale price £80; buy cost £35; processing £2. Its listing link is already set, so it should show Ready to import. Review the match and confirm the sample sale.'},
  unmatched:{label:'Unmatched sale',orderId:'DEMO-ORDER-2',description:'Nintendo 64: one fictional console, in Good condition, on Demo shelf 2. Sale price £100; buy cost £48; processing £4. Its listing link is deliberately missing. Choose Match stock manually and select only the Nintendo 64 record. Silent Hill 2 is a different scenario.'},
  multi:{label:'Two-unit sale',orderId:'DEMO-ORDER-3',description:'Two fictional PS3 game copies, labelled unit A and unit B, on Demo shelves 3 and 4. Each costs £8 to buy plus £1 processing. The order total is £30.01. Both stock records should match; import allocates £15.01 and £15.00. Review how you allocate the order-level fees and shipping.'},
  repeat:{label:'Repeat sync',orderId:'DEMO-ORDER-1',description:'Fetch the same Silent Hill 2 sample order again. After importing Paid sale, this must remain one sale consuming one stock item. It must not create another order or sale.'},
  refund:{label:'Refund',orderId:'DEMO-ORDER-1',description:'Simulate a refund on the imported Silent Hill 2 sale. Expect Review change; the item stays Sold. Restore stock only when simulating a physically received return. Import Paid sale first.'},
  cancel:{label:'Cancellation',orderId:'DEMO-ORDER-1',description:'Simulate cancellation of the imported Silent Hill 2 sale. Expect Review change, with no automatic stock restoration. Import Paid sale first, then review whether the item is physically available.'},
  error:{label:'Connection error',orderId:null,description:'Simulate an unavailable order service. Existing sample orders, stock and the last successful sync should remain unchanged. All loaded sample orders are shown here.'}
};
function visible(row,scenario){const selected=scenarios[scenario];return !selected?.orderId||row.latest.orderId===selected.orderId;}
function seed(defaults) {
  const state = clone(defaults);
  state.customers = []; state.creditIssued = 0; state.researchHistory = [];
  state.ebaySync = {lines:[],lastSync:null,message:'Choose a sample scenario to begin.'};
  state.items = [
    ['Silent Hill 2 — DEMO','DEMO-SH2','DEMO-L1',35,2],
    ['Nintendo 64 — DEMO','','',48,4],
    ['PS3 game — DEMO unit A','DEMO-BUNDLE','DEMO-L3',8,1],
    ['PS3 game — DEMO unit B','DEMO-BUNDLE','DEMO-L3',8,1]
  ].map(([title,sku,listing,buy,processingCosts],n)=>({
    id:n+1,title,ebaySku:sku,ebayListingId:listing,buy,processingCosts,
    manufacturer:n===1?'Nintendo':'Sony',category:n===1?'Console':'Video Game',
    source:'Demo fixture',baseMarket:80,condition:'Good',acquiredCondition:'Good',
    status:'Listed',location:'Demo shelf '+(n+1),area:'Demo',shelf:String(n+1),
    velocity:70,notes:'Fictional training stock.',photos:1,listing:null,sale:null,
    timeline:[['Demo stock','Fictional item; separate from your saved inventory.']]
  }));
  return state;
}
function orders(scenario, date = new Date().toISOString()) {
  const line = {orderId:'DEMO-ORDER-1',lineItemId:'DEMO-LINE-1',title:'Silent Hill 2 — DEMO',
    sku:'DEMO-SH2',listingId:'DEMO-L1',quantity:1,price:80,currency:'GBP',date:date.slice(0,10),
    paymentStatus:'PAID',cancelState:'NONE',refundDetected:false,eligible:true,
    fulfillmentStatus:'NOT_STARTED',orderLineCount:1,orderFee:10,orderShipping:3};
  switch(scenario) {
    case 'paid': case 'repeat': return [line];
    case 'unmatched': return [{...line,orderId:'DEMO-ORDER-2',lineItemId:'DEMO-LINE-2',
      title:'Nintendo 64 — DEMO',sku:'DEMO-UNLINKED',listingId:'DEMO-L2',price:100}];
    case 'multi': return [{...line,orderId:'DEMO-ORDER-3',lineItemId:'DEMO-LINE-3',
      title:'Two PS3 games — DEMO',sku:'DEMO-BUNDLE',listingId:'DEMO-L3',quantity:2,price:30.01}];
    case 'refund': return [{...line,refundDetected:true,eligible:false}];
    case 'cancel': return [{...line,cancelState:'CANCELED',eligible:false}];
    case 'error': throw Error('Simulated eBay connection failure. Saved stock and the last successful sync are retained.');
    default: throw Error('Unknown demo scenario.');
  }
}
const api = {storageKey,seed,orders,scenarios,visible};
if(typeof module!=='undefined'&&module.exports) module.exports=api;
else root.RetroDemo=api;
})(typeof globalThis!=='undefined'?globalThis:this);
