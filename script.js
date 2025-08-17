// ---- Utilities
const fmtAED = (v)=> new Intl.NumberFormat('en-AE',{style:'currency',currency:'AED'}).format(v);
const $ = (s,ctx=document)=>ctx.querySelector(s);
const $$ = (s,ctx=document)=>Array.from(ctx.querySelectorAll(s));

// ---- Cart (localStorage)
const CART_KEY = 'de_cart_v1';
const getCart = ()=> JSON.parse(localStorage.getItem(CART_KEY) || '[]');
const setCart = (items)=> localStorage.setItem(CART_KEY, JSON.stringify(items));
const countCart = ()=> getCart().reduce((n,it)=> n+it.qty,0);
const findInCart = (id)=> getCart().find(p=> p.id===id);

function addToCart(product, qty=1){
  const cart = getCart();
  const row = cart.find(i=> i.id===product.id);
  if(row){ row.qty += qty; } else { cart.push({ id:product.id, name:product.name, price:product.price, img:product.img, qty }); }
  setCart(cart); updateCartBadge();
}
function updateQty(id, qty){
  const cart = getCart().map(r=> r.id===id? {...r, qty:Math.max(1,qty)}: r);
  setCart(cart);
}
function removeFromCart(id){
  const cart = getCart().filter(r=> r.id!==id);
  setCart(cart);
}
function clearCart(){ setCart([]); }

// ---- Cart math
const SHIPPING = 15;
const VAT_RATE = 0.05;
function totals(){
  const sub = getCart().reduce((s,i)=> s + i.price * i.qty, 0);
  const vat = +(sub * VAT_RATE).toFixed(2);
  const total = sub + vat + (getCart().length? SHIPPING:0);
  return { sub, vat, ship: getCart().length? SHIPPING:0, total };
}

// ---- UI bits shared
function updateCartBadge(){
  const badge = $('#cart-count');
  if(badge) badge.textContent = countCart();
}
function buildWAUrl(msg){ // 0564799603 -> 971564799603
  const num = '971564799603';
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}
function cartSummaryText(){
  const lines = getCart().map(i=> `• ${i.name} x${i.qty} = ${fmtAED(i.price*i.qty)}`);
  const t = totals();
  lines.push(`Subtotal: ${fmtAED(t.sub)}`);
  lines.push(`VAT (5%): ${fmtAED(t.vat)}`);
  if(t.ship) lines.push(`Shipping: ${fmtAED(t.ship)}`);
  lines.push(`Total: ${fmtAED(t.total)}`);
  return `Dubai Electro — Order summary:\n` + lines.join('\n');
}

// ---- Page routers
document.addEventListener('DOMContentLoaded', init);
async function init(){
  $('#year')?.replaceWith(Object.assign(document.createElement('span'),{textContent:new Date().getFullYear()}));

  // WhatsApp links (header, footer, fab)
  const waLinks = ['#wa-cta','#wa-footer','#wa-fab'].map(sel=> $(sel)).filter(Boolean);
  waLinks.forEach(a=> a.href = buildWAUrl('Hello, I would like to order.'));

  updateCartBadge();

  if($('#grid')) await initCatalogPage();
  if($('#cart-list')) initCartPage();
  if($('#order-form')) initCheckoutPage();
}

// ---- Catalog page
async function initCatalogPage(){
  let products = [];
  try{
    const res = await fetch('data/products.json'); products = await res.json();
  }catch(e){ console.error('Failed to load products.json', e); }

  const grid = $('#grid');
  const chips = $$('.chip');
  const search = $('#search');
  const sort = $('#sort');

  function render(){
    const active = chips.find(c=> c.classList.contains('active'))?.dataset.filter || 'all';
    const q = (search.value||'').toLowerCase().trim();
    let list = products.filter(p => active==='all' ? true : p.cat === active);
    if(q) list = list.filter(p => (p.name+p.desc).toLowerCase().includes(q));
    switch(sort.value){
      case 'name-asc': list.sort((a,b)=> a.name.localeCompare(b.name)); break;
      case 'name-desc': list.sort((a,b)=> b.name.localeCompare(a.name)); break;
      case 'price-asc': list.sort((a,b)=> a.price - b.price); break;
      case 'price-desc': list.sort((a,b)=> b.price - a.price); break;
    }
    grid.innerHTML = list.map(cardHTML).join('');
    // Bind add-to-cart + qty
    $$('.add').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.id; const p = products.find(x=> String(x.id)===id);
        const qty = Math.max(1, parseInt($('#qty-'+id)?.value || '1',10));
        addToCart(p, qty);
      });
    });
    $$('.qty-minus').forEach(b=>{
      const id = b.dataset.id;
      b.addEventListener('click', ()=>{
        const input = $('#qty-'+id);
        input.value = Math.max(1, parseInt(input.value||'1',10)-1);
      });
    });
    $$('.qty-plus').forEach(b=>{
      const id = b.dataset.id;
      b.addEventListener('click', ()=>{
        const input = $('#qty-'+id);
        input.value = Math.max(1, parseInt(input.value||'1',10)+1);
      });
    });
  }

  function cardHTML(p){
    return `
      <article class="card product">
        <div class="thumb"><img src="${p.img}" alt="${p.name}"></div>
        <h3>${p.name}</h3>
        <p class="muted tiny">${p.desc}</p>
        <div class="row">
          <strong>${fmtAED(p.price)}</strong>
          <div class="qty-controls">
            <button class="qty-minus" data-id="${p.id}" aria-label="Decrease">−</button>
            <input id="qty-${p.id}" value="1" inputmode="numeric" />
            <button class="qty-plus" data-id="${p.id}" aria-label="Increase">+</button>
          </div>
          <button class="btn add" data-id="${p.id}">Add</button>
        </div>
      </article>`;
  }

  chips.forEach(c=> c.addEventListener('click', ()=>{
    chips.forEach(x=> x.classList.remove('active'));
    c.classList.add('active'); render();
  }));
  search.addEventListener('input', render);
  sort.addEventListener('change', render);

  render();
}

