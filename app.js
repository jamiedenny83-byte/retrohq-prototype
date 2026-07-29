const state = {
  items: [
    {id:1,title:'Silent Hill 2',category:'Video Game',source:'Car Boot Sale',buy:35,value:72,status:'Ready to list',location:'Shelf A2'},
    {id:2,title:'Nintendo 64 Console',category:'Console',source:'Trade In',buy:48,value:110,status:'Needs testing',location:'Bench 1'},
    {id:3,title:'1994 Power Rangers Figure',category:'Toy',source:'Other Reseller',buy:8,value:28,status:'Listed',location:'Cabinet T3'},
    {id:4,title:'Vintage Nike Sweatshirt',category:'Clothing',source:'Charity Shop',buy:12,value:45,status:'Needs photos',location:'Rail C1'}
  ],
  sales:[
    {item:'Pokemon Emerald',channel:'eBay',sale:118,cost:62,fees:15.34,shipping:4.2,profit:36.46},
    {item:'Transformers G1 Figure',channel:'In Store',sale:52,cost:18,fees:0,shipping:0,profit:34}
  ],
  view:'dashboard'
};

const root=document.getElementById('view-root');
const title=document.getElementById('page-title');
const subtitle=document.getElementById('page-subtitle');
const backdrop=document.getElementById('modal-backdrop');
const modal=document.getElementById('modal');

const money=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(n);

function setView(view){
  state.view=view;
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const meta={
    dashboard:['Dashboard','What are you doing today?'],
    acquisitions:['Acquisitions','Source stock, process trade-ins and dealer purchases.'],
    inventory:['Inventory','Find, value and manage every item.'],
    processing:['Processing','Move stock from purchase to sale-ready.'],
    sales:['Sales','Record sales, fees and true profit.'],
    reports:['Reports','Understand what is driving the business.'],
    settings:['Settings','Business defaults and subscription features.']
  }[view];
  title.textContent=meta[0];subtitle.textContent=meta[1];
  render();
  document.getElementById('sidebar').classList.remove('open');
}

document.getElementById('main-nav').addEventListener('click',e=>{if(e.target.dataset.view)setView(e.target.dataset.view)});
document.getElementById('menu-btn').onclick=()=>document.getElementById('sidebar').classList.toggle('open');

function dashboard(){
  const stock=state.items.length;
  const cost=state.items.reduce((s,i)=>s+i.buy,0);
  const value=state.items.reduce((s,i)=>s+i.value,0);
  const profit=state.sales.reduce((s,i)=>s+i.profit,0);
  return `<div class="hero"><div><h2>Good afternoon, Jamie</h2><p>Run the shop, source stock or review performance.</p></div><button class="btn btn-primary" onclick="openQuickBuy()">+ Quick acquisition</button></div>
  <div class="grid metrics">
    ${metric('Stock items',stock,'4 categories')}${metric('Inventory cost',money(cost),'At purchase cost')}${metric('Market value',money(value),'Potential gross value')}${metric('Recorded profit',money(profit),'+18.4% this month')}
  </div>
  <div class="grid action-grid">
    ${action('🛒','I’m sourcing stock','Start a buying trip or scan a purchase','openQuickBuy()')}
    ${action('🏪','I’m in the shop','Process a trade-in or check a price','openTradeIn()')}
    ${action('📦','I’m processing stock','Test, clean, photograph and list items',"setView('processing')")}
    ${action('📈','Review the business','See profit, ROI and stock health',"setView('reports')")}
  </div>
  <div class="grid two-col"><div class="card"><div class="section-head"><h3>Items needing attention</h3><button class="btn btn-secondary" onclick="setView('processing')">Open queue</button></div>${attentionList()}</div>
  <div class="card"><div class="section-head"><h3>Recent sales</h3></div>${salesList()}</div></div>`;
}
function metric(label,value,note){return `<div class="metric"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`}
function action(icon,name,desc,fn){return `<button class="action-card" onclick="${fn}"><strong>${icon} ${name}</strong><span>${desc}</span></button>`}
function attentionList(){return `<div class="list">${state.items.filter(i=>i.status!=='Listed').map(i=>`<div class="list-row"><div><strong>${i.title}</strong><div class="muted">${i.category} · ${i.location}</div></div><span class="pill warning">${i.status}</span></div>`).join('')}</div>`}
function salesList(){return `<div class="list">${state.sales.map(s=>`<div class="list-row"><div><strong>${s.item}</strong><div class="muted">${s.channel}</div></div><strong>${money(s.profit)}</strong></div>`).join('')}</div>`}

