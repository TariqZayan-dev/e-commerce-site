/*
 * Ecommerce Website Script
 * - Mobile hamburger menu (pill, pulse, X morph)
 * - Add to cart, qty (+/−), remove, totals (AED)
 * - Checkout rendering + Netlify form (no preventDefault)
 */

document.addEventListener('DOMContentLoaded', () => {
  const CART_KEY = 'ecommerce_cart';
  const CURRENCY = 'AED';

  /* ===========================
     HAMBURGER MENU (mobile)
     =========================== */
  const headerEl = document.querySelector('header');
  const toggleBtn = document.querySelector('.menu-toggle');
  const menuLinks = document.querySelectorAll('#primary-menu a');

  if (toggleBtn && headerEl) {
    const closeMenu = () => {
      headerEl.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    };

    // Toggle open/close on button
    toggleBtn.addEventListener('click', () => {
      const isOpen = headerEl.classList.toggle('open');
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
    });

    // Close when a menu link is clicked
    menuLinks.forEach((a) => a.addEventListener('click', closeMenu));

    // Close when resizing to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) closeMenu();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });

    // One-time gentle pulse to hint it's interactive
    setTimeout(() => toggleBtn.classList.add('pulse-once'), 300);
    toggleBtn.addEventListener('animationend', () => toggleBtn.classList.remove('pulse-once'));
  }

  /* ===========================
     CART HELPERS
     =========================== */
  const getCart = () => {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  };
  const setCart = (items) => localStorage.setItem(CART_KEY, JSON.stringify(items));

  const addItem = ({ name, price, image }) => {
    const cart = getCart();
    const idx = cart.findIndex((i) => i.name === name);
    if (idx > -1) {
      cart[idx].quantity += 1;
    } else {
      cart.push({ name, price: Number(price), image, quantity: 1 });
    }
    setCart(cart);
  };

  const updateQty = (index, delta) => {
    const cart = getCart();
    if (!cart[index]) return;
    cart[index].quantity += delta;
    if (cart[index].quantity < 1) cart[index].quantity = 1;
    setCart(cart);
  };

  const removeItem = (index) => {
    const cart = getCart();
    cart.splice(index, 1);
    setCart(cart);
  };

  /* ===========================
     CATALOG: ADD TO CART
     =========================== */
  document.querySelectorAll('.add-to-cart').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const card = e.currentTarget.closest('.product-card');
      if (!card) return;
      const name = card.dataset.name;
      const price = parseFloat(card.dataset.price);
      const image =
        card.dataset.image ||
        card.querySelector('img')?.getAttribute('src') ||
        '';

      addItem({ name, price, image });

      // feedback
      btn.disabled = true;
      const old = btn.textContent;
      btn.textContent = 'Added!';
      setTimeout(() => { btn.disabled = false; btn.textContent = old; }, 1200);
    });
  });

  /* ===========================
     SCROLL ANIMATIONS
     =========================== */
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    }),
    { threshold: 0.2 }
  );
  document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));

  /* ===========================
     CHECKOUT PAGE
     =========================== */
  if (document.body.classList.contains('checkout-page')) {
    const tbody = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');

    const render = () => {
      const items = getCart();
      tbody.innerHTML = '';

      if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding:1rem;">Your cart is empty.</td></tr>';
        totalEl.textContent = `${CURRENCY} 0.00`;
        return;
      }

      let total = 0;
      items.forEach((item, i) => {
        total += item.price * item.quantity;
        const tr = document.createElement('tr');
        tr.dataset.index = i;
        tr.innerHTML = `
          <td style="padding:0.75rem;">
            <img src="${item.image || ''}" alt="${item.name}"
                 style="width:60px;height:40px;object-fit:cover;border-radius:4px;background:#0e2230;">
          </td>
          <td style="padding:0.75rem;">${item.name}</td>
          <td style="padding:0.75rem;">${CURRENCY} ${item.price.toFixed(2)}</td>
          <td style="padding:0.75rem;">
            <div class="qty-controls">
              <button class="qty-btn minus" aria-label="Decrease">−</button>
              <span class="qty">${item.quantity}</span>
              <button class="qty-btn plus" aria-label="Increase">+</button>
              <button class="remove-btn" aria-label="Remove">🗑</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      totalEl.textContent = `${CURRENCY} ${total.toFixed(2)}`;
    };

    // qty + / − / delete
    tbody.addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      if (!row) return;
      const index = Number(row.dataset.index);

      if (e.target.classList.contains('plus')) {
        updateQty(index, +1);
        render();
      } else if (e.target.classList.contains('minus')) {
        updateQty(index, -1);
        render();
      } else if (e.target.classList.contains('remove-btn')) {
        removeItem(index);
        render();
      }
    });

    // initial paint
    render();

    // Netlify form submit: clear cart, let POST happen
    const form = document.getElementById('checkout-form');
    if (form) {
      form.addEventListener('submit', () => {
        try { localStorage.removeItem(CART_KEY); } catch (e) {}
      });
    }
  }
});