// ---- Cart page
function initCartPage(){
  const list = $('#cart-list'), empty = $('#cart-empty');
  function render(){
    const cart = getCart();
    if(cart.length===0){ empty.style.display='block'; list.innerHTML=''; updateTotals(); return; }
    empty.style.display='none';
    list.innerHTML = cart.map(row => `
      <div class="cart-item">
        <img src="${row.img}" alt="${row.name}">
        <div>
          <div class="title">${row.name}</div>
          <div class="muted tiny">${fmtAED(row.price)} each</div>
          <div class="qty-controls" style="margin-top:8px">
            <button data-id="${row.id}" class="dec">−</button>
            <input value="${row.qty}" inputmode="numeric" class="qty" data-id="${row.id}"/>
            <button data-id="${row.id}" class="inc">+</button>
          </div>
        </div>
        <div style="text-align:right">
          <strong>${fmtAED(row.price*row.qty)}</strong><br>
          <button data-id="${row.id}" class="link muted remove" style="margin-top:8px">Remove</button>
        </div>
      </div>`).join('');

    $$('.dec').forEach(b=> b.addEventListener('click', ()=> changeQty(b.dataset.id,-1)));
    $$('.inc').forEach(b=> b.addEventListener('click', ()=> changeQty(b.dataset.id, 1)));
    $$('.qty').forEach(i=> i.addEventListener('input', ()=> setQty(i.dataset.id, parseInt(i.value||'1',10))));
    $$('.remove').forEach(b=> b.addEventListener('click', ()=> { removeFromCart(b.dataset.id); render(); updateTotals(); updateCartBadge(); }));

    updateTotals();
  }
  function changeQty(id, delta){ const row = findInCart(id); if(!row) return; updateQty(row.id, row.qty+delta); render(); updateTotals(); updateCartBadge(); }
  function setQty(id, val){ if(!val || val<1) val=1; updateQty(id, val); render(); updateTotals(); updateCartBadge(); }

  function updateTotals(){
    const t = totals();
    $('#t-sub')?.textContent = fmtAED(t.sub);
    $('#t-vat')?.textContent = fmtAED(t.vat);
    $('#t-ship')?.textContent = fmtAED(t.ship);
    $('#t-total')?.textContent = fmtAED(t.total);
  }

  render();
}

// ---- Checkout page
function initCheckoutPage(){
  const form = $('#order-form');
  const status = $('#co-status');
  const waBtn = $('#co-wa');

  function updatePriceUI(){
    const t = totals();
    $('#co-sub').textContent = fmtAED(t.sub);
    $('#co-vat').textContent = fmtAED(t.vat);
    $('#co-ship').textContent = fmtAED(t.ship);
    $('#co-total').textContent = fmtAED(t.total);
    $('#order-summary').value = cartSummaryText();
    waBtn.href = buildWAUrl(cartSummaryText());
  }
  updatePriceUI();

  form.addEventListener('submit', ()=>{
    status.textContent = 'Placing order…';
    // Let Netlify handle it; after success page, we can clear the cart:
    localStorage.setItem('de_clear_after', '1');
  });

  // If we just landed on success page, clear cart:
  if (location.pathname.endsWith('order-success.html') && localStorage.getItem('de_clear_after')==='1'){
    clearCart(); localStorage.removeItem('de_clear_after');
  }
}