function acquisitions(){return `<div class="hero"><div><h2>Choose an acquisition workflow</h2><p>Every item entering the business begins here.</p></div></div>
<div class="grid action-grid">
${action('⚡','Quick acquisition','Add one item with minimal fields','openQuickBuy()')}
${action('🔁','Trade in','Value and acquire stock from a customer','openTradeIn()')}
${action('🤝','Other reseller','Record dealer-to-dealer stock purchases',"openQuickBuy('Other Reseller')")}
${action('🚗','Buying trip','Group sourcing costs and multiple items','openTrip()')}
</div>
<div class="card"><div class="section-head"><h3>Recent acquisitions</h3></div>${inventoryTable(state.items.slice().reverse())}</div>`}

function inventory(){return `<div class="toolbar"><input class="input" id="inventory-search" placeholder="Search title, category or location" oninput="filterInventory()"><select class="select" id="category-filter" onchange="filterInventory()"><option value="">All categories</option><option>Video Game</option><option>Console</option><option>Toy</option><option>Clothing</option></select><button class="btn btn-primary" onclick="openQuickBuy()">+ Add item</button></div><div id="inventory-results">${inventoryTable(state.items)}</div>`}
function inventoryTable(items){return `<div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Category</th><th>Source</th><th>Buy</th><th>Value</th><th>Status</th><th>Location</th></tr></thead><tbody>${items.map(i=>`<tr><td><strong>${i.title}</strong></td><td>${i.category}</td><td>${i.source}</td><td>${money(i.buy)}</td><td>${money(i.value)}</td><td><span class="pill ${i.status==='Listed'?'success':'warning'}">${i.status}</span></td><td>${i.location}</td></tr>`).join('')}</tbody></table></div>`}
window.filterInventory=()=>{const q=document.getElementById('inventory-search').value.toLowerCase();const c=document.getElementById('category-filter').value;const result=state.items.filter(i=>(!q||`${i.title} ${i.category} ${i.location}`.toLowerCase().includes(q))&&(!c||i.category===c));document.getElementById('inventory-results').innerHTML=inventoryTable(result)};

function processing(){const groups=['Needs testing','Needs photos','Ready to list','Listed'];return `<div class="grid two-col"><div class="stack">${groups.map(g=>`<div class="card"><div class="section-head"><h3>${g}</h3><span class="pill">${state.items.filter(i=>i.status===g).length}</span></div>${state.items.filter(i=>i.status===g).map(i=>`<div class="list-row"><div><strong>${i.title}</strong><div class="muted">${i.location}</div></div><button class="btn btn-secondary" onclick="advanceItem(${i.id})">Advance</button></div>`).join('')||'<div class="empty">No items</div>'}</div>`).join('')}</div><div class="card"><h3>Processing health</h3><p class="muted">75% of inventory is progressing toward sale.</p><div class="progress"><span style="width:75%"></span></div><div class="list" style="margin-top:18px"><div class="list-row"><span>Average processing age</span><strong>4.2 days</strong></div><div class="list-row"><span>Waiting for photos</span><strong>1</strong></div><div class="list-row"><span>Ready to list</span><strong>1</strong></div></div></div></div>`}
window.advanceItem=id=>{const i=state.items.find(x=>x.id===id);const order=['Needs testing','Needs photos','Ready to list','Listed'];const idx=order.indexOf(i.status);i.status=order[Math.min(idx+1,order.length-1)];render()};

