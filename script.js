
let products = [];
const money = n => "₹" + Number(n).toLocaleString("en-IN");

function getCart() {
  return JSON.parse(localStorage.getItem("cart") || "[]");
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = getCart().reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll(".cart-count").forEach(el => {
    el.textContent = count;
  });
}

function showMessage(id, text, success = true) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text;
    el.className = success ? "success" : "error";
  }
}

// Load products from XML
async function loadProducts() {
  try {
    const response = await fetch("products.xml");
    if (!response.ok) throw new Error("XML file not found");

    const xmlText = await response.text();
    const xml = new DOMParser().parseFromString(
      xmlText, "application/xml"
    );

    if (xml.querySelector("parsererror")) {
      throw new Error("Invalid XML");
    }

    products = [...xml.querySelectorAll("product")].map(p => {
      const value = tag => p.querySelector(tag)?.textContent || "";
      return {
        id: value("id"),
        name: value("name"),
        category: value("category"),
        price: Number(value("price")),
        image: value("image"),
        description: value("description")
      };
    });

    displayProducts();
    displayDetails();
    displayCart();
    displayCheckout();
  } catch (error) {
    ["productList", "featuredProducts", "productDetails"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = "Unable to load products.";
    });
    console.error(error);
  }
}

// Product cards
function productCard(p) {
  const card = document.createElement("div");
  card.className = "product-card";

  const img = document.createElement("img");
  img.src = p.image;
  img.alt = p.name;

  const name = document.createElement("h3");
  name.textContent = p.name;

  const price = document.createElement("p");
  price.className = "price";
  price.textContent = money(p.price);

  const details = document.createElement("a");
  details.href = "details.html?id=" + encodeURIComponent(p.id);
  details.className = "btn";
  details.textContent = "View Details";

  const add = document.createElement("button");
  add.textContent = "Add to Cart";
  add.onclick = () => addToCart(p.id);

  card.append(img, name, price, details, add);
  return card;
}

function displayProducts() {
  const list = document.getElementById("productList");
  const featured = document.getElementById("featuredProducts");

  if (featured) {
    featured.replaceChildren(...products.slice(0, 4).map(productCard));
  }

  if (!list) return;

  const search = document.getElementById("searchInput");
  const category = document.getElementById("categoryFilter");

  function render() {
    const query = search.value.toLowerCase();
    const selected = category.value;

    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(query) &&
      (selected === "All" || p.category === selected)
    );

    list.replaceChildren(...filtered.map(productCard));

    if (!filtered.length) {
      list.textContent = "No products found.";
    }
  }

  search.addEventListener("input", render);
  category.addEventListener("change", render);
  render();
}

// Product details
function displayDetails() {
  const container = document.getElementById("productDetails");
  if (!container) return;

  const id = new URLSearchParams(location.search).get("id");
  const p = products.find(item => item.id === id);

  if (!p) {
    container.textContent = "Product not found.";
    return;
  }

  const layout = document.createElement("div");
  layout.className = "details-layout";

  const img = document.createElement("img");
  img.src = p.image;
  img.alt = p.name;

  const info = document.createElement("div");
  const title = document.createElement("h1");
  title.textContent = p.name;

  const category = document.createElement("p");
  category.textContent = "Category: " + p.category;

  const price = document.createElement("h2");
  price.className = "price";
  price.textContent = money(p.price);

  const description = document.createElement("p");
  description.textContent = p.description;

  const button = document.createElement("button");
  button.textContent = "Add to Cart";
  button.onclick = () => addToCart(p.id);

  info.append(title, category, price, description, button);
  layout.append(img, info);
  container.replaceChildren(layout);
}

// Shopping cart
function addToCart(id) {
  const p = products.find(item => item.id === id);
  if (!p) return;

  const cart = getCart();
  const existing = cart.find(item => item.id === id);

  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id, qty: 1 });
  }

  saveCart(cart);
  alert(p.name + " added to cart!");
}

function cartTotal() {
  return getCart().reduce((total, item) => {
    const p = products.find(product => product.id === item.id);
    return total + (p ? p.price * item.qty : 0);
  }, 0);
}

function changeQuantity(id, qty) {
  const cart = getCart();
  const item = cart.find(p => p.id === id);
  if (!item) return;

  item.qty = Math.max(1, Math.floor(Number(qty) || 1));
  saveCart(cart);
  displayCart();
}

function removeFromCart(id) {
  saveCart(getCart().filter(item => item.id !== id));
  displayCart();
}

function displayCart() {
  const container = document.getElementById("cartItems");
  if (!container) return;

  const cart = getCart();
  container.replaceChildren();

  const checkoutButton = document.getElementById("checkoutButton");

  if (!cart.length) {
    container.textContent = "Your cart is empty.";
    checkoutButton.style.display = "none";
  } else {
    checkoutButton.style.display = "inline-block";
  }

  cart.forEach(item => {
    const p = products.find(product => product.id === item.id);
    if (!p) return;

    const row = document.createElement("div");
    row.className = "cart-item";

    const name = document.createElement("strong");
    name.textContent = p.name;

    const price = document.createElement("span");
    price.textContent = money(p.price * item.qty);

    const qty = document.createElement("input");
    qty.type = "number";
    qty.min = "1";
    qty.value = item.qty;
    qty.setAttribute("aria-label", "Quantity for " + p.name);
    qty.onchange = () => changeQuantity(item.id, qty.value);

    const remove = document.createElement("button");
    remove.textContent = "Remove";
    remove.onclick = () => removeFromCart(item.id);

    row.append(name, price, qty, remove);
    container.append(row);
  });

  document.getElementById("cartTotal").textContent =
    "Total: " + money(cartTotal());
}

// Checkout
function displayCheckout() {
  const total = document.getElementById("checkoutTotal");
  if (!total) return;

  total.textContent = "Order Total: " + money(cartTotal());
}

document.getElementById("checkoutForm")?.addEventListener(
  "submit", function(e) {
    e.preventDefault();

    if (!getCart().length) {
      showMessage("orderMessage", "Your cart is empty.", false);
      return;
    }

    showMessage(
      "orderMessage",
      "Order placed successfully! (Demo order)"
    );

    saveCart([]);
    this.reset();
    displayCheckout();
  }
);

// Demo registration (no real authentication)
document.getElementById("registerForm")?.addEventListener(
  "submit", function(e) {
    e.preventDefault();

    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;

    // Demo only: do not store passwords in the browser.
    sessionStorage.setItem("demoUser", JSON.stringify({
      name, email
    }));

    showMessage(
      "registerMessage",
      "Demo registration successful! You can now use the demo login."
    );
    this.reset();
  }
);

// Demo login
document.getElementById("loginForm")?.addEventListener(
  "submit", function(e) {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const user = JSON.parse(
      sessionStorage.getItem("demoUser") || "null"
    );

    if (user && user.email === email) {
      showMessage("loginMessage", "Welcome, " + user.name + "!");
    } else {
      showMessage(
        "loginMessage",
        "Register in this browser session first.",
        false
      );
    }

    this.reset();
  }
);

// Contact form demo
document.getElementById("contactForm")?.addEventListener(
  "submit", function(e) {
    e.preventDefault();
    showMessage(
      "contactStatus",
      "Message submitted successfully! (Demo only)"
    );
    this.reset();
  }
);

updateCartCount();
loadProducts();
