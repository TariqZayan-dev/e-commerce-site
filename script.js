/*
 * Ecommerce Website Script
 *
 * Handles scroll-triggered animations, simple cart storage via localStorage,
 * and page transitions between catalog, checkout and thanks pages.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Scroll animations using IntersectionObserver
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  document.querySelectorAll('.animate-on-scroll').forEach((el) => {
    observer.observe(el);
  });

  // Cart functions
  const cartKey = 'ecommerce_cart';

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(cartKey)) || [];
    } catch (e) {
      return [];
    }
  }

  function setCart(items) {
    localStorage.setItem(cartKey, JSON.stringify(items));
  }

  // Add to cart buttons
  document.querySelectorAll('.add-to-cart').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const productCard = e.currentTarget.closest('.product-card');
      const name = productCard.dataset.name;
      const price = parseFloat(productCard.dataset.price);
      const image = productCard.dataset.image;
      const cart = getCart();
      cart.push({ name, price, image, quantity: 1 });
      setCart(cart);
      // Provide feedback to user
      e.currentTarget.innerText = 'Added!';
      setTimeout(() => {
        e.currentTarget.innerText = 'Add to Cart';
      }, 1500);
    });
  });

  // On checkout page: populate table and handle form submission
  if (document.body.classList.contains('checkout-page')) {
    const cartTable = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const items = getCart();
    if (items.length === 0) {
      cartTable.innerHTML = '<tr><td colspan="4">Your cart is empty.</td></tr>';
      cartTotal.innerText = '0.00';
    } else {
      let total = 0;
      items.forEach((item) => {
        total += item.price * item.quantity;
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><img src="AED{item.image}" alt="AED{item.name}" style="width:60px;height:40px;object-fit:cover;border-radius:4px;"></td>
          <td>AED{item.name}</td>
          <td>AED{item.price.toFixed(2)}</td>
          <td>AED{item.quantity}</td>
        `;
        cartTable.appendChild(row);
      });
      cartTotal.innerText = total.toFixed(2);
    }
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Clear cart and redirect to thanks page
        localStorage.removeItem(cartKey);
        window.location.href = 'thanks.html';
      });
    }
  }
});