function sales(){return `<div class="hero"><div><h2>Sales and profit</h2><p>Track fees, postage and true net returns.</p></div><button class="btn btn-primary" onclick="openSale()">+ Record sale</button></div><div class="grid metrics">${metric('Revenue',money(state.sales.reduce((s,x)=>s+x.sale,0)),'Recorded sales')}${metric('Fees',money(state.sales.reduce((s,x)=>s+x.fees,0)),'Marketplace and payment')}${metric('Shipping',money(state.sales.reduce((s,x)=>s+x.shipping,0)),'Outbound postage')}${metric('Net profit',money(state.sales.reduce((s,x)=>s+x.profit,0)),'After all recorded costs')}</div><div class="card" style="margin-top:20px">${salesTable()}</div>`}
function salesTable(){return `<div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Channel</th><th>Sale</th><th>Cost</th><th>Fees</th><th>Shipping</th><th>Profit</th></tr></thead><tbody>${state.sales.map(s=>`<tr><td>${s.item}</td><td>${s.channel}</td><td>${money(s.sale)}</td><td>${money(s.cost)}</td><td>${money(s.fees)}</td><td>${money(s.shipping)}</td><td><strong>${money(s.profit)}</strong></td></tr>`).join('')}</tbody></table></div>`}

function reports(){return `<div class="grid metrics">${metric('Average item ROI','86%','Prototype estimate')}${metric('Best source','Trade In','Highest margin')}${metric('Best category','Video Game','By gross profit')}${metric('Stock over 90 days','12%','Needs review')}</div><div class="grid two-col" style="margin-top:20px"><div class="card"><h3>Profit by category</h3>${bar('Video Games',78)}${bar('Consoles',63)}${bar('Toys',48)}${bar('Clothing',36)}</div><div class="card"><h3>Acquisition source performance</h3><div class="list"><div class="list-row"><span>Trade In</span><strong>142% ROI</strong></div><div class="list-row"><span>Car Boot Sale</span><strong>118% ROI</strong></div><div class="list-row"><span>Other Reseller</span><strong>64% ROI</strong></div><div class="list-row"><span>Charity Shop</span><strong>57% ROI</strong></div></div></div></div>`}
function bar(label,width){return `<div style="margin:18px 0"><div class="section-head"><span>${label}</span><strong>${width}%</strong></div><div class="progress"><span style="width:${width}%"></span></div></div>`}

function settings(){return `<div class="grid two-col"><div class="card"><h3>Business defaults</h3><div class="list"><div class="list-row"><span>Currency</span><strong>GBP (£)</strong></div><div class="list-row"><span>Default condition</span><strong>Good</strong></div><div class="list-row"><span>Default acquisition status</span><strong>Needs processing</strong></div><div class="list-row"><span>Default shop location</span><strong>Main Store</strong></div></div></div><div class="card"><h3>Subscription feature flags</h3><div class="list"><div class="list-row"><span>Barcode lookup</span><span class="pill success">Enabled</span></div><div class="list-row"><span>PriceCharting integration</span><span class="pill warning">Planned</span></div><div class="list-row"><span>Trade-in workflow</span><span class="pill success">Enabled</span></div><div class="list-row"><span>Multi-user teams</span><span class="pill warning">Business tier</span></div></div></div></div>`}

function render(){root.innerHTML=({dashboard,acquisitions,inventory,processing,sales,reports,settings}[state.view])()}

function openModal(html){modal.innerHTML=html;backdrop.classList.remove('hidden')}
window.closeModal=()=>backdrop.classList.add('hidden');backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeModal()});

