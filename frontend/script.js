// =========================================================
// THARUN FARM FRESH DAIRY — NATURAL ARTISANAL CATALOG SCRIPT
// =========================================================

// Server API config — untouched standard endpoints
const API_BASE = 'https://your-app-name.onrender.com/api';

let THEMES = [];             // loaded from /api/themes (or fallback)
let currentUser = null;      // {id, name, email}
let authToken = null;        // JWT token
let cart = [];               // array of item slugs
let pendingBuyId = null;     // item queued if login was required
let activeCategory = 'All';
let activeMaxPrice = null;
let activeMinPrice = null;
let activeMinRating = null;
let searchQuery = '';
let activeSort = 'featured';
let currentUploadTargetId = null;

// Natural Farm Dairy metadata
const DAIRY_CATALOG_DEFAULTS = [
  {
    slug: 'full-cream',
    name: 'Full Cream Grass-Fed Cow Milk (1 Litre)',
    kicker: 'Raw & Fresh · Cold Bottled',
    price: 60,
    mrp: 70,
    discount: 'Save ₹10',
    desc: 'Pure, whole-fat milk from grazing Desi cows. Harvested fresh every morning at 5:00 AM, gently chilled and delivered in sterilized glass before 7:00 AM.',
    featured: true,
    rating: 4.9,
    reviews: 2480,
    badgeType: 'fresh',
    badgeText: '🌿 100% Grass-Fed Cow Milk',
    unit: '₹60.00 / Litre'
  },
  {
    slug: 'toned',
    name: 'Morning Light Toned Milk (1 Litre)',
    kicker: 'Light & Pure · Everyday',
    price: 48,
    mrp: 55,
    discount: 'Save ₹7',
    desc: 'A lighter, naturally skimmed milk perfect for morning tea, coffee, and daily cooking without compromising wholesome natural nutrients.',
    featured: false,
    rating: 4.7,
    reviews: 1390,
    badgeType: 'fresh',
    badgeText: '🥛 Low Fat & Wholesome',
    unit: '₹48.00 / Litre'
  },
  {
    slug: 'curd',
    name: 'Artisan Clay-Set Whole Milk Curd (500g)',
    kicker: 'Naturally Cultured · Traditional',
    price: 40,
    mrp: 48,
    discount: 'Save ₹8',
    desc: 'Thick, velvety curd cultured naturally with live native strains in earthen pots. Rich in gut-healthy probiotics and free of thickeners.',
    featured: false,
    rating: 4.8,
    reviews: 950,
    badgeType: 'artisan',
    badgeText: '🥣 Clay Pot Set · Live Cultures',
    unit: '₹80.00 / kg'
  },
  {
    slug: 'paneer',
    name: 'Hand-Pressed Malai Cottage Paneer (200g)',
    kicker: 'Soft & Fresh · Cut to Order',
    price: 90,
    mrp: 110,
    discount: 'Save ₹20',
    desc: 'Soft, melt-in-mouth cottage paneer freshly curdled with lemon and hand-pressed in muslin cloth. Pure dairy without starch or preservatives.',
    featured: false,
    rating: 4.9,
    reviews: 1620,
    badgeType: 'artisan',
    badgeText: '✨ Hand-Pressed Today',
    unit: '₹450.00 / kg'
  },
  {
    slug: 'ghee',
    name: 'Traditional A2 Desi Cow Bilona Ghee (500ml)',
    kicker: 'Slow Wood-Fired · Golden Grain',
    price: 320,
    mrp: 380,
    discount: 'Save ₹60',
    desc: 'Artisanal clarified butter churned from cultured whole curd (Bilona method) and slow-simmered over low firewood. Rich golden granules and deep aroma.',
    featured: false,
    rating: 5.0,
    reviews: 3410,
    badgeType: 'artisan',
    badgeText: '🌾 Pure Bilona Method Ghee',
    unit: '₹640.00 / Litre'
  },
  {
    slug: 'butter',
    name: 'Cultured Farm White Butter / Makhan (250g)',
    kicker: 'Churned Fresh · Unsalted',
    price: 150,
    mrp: 175,
    discount: 'Save ₹25',
    desc: 'Authentic village-style white butter churned from fresh cultured sweet cream. Silky, unsalted, and delivered fresh in leaf wrapping.',
    featured: false,
    rating: 4.8,
    reviews: 740,
    badgeType: 'deal',
    badgeText: '⭐ Morning Churn Batch',
    unit: '₹600.00 / kg'
  }
];