window.openQuickBuy=(preset='')=>openModal(`<h2>Quick acquisition</h2><p class="muted">Only the item and buy price are required.</p><div class="form-grid"><div class="field full"><label>Item title or barcode</label><input class="input" id="q-title" placeholder="Scan barcode or type title"></div><div class="field"><label>Category</label><select class="select" id="q-category"><option>Video Game</option><option>Console</option><option>Toy</option><option>Clothing</option><option>Other Collectable</option></select></div><div class="field"><label>Acquisition source</label><select class="select" id="q-source"><option ${preset==='Other Reseller'?'selected':''}>Other Reseller</option><option ${!preset?'selected':''}>Car Boot Sale</option><option>Trade In</option><option>Charity Shop</option><option>Private Seller</option><option>Auction</option></select></div><div class="field"><label>Buy price (£)</label><input class="input" id="q-buy" type="number" min="0" step="0.01"></div><div class="field"><label>Estimated value (£)</label><input class="input" id="q-value" type="number" min="0" step="0.01"></div><div class="field"><label>Status</label><select class="select" id="q-status"><option>Needs testing</option><option>Needs photos</option><option>Ready to list</option><option>Listed</option></select></div><div class="field"><label>Storage location</label><input class="input" id="q-location" placeholder="Shelf or rail"></div></div><div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveQuickBuy()">Save acquisition</button></div>`);
window.saveQuickBuy=()=>{const t=document.getElementById('q-title').value.trim();const b=+document.getElementById('q-buy').value;if(!t||Number.isNaN(b)){alert('Please enter an item title and buy price.');return}state.items.push({id:Date.now(),title:t,category:document.getElementById('q-category').value,source:document.getElementById('q-source').value,buy:b,value:+document.getElementById('q-value').value||b,status:document.getElementById('q-status').value,location:document.getElementById('q-location').value||'Unassigned'});closeModal();setView('inventory')};

window.openTradeIn=()=>openModal(`<h2>New trade in</h2><p class="muted">Prototype flow for acquiring stock from a store customer.</p><div class="form-grid"><div class="field full"><label>Customer reference (optional)</label><input class="input" placeholder="Name, receipt or anonymous"></div><div class="field full"><label>Items presented</label><input class="input" placeholder="Example: Nintendo 64 bundle"></div><div class="field"><label>Estimated resale value (£)</label><input class="input" type="number" value="120"></div><div class="field"><label>Offer amount (£)</label><input class="input" type="number" value="55"></div><div class="field full"><label>Payment method</label><select class="select"><option>Cash</option><option>Store credit</option><option>Part exchange</option></select></div></div><div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="closeModal();openQuickBuy('Trade In')">Accept and add items</button></div>`)
window.openTrip=()=>openModal(`<h2>Start buying trip</h2><div class="form-grid"><div class="field full"><label>Trip name</label><input class="input" value="Saturday Car Boot"></div><div class="field"><label>Fuel cost (£)</label><input class="input" type="number" value="12"></div><div class="field"><label>Entry / parking (£)</label><input class="input" type="number" value="5"></div><div class="field full"><label>Default source</label><select class="select"><option>Car Boot Sale</option><option>Charity Shop</option><option>Other Reseller</option><option>Auction</option></select></div></div><div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="closeModal();openQuickBuy()">Start trip</button></div>`)
window.openSale=()=>openModal(`<h2>Record sale</h2><div class="form-grid"><div class="field full"><label>Item</label><select class="select" id="s-item">${state.items.map(i=>`<option value="${i.id}">${i.title}</option>`).join('')}</select></div><div class="field"><label>Channel</label><select class="select" id="s-channel"><option>In Store</option><option>eBay</option><option>Vinted</option><option>Facebook Marketplace</option><option>Website</option></select></div><div class="field"><label>Sale price (£)</label><input class="input" id="s-sale" type="number"></div><div class="field"><label>Fees (£)</label><input class="input" id="s-fees" type="number" value="0"></div><div class="field"><label>Shipping (£)</label><input class="input" id="s-ship" type="number" value="0"></div></div><div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveSale()">Save sale</button></div>`)
window.saveSale=()=>{const item=state.items.find(i=>i.id==document.getElementById('s-item').value);const sale=+document.getElementById('s-sale').value||0,fees=+document.getElementById('s-fees').value||0,shipping=+document.getElementById('s-ship').value||0;state.sales.unshift({item:item.title,channel:document.getElementById('s-channel').value,sale,cost:item.buy,fees,shipping,profit:sale-item.buy-fees-shipping});state.items=state.items.filter(i=>i.id!==item.id);closeModal();setView('sales')};

render();