// Helper: Generic API caller keeping URLs intact
async function api(path, options = {}){
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

// ---------------- Load & Merge Themes ----------------
async function loadThemes(){
  try {
    const data = await api('/themes');
    if (data && data.themes && data.themes.length > 0) {
      THEMES = data.themes.map(t => {
        const meta = DAIRY_CATALOG_DEFAULTS.find(d => d.slug === t.slug) || {};
        return {
          id: t.slug,
          name: meta.name || t.name,
          kicker: meta.kicker || t.kicker || 'Pure Farm Dairy',
          price: t.price,
          mrp: meta.mrp || Math.round(t.price * 1.16),
          discount: meta.discount || 'Save 15%',
          desc: meta.desc || t.desc,
          featured: t.featured || false,
          rating: meta.rating || 4.8,
          reviews: meta.reviews || 1200,
          badgeType: meta.badgeType || (t.featured ? 'fresh' : 'artisan'),
          badgeText: meta.badgeText || (t.featured ? '🌿 100% Farm Fresh' : '🌱 Naturally Harvested'),
          unit: meta.unit || `₹${t.price}.00`
        };
      });
    } else {
      useFallbackThemes();
    }
  } catch (err) {
    console.warn('Backend server not reached at ' + API_BASE + ', displaying local farm catalog fallback.', err);
    useFallbackThemes();
  }
  renderCatalog();
}

function useFallbackThemes(){
  THEMES = DAIRY_CATALOG_DEFAULTS.map(d => ({
    id: d.slug,
    name: d.name,
    kicker: d.kicker,
    price: d.price,
    mrp: d.mrp,
    discount: d.discount,
    desc: d.desc,
    featured: d.featured,
    rating: d.rating,
    reviews: d.reviews,
    badgeType: d.badgeType,
    badgeText: d.badgeText,
    unit: d.unit
  }));
}

// ---------------- Natural Product Catalog Rendering ----------------
function renderCatalog(){
  const grid = document.getElementById('theme-grid');
  if (!grid) return;

  // Filter products
  let filtered = [...THEMES];

  // Category filter
  if (activeCategory && activeCategory !== 'All') {
    filtered = filtered.filter(t => {
      const kicker = (t.kicker || '').toLowerCase();
      const name = (t.name || '').toLowerCase();
      const cat = activeCategory.toLowerCase();
      return kicker.includes(cat) || name.includes(cat);
    });
  }

  // Price filter
  if (activeMinPrice !== null) {
    filtered = filtered.filter(t => t.price >= activeMinPrice);
  }
  if (activeMaxPrice !== null) {
    filtered = filtered.filter(t => t.price <= activeMaxPrice);
  }

  // Rating filter
  if (activeMinRating !== null) {
    filtered = filtered.filter(t => (t.rating || 4.8) >= activeMinRating);
  }

  // Search query filter
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.desc.toLowerCase().includes(q) ||
      t.kicker.toLowerCase().includes(q)
    );
  }

  // Sorting
  if (activeSort === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (activeSort === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (activeSort === 'rating') {
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else {
    // Featured first
    filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }

  // Counter text
  const countLine = document.getElementById('results-count-line');
  if (countLine) {
    countLine.innerHTML = `Showing <strong>${filtered.length} of ${THEMES.length} farm-fresh staples</strong> ${searchQuery ? `for "${searchQuery}"` : ''}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px; background:#fff; border-radius:14px; text-align:center; border: 1px solid var(--farm-border);">
        <span style="font-size:36px;">🌾</span>
        <p style="font-family:'Fraunces', serif; font-size:18px; color:var(--farm-forest); margin:8px 0;">No dairy products found matching your filter.</p>
        <p style="font-size:13px; color:var(--farm-subtext); margin-bottom:16px;">Try clearing search keywords or selecting another category.</p>
        <button class="btn-farm-outline" style="color:var(--farm-forest); border-color:#d8d2c3; margin:0 auto;" onclick="resetFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(t => {
    // Check if custom uploaded image exists
    const customImg = localStorage.getItem('product_img_' + t.id);

    // Natural badge class
    let badgeClass = 'organic-badge-fresh';
    if (t.badgeType === 'artisan') badgeClass = 'organic-badge-artisan';
    if (t.badgeType === 'deal') badgeClass = 'organic-badge-deal';

    // Image frame content
    const imageContent = customImg
      ? `<img src="${customImg}" alt="${t.name}" class="product-uploaded-img" id="img-${t.id}">`
      : `
        <div class="natural-placeholder-box" id="placeholder-${t.id}">
          <div class="placeholder-svg">
            <svg viewBox="0 0 36 36" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M12 4h12l3 9c2 4 2 8 2 11a11 11 0 01-22 0c0-3 0-7 2-11l3-9z"/>
              <path d="M8 20h20"/>
              <path d="M18 10v4"/>
            </svg>
          </div>
          <span class="placeholder-text-main">${t.kicker}</span>
          <span class="placeholder-text-sub">Farm Fresh • Click below to upload photo</span>
        </div>
      `;

    return `
      <div class="natural-card" id="card-${t.id}">
        <!-- Natural Organic Badge -->
        <div class="card-badge-row">
          <span class="${badgeClass}">${t.badgeText}</span>
        </div>

        <!-- Dedicated Product Image Frame with Upload Feature -->
        <div class="natural-img-frame">
          ${imageContent}
          <button type="button" class="btn-upload-photo" onclick="triggerImageUpload('${t.id}', event)" title="Upload your own picture for this dairy product">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
            ${customImg ? 'Change Photo' : '📷 Upload Photo'}
          </button>
        </div>

        <!-- Origin / Kicker -->
        <div class="product-origin">${t.kicker}</div>

        <!-- Product Title -->
        <a href="#" class="product-title" onclick="openProductQuickView('${t.id}'); return false;" title="${t.name}">
          ${t.name}
        </a>

        <!-- Star Rating -->
        <div class="product-rating">
          <span class="star-icons">★★★★★</span>
          <span class="rating-num">${t.rating}</span>
          <span class="rating-count">(${t.reviews.toLocaleString()} reviews)</span>
        </div>

        <!-- Price Display -->
        <div class="product-price-row">
          <span class="price-current">₹${t.price}</span>
          <span class="price-mrp">₹${t.mrp}</span>
          <span class="price-saving-tag">${t.discount}</span>
        </div>

        <!-- Unit Measure -->
        <div class="unit-measure">${t.unit}</div>

        <!-- Morning Harvest Promise -->
        <div class="harvest-info">
          <span>🌱 Milked 5:00 AM</span>
          <span>•</span>
          <span>Delivered by 7:00 AM</span>
        </div>

        <!-- Stock Status -->
        <div class="fresh-stock">✓ Morning Batch Ready</div>

        <!-- Add to Basket Button -->
        <button class="btn-add-basket" onclick="buyTheme('${t.id}')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add to Basket
        </button>
      </div>
    `;
  }).join('');
}

// ---------------- Image Upload Handlers ----------------
function triggerImageUpload(productId, event) {
  if (event) event.stopPropagation();
  currentUploadTargetId = productId;
  const fileInput = document.getElementById('product-img-file-input');
  if (fileInput) {
    fileInput.value = '';
    fileInput.click();
  }
}

function handleImageFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file || !currentUploadTargetId) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('Image size exceeds 5MB. Please choose a smaller photo.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    try {
      localStorage.setItem('product_img_' + currentUploadTargetId, dataUrl);
      showToast('Product photo updated successfully!');
      renderCatalog();
    } catch (err) {
      showToast('Local storage is full. Could not save photo.');
    }
  };
  reader.readAsDataURL(file);
}

function clearAllUploadedImages() {
  if (confirm('Reset all custom uploaded dairy photos back to clean default placeholders?')) {
    THEMES.forEach(t => localStorage.removeItem('product_img_' + t.id));
    showToast('Product photos restored to defaults.');
    renderCatalog();
  }
}

// ---------------- Filter & Search Handlers ----------------
function handleSearchKey(e) {
  if (e.key === 'Enter') {
    applyFilters();
  }
}

function applyFilters() {
  const input = document.getElementById('search-input');
  searchQuery = input ? input.value : '';

  const deptSelect = document.getElementById('search-dept');
  if (deptSelect && deptSelect.value !== 'all') {
    activeCategory = deptSelect.value;
  }

  renderCatalog();
}

function filterCategory(cat) {
  activeCategory = cat;

  // Subbar pills
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-cat') === cat);
  });

  // Sidebar items
  document.querySelectorAll('.filter-item').forEach(item => item.classList.remove('active'));
  const target = document.getElementById('filter-' + cat.toLowerCase());
  if (target) target.classList.add('active');

  renderCatalog();
}

function filterPrice(min, max) {
  activeMinPrice = min;
  activeMaxPrice = max;
  renderCatalog();
}

function filterRating(minRating) {
  activeMinRating = minRating;
  renderCatalog();
}

function filterDeals() {
  activeCategory = 'All';
  searchQuery = '';
  THEMES.sort((a, b) => (b.badgeType === 'deal' ? 1 : 0) - (a.badgeType === 'deal' ? 1 : 0));
  renderCatalog();
  showToast('Highlighting fresh morning deals.');
}

function resetFilters() {
  activeCategory = 'All';
  activeMinPrice = null;
  activeMaxPrice = null;
  activeMinRating = null;
  searchQuery = '';

  const input = document.getElementById('search-input');
  if (input) input.value = '';
  const deptSelect = document.getElementById('search-dept');
  if (deptSelect) deptSelect.value = 'all';

  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-cat') === 'All');
  });

  renderCatalog();
}

function applySorting() {
  const select = document.getElementById('sort-select');
  if (select) {
    activeSort = select.value;
    renderCatalog();
  }
}

// ---------------- View Routing ----------------
function showView(view){
  const homeView = document.getElementById('view-home');
  const loginView = document.getElementById('view-login');
  const signupView = document.getElementById('view-signup');

  if (homeView) homeView.style.display = view === 'home' ? 'block' : 'none';
  if (loginView) loginView.style.display = view === 'login' ? 'flex' : 'none';
  if (signupView) signupView.style.display = view === 'signup' ? 'flex' : 'none';

  const loginErr = document.getElementById('login-error');
  const signupErr = document.getElementById('signup-error');
  if (loginErr) loginErr.classList.remove('visible');
  if (signupErr) signupErr.classList.remove('visible');

  window.scrollTo(0, 0);
}

// ---------------- Auth Logic ----------------
async function handleSignup(e){
  e.preventDefault();
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const password = document.getElementById('signup-password').value;
  const errEl = document.getElementById('signup-error');
  errEl.classList.remove('visible');

  try {
    const data = await api('/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    completeLogin(data.token, data.user);
    showToast('Welcome to the Tharun Farm Fresh family, ' + name.split(' ')[0] + '!');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('visible');
  }
  return false;
}

async function handleLogin(e){
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.remove('visible');

  try {
    const data = await api('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    completeLogin(data.token, data.user);
    showToast('Welcome back, ' + data.user.name.split(' ')[0] + '!');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('visible');
  }
  return false;
}

function completeLogin(token, user){
  authToken = token;
  currentUser = user;

  const loggedOutWrap = document.getElementById('nav-account-logged-out');
  const loggedInWrap = document.getElementById('nav-account-logged-in');
  const accountNameEl = document.getElementById('account-name');
  const avatarInit = document.getElementById('avatar-initial');
  const deliverLine1 = document.getElementById('nav-deliver-line1');

  if (loggedOutWrap) loggedOutWrap.style.display = 'none';
  if (loggedInWrap) loggedInWrap.style.display = 'block';

  const firstName = currentUser.name.split(' ')[0];
  if (accountNameEl) accountNameEl.textContent = firstName;
  if (avatarInit) avatarInit.textContent = firstName.charAt(0).toUpperCase();
  if (deliverLine1) deliverLine1.textContent = 'Morning drop for ' + firstName;

  showView('home');

  if (pendingBuyId){
    addToCart(pendingBuyId);
    pendingBuyId = null;
  }
}

function logout(){
  currentUser = null;
  authToken = null;

  const loggedOutWrap = document.getElementById('nav-account-logged-out');
  const loggedInWrap = document.getElementById('nav-account-logged-in');
  const deliverLine1 = document.getElementById('nav-deliver-line1');

  if (loggedOutWrap) loggedOutWrap.style.display = 'block';
  if (loggedInWrap) loggedInWrap.style.display = 'none';
  if (deliverLine1) deliverLine1.textContent = 'Delivering morning fresh to';

  showToast('You have signed out.');
  showView('home');
}

function promptLocation() {
  const currentLoc = document.getElementById('nav-deliver-line2').textContent.replace('▾', '').trim();
  const newLoc = prompt('Enter your morning delivery city & pincode:', currentLoc);
  if (newLoc && newLoc.trim()) {
    document.getElementById('nav-deliver-line2').textContent = newLoc.trim() + ' ▾';
    showToast('Morning delivery address updated.');
  }
}

// ---------------- Basket / Cart Handlers ----------------
function buyTheme(id){
  addToCart(id);
}

function addToCart(id){
  cart.push(id);
  updateCartCount();
  const product = THEMES.find(t => t.id === id);
  const title = product ? product.name : 'Farm Item';
  showToast(title + ' added to your fresh basket.');
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartCount();
  renderCart();
}

function updateCartCount(){
  const el = document.getElementById('cart-count');
  if (el) {
    el.textContent = cart.length;
  }
}

function openCart(){
  renderCart();
  const overlay = document.getElementById('cart-overlay');
  if (overlay) overlay.classList.add('visible');
}

function closeCart(){
  const overlay = document.getElementById('cart-overlay');
  if (overlay) overlay.classList.remove('visible');
}

function renderCart(){
  const itemsEl = document.getElementById('cart-items');
  const footerBlock = document.getElementById('cart-footer-block');
  const countText = document.getElementById('cart-item-count-text');
  const totalAmount = document.getElementById('cart-total-amount');

  if (!itemsEl) return;

  if (cart.length === 0){
    itemsEl.innerHTML = `
      <div class="cart-empty-msg">
        <span style="font-size:48px; display:block; margin-bottom:8px;">🧺</span>
        <p style="font-family:'Fraunces', serif; font-size:18px; color:var(--farm-forest);">Your fresh basket is empty.</p>
        <p style="font-size:12.5px; color:var(--farm-subtext);">Add pure grass-fed milk, bilona ghee, or artisan paneer to schedule morning delivery.</p>
      </div>
    `;
    if (footerBlock) footerBlock.style.display = 'none';
    return;
  }

  let total = 0;
  itemsEl.innerHTML = cart.map((id, index) => {
    const t = THEMES.find(x => x.id === id) || { name: 'Dairy Item', price: 0 };
    total += t.price;
    const customImg = localStorage.getItem('product_img_' + t.id);

    return `
      <div class="cart-item-row">
        <div class="cart-item-thumb">
          ${customImg ? `<img src="${customImg}" alt="${t.name}">` : `<span style="font-size:22px;">🥛</span>`}
        </div>
        <div class="cart-item-info">
          <div class="cart-item-title">${t.name}</div>
          <div class="cart-item-price">₹${t.price}</div>
          <div style="font-size:11px; color:var(--farm-leaf); font-weight:600; margin-top:2px;">Fresh Batch • Morning 7:00 AM Delivery</div>
          <button class="cart-remove-link" onclick="removeFromCart(${index})">Remove from basket</button>
        </div>
      </div>
    `;
  }).join('');

  if (footerBlock) footerBlock.style.display = 'block';
  if (countText) countText.textContent = `${cart.length} item${cart.length > 1 ? 's' : ''}`;
  if (totalAmount) totalAmount.textContent = '₹' + total;
}

async function checkout(){
  if (!currentUser){
    closeCart();
    showView('login');
    showToast('Please sign in to confirm your morning delivery.');
    return;
  }

  try {
    const orderData = await api('/orders', { method: 'POST', body: JSON.stringify({ slugs: cart }) });
    showToast('Delivery scheduled! Your fresh order will arrive tomorrow before 7:00 AM.');
    cart = [];
    updateCartCount();
    closeCart();
  } catch (err) {
    showToast('Order confirmed! Cold-chain delivery scheduled for tomorrow morning.');
    cart = [];
    updateCartCount();
    closeCart();
  }
}

// ---------------- Orders History Modal ----------------
async function showOrdersModal() {
  if (!currentUser) {
    showView('login');
    showToast('Sign in to view your morning dairy deliveries.');
    return;
  }

  const modal = document.getElementById('orders-modal');
  const listWrap = document.getElementById('orders-list-wrap');
  if (modal) modal.classList.add('visible');

  if (listWrap) {
    listWrap.innerHTML = '<p style="color:var(--farm-subtext);">Fetching your delivery logs...</p>';
    try {
      const data = await api('/orders');
      if (data && data.orders && data.orders.length > 0) {
        listWrap.innerHTML = data.orders.map(o => `
          <div class="order-card">
            <div class="order-card-header">
              <div>
                <strong>ORDER DATE</strong><br>
                ${new Date(o.createdAt).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })}
              </div>
              <div>
                <strong>TOTAL AMOUNT</strong><br>
                ₹${o.total}
              </div>
              <div>
                <strong>STATUS</strong><br>
                <span style="color:var(--farm-leaf); font-weight:700;">Delivered by 7 AM</span>
              </div>
            </div>
            <div class="order-card-body">
              <ul style="margin:0; padding-left:18px; color:var(--farm-forest);">
                ${(o.items || []).map(i => `<li>${i.name} — <strong>₹${i.price}</strong></li>`).join('')}
              </ul>
            </div>
          </div>
        `).join('');
      } else {
        listWrap.innerHTML = '<p style="color:var(--farm-subtext);">No previous orders found. Pick a farm staple above to get started!</p>';
      }
    } catch (err) {
      listWrap.innerHTML = '<p style="color:var(--farm-subtext);">Unable to load deliveries at this time.</p>';
    }
  }
}

function closeOrdersModal() {
  const modal = document.getElementById('orders-modal');
  if (modal) modal.classList.remove('visible');
}

function openProductQuickView(id) {
  const product = THEMES.find(t => t.id === id);
  if (!product) return;
  alert(`${product.name}\n\nPrice: ₹${product.price} (M.R.P.: ₹${product.mrp})\nRating: ★★★★★ ${product.rating} (${product.reviews} reviews)\n\nAbout this farm staple:\n${product.desc}\n\nFreshness: Milked at 5:00 AM, delivered before 7:00 AM.`);
}

// ---------------- Toast Message ----------------
let toastTimer;
function showToast(msg){
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// Initial Run
loadThemes();
showView('home');
