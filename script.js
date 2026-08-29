document.getElementById('year').textContent = new Date().getFullYear();

/* ================= GLOBAL TELEGRAM NOTIFIER ================= */
const TG_BOT_TOKEN = '8607378061:AAEUhBBox9Oj92tQxjz_q1HN2T7MidQ09ws';
const TG_CHAT_ID = '256514509';
function sendTelegramMessage(text){
  fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text: text })
  })
  .then(res => res.json())
  .then(data => { if(!data.ok) console.error('Telegram API вернул ошибку:', data); })
  .catch(err => console.error('Telegram: не удалось отправить запрос:', err));
}

const form = document.getElementById('orderForm');
const msg = document.getElementById('formMsg');

form.addEventListener('submit', function(e){
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const brand = document.getElementById('brand').value;
  const part = document.getElementById('part').value.trim();

  if(!name || !phone || !brand || !part){
    msg.textContent = 'Пожалуйста, заполните все поля.';
    msg.className = '';
    return;
  }

  sendTelegramMessage(
    `📝 Новая заявка — AvtoLider\n\n` +
    `Имя: ${name}\n` +
    `Телефон: ${phone}\n` +
    `Марка: ${brand}\n` +
    `Нужна деталь: ${part}`
  );

  msg.textContent = `Спасибо, ${name}! Заявка принята — мы свяжемся с вами по номеру ${phone}.`;
  msg.className = 'ok';
  form.reset();
});

/* ================= LOGIN MODAL LOGIC ================= */
(function(){
  const SEND_URL  = 'https://rest.sergosht-api.uz/api/send-verification-code';
  const CHECK_URL = 'https://rest.sergosht-api.uz/api/check-verification-code';

  const overlay      = document.getElementById('loginOverlay');
  const openBtn       = document.getElementById('openLogin');
  const closeBtn       = document.getElementById('closeLogin');

  const stepPhone   = document.getElementById('stepPhone');
  const stepCode    = document.getElementById('stepCode');
  const stepName    = document.getElementById('stepName');
  const stepSuccess = document.getElementById('stepSuccess');

  const phoneInput   = document.getElementById('loginPhone');
  const sendBtn       = document.getElementById('sendCodeBtn');
  const phoneError    = document.getElementById('phoneError');

  const codePhoneLabel = document.getElementById('codePhoneLabel');
  const otpDigits       = Array.from(document.querySelectorAll('.otp-digit'));
  const verifyBtn        = document.getElementById('verifyCodeBtn');
  const codeError         = document.getElementById('codeError');
  const backToPhone        = document.getElementById('backToPhone');
  const resendLink          = document.getElementById('resendCode');

  const loginFirstName = document.getElementById('loginFirstName');
  const loginLastName  = document.getElementById('loginLastName');
  const nameError        = document.getElementById('nameError');
  const saveNameBtn        = document.getElementById('saveNameBtn');

  let currentPhone = '';
  let resendTimer = null;
  let resendSeconds = 0;

  function fullPhone(){
    return '998' + phoneInput.value.replace(/\D/g,'');
  }

  function openModal(){
    overlay.classList.add('open');
    goToStep('phone');
    document.addEventListener('keydown', onEsc);
  }
  window.openLoginModal = openModal;
  function closeModal(){
    overlay.classList.remove('open');
    document.removeEventListener('keydown', onEsc);
  }
  function onEsc(e){ if(e.key === 'Escape') closeModal(); }

  openBtn.addEventListener('click', () => {
    if(window.openProfileModal && window.isLoggedIn && window.isLoggedIn()){
      window.openProfileModal();
    } else {
      openModal();
    }
  });
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function(e){ if(e.target === overlay) closeModal(); });

  function goToStep(name){
    [stepPhone, stepCode, stepName, stepSuccess].forEach(s => s.classList.remove('active'));
    if(name === 'phone'){ stepPhone.classList.add('active'); phoneError.textContent=''; setTimeout(()=>phoneInput.focus(), 50); }
    if(name === 'code'){ stepCode.classList.add('active'); codeError.textContent=''; otpDigits.forEach(d=>{d.value='';d.classList.remove('filled');}); setTimeout(()=>otpDigits[0].focus(), 50); }
    if(name === 'name'){ stepName.classList.add('active'); nameError.textContent=''; loginFirstName.value=''; loginLastName.value=''; setTimeout(()=>loginFirstName.focus(), 50); }
    if(name === 'success'){ stepSuccess.classList.add('active'); setTimeout(closeModal, 1600); }
  }

  saveNameBtn.addEventListener('click', () => {
    const first = loginFirstName.value.trim();
    const last = loginLastName.value.trim();
    if(!first || !last){
      nameError.textContent = 'Укажите имя и фамилию.';
      return;
    }
    if(window.onAuthSuccess) window.onAuthSuccess(currentPhone, first, last);
    goToStep('success');
  });

  function setLoading(btn, isLoading){
    btn.classList.toggle('loading', isLoading);
    btn.disabled = isLoading;
  }

  function startResendTimer(){
    resendSeconds = 30;
    resendLink.classList.add('disabled');
    clearInterval(resendTimer);
    resendTimer = setInterval(()=>{
      resendSeconds--;
      resendLink.textContent = `Повторно через ${resendSeconds} сек`;
      if(resendSeconds <= 0){
        clearInterval(resendTimer);
        resendLink.textContent = 'Отправить код повторно';
        resendLink.classList.remove('disabled');
      }
    }, 1000);
  }

  async function sendCode(){
    const digits = phoneInput.value.replace(/\D/g,'');
    if(digits.length < 9){
      phoneError.textContent = 'Введите корректный номер телефона.';
      return;
    }
    phoneError.textContent = '';
    currentPhone = fullPhone();
    setLoading(sendBtn, true);
    try{
      const res = await fetch(SEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: currentPhone })
      });
      if(!res.ok) throw new Error('send-failed');
      codePhoneLabel.textContent = '+' + currentPhone;
      goToStep('code');
      startResendTimer();
    }catch(err){
      phoneError.textContent = 'Не удалось отправить код. Проверьте номер и попробуйте ещё раз.';
    }finally{
      setLoading(sendBtn, false);
    }
  }

  sendBtn.addEventListener('click', sendCode);
  phoneInput.addEventListener('keydown', e => { if(e.key === 'Enter') sendCode(); });
  phoneInput.addEventListener('input', () => { phoneInput.value = phoneInput.value.replace(/\D/g,''); });

  resendLink.addEventListener('click', () => { if(!resendLink.classList.contains('disabled')) sendCode(); });
  backToPhone.addEventListener('click', () => goToStep('phone'));

  // OTP boxes: auto-advance, backspace, paste
  otpDigits.forEach((input, i) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g,'').slice(0,1);
      input.classList.toggle('filled', !!input.value);
      if(input.value && i < otpDigits.length - 1){ otpDigits[i+1].focus(); }
      if(otpDigits.every(d => d.value)) verifyCode();
    });
    input.addEventListener('keydown', e => {
      if(e.key === 'Backspace' && !input.value && i > 0){ otpDigits[i-1].focus(); }
    });
    input.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData.getData('text') || '').replace(/\D/g,'').slice(0, otpDigits.length);
      text.split('').forEach((ch, idx) => { if(otpDigits[idx]){ otpDigits[idx].value = ch; otpDigits[idx].classList.add('filled'); } });
      if(text.length === otpDigits.length) verifyCode();
    });
  });

  async function verifyCode(){
    const code = otpDigits.map(d => d.value).join('');
    if(code.length < otpDigits.length){
      codeError.textContent = 'Введите все цифры кода.';
      return;
    }
    codeError.textContent = '';
    setLoading(verifyBtn, true);
    try{
      const res = await fetch(CHECK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: currentPhone, code: code })
      });
      if(!res.ok) throw new Error('verify-failed');
      goToStep('name');
    }catch(err){
      codeError.textContent = 'Неверный код. Попробуйте снова.';
    }finally{
      setLoading(verifyBtn, false);
    }
  }

  verifyBtn.addEventListener('click', verifyCode);
})();

/* ================= CATALOG · CART · CHECKOUT · PROFILE ================= */
(function(){
  function sendTelegramNotification(order){
    const lines = order.items.map(it => `• ${it.name} × ${it.qty} — ${it.price.toLocaleString('ru-RU').replace(/,/g,' ')} сум`).join('\n');
    const text =
      `🛒 Новый заказ — AvtoLider\n\n` +
      `Имя: ${order.firstName} ${order.lastName}\n` +
      `Телефон: +${order.phone}\n` +
      `Адрес: ${order.address}\n\n` +
      `Товары:\n${lines}\n\n` +
      `Итого: ${order.total.toLocaleString('ru-RU').replace(/,/g,' ')} сум`;
    sendTelegramMessage(text);
  }

  /* ---------- toast ---------- */
  const toastContainer = document.getElementById('toastContainer');
  function showToast(text, type){
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = text;
    toastContainer.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 350);
    }, 3200);
  }

  /* ---------- icons ---------- */
  const ICONS = {
    shock:   '<circle cx="32" cy="14" r="6"/><rect x="27" y="20" width="10" height="26" rx="3"/><circle cx="32" cy="52" r="5"/>',
    arm:     '<rect x="8" y="29" width="48" height="6" rx="3"/><circle cx="12" cy="32" r="7"/><circle cx="52" cy="32" r="7"/>',
    hub:     '<circle cx="32" cy="32" r="17"/><circle cx="32" cy="32" r="5"/><circle cx="32" cy="17" r="2.5"/><circle cx="47" cy="32" r="2.5"/><circle cx="32" cy="47" r="2.5"/><circle cx="17" cy="32" r="2.5"/>',
    balljoint: '<circle cx="32" cy="22" r="11"/><rect x="28" y="33" width="8" height="21" rx="3"/>',
    tierod:  '<circle cx="11" cy="32" r="6"/><rect x="17" y="28" width="30" height="8" rx="4"/><circle cx="53" cy="32" r="6"/>',
    brake:   '<circle cx="32" cy="32" r="19"/><circle cx="32" cy="32" r="7"/><line x1="32" y1="13" x2="32" y2="20"/><line x1="32" y1="44" x2="32" y2="51"/><line x1="13" y1="32" x2="20" y2="32"/><line x1="44" y1="32" x2="51" y2="32"/>',
    engine:  '<rect x="12" y="22" width="40" height="28" rx="3"/><rect x="19" y="10" width="11" height="13" rx="2"/><rect x="34" y="10" width="11" height="13" rx="2"/>',
    head:    '<rect x="10" y="25" width="44" height="18" rx="3"/><circle cx="19" cy="34" r="3.5"/><circle cx="32" cy="34" r="3.5"/><circle cx="45" cy="34" r="3.5"/>',
    piston:  '<rect x="21" y="9" width="22" height="17" rx="3"/><rect x="28" y="26" width="8" height="17"/><circle cx="32" cy="47" r="7"/>',
    timing:  '<circle cx="19" cy="32" r="11"/><circle cx="45" cy="32" r="11"/><path d="M19 21 A11 11 0 0 1 45 21"/><path d="M19 43 A11 11 0 0 0 45 43"/>',
    gasket:  '<circle cx="32" cy="32" r="19"/><circle cx="32" cy="32" r="11"/>',
    pump:    '<circle cx="26" cy="32" r="15"/><rect x="39" y="25" width="15" height="14" rx="2"/>'
  };
  function iconSvg(key){
    return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[key]}</svg>`;
  }

  const CAT_LABELS = {
    shock:'Амортизаторы и стойки', arm:'Рычаги подвески', hub:'Ступицы и подшипники',
    balljoint:'Шаровая опора', tierod:'Рулевая тяга', brake:'Тормозная система',
    engine:'ДВС / блок цилиндров', head:'ГБЦ', piston:'Поршневая группа',
    timing:'Ремень / цепь ГРМ', gasket:'Прокладки и сальники', pump:'Помпа / термостат'
  };
  const CHASSIS_CATS = ['shock','arm','hub','balljoint','tierod','brake'];
  const ENGINE_CATS  = ['engine','head','piston','timing','gasket','pump'];
  const ALL_CATS = [...CHASSIS_CATS, ...ENGINE_CATS];
  const PRICE_RANGE = {
    shock:[420000,980000], arm:[260000,650000], hub:[180000,420000],
    balljoint:[90000,220000], tierod:[130000,310000], brake:[150000,480000],
    engine:[9000000,18000000], head:[3200000,6800000], piston:[850000,1900000],
    timing:[320000,780000], gasket:[60000,260000], pump:[210000,540000]
  };

  const BRANDS = [
    { name:'Kia',       code:'KIA', models:['Cerato','Rio','Sportage','Sorento','K5','Soul','Optima','Picanto','Seltos','Stinger'] },
    { name:'Hyundai',   code:'HYU', models:['Solaris','Elantra','Tucson','Santa Fe','Creta','Accent','Sonata','i30','Palisade','Venue'] },
    { name:'Chevrolet', code:'CHV', models:['Cobalt','Nexia','Spark','Malibu','Captiva','Tracker','Onix','Lacetti','Aveo','Cruze'] },
    { name:'Haval',     code:'HAV', models:['F7','H6','Jolion','Dargo','M6','F7x','H9','H2','Big Dog','F7 EV'] },
    { name:'BYD',       code:'BYD', models:['Song Plus','Han','Tang','Atto 3','F3','Qin Plus','Yuan Plus','Seal','Destroyer 05','e2'] },
    { name:'Chery',     code:'CHE', models:['Tiggo 7 Pro','Tiggo 8 Pro','Tiggo 4','Arrizo 5','Tiggo 2','Tiggo 3','Tiggo 8','Karry','Bonus','Amulet'] }
  ];

  function formatPrice(n){
    return n.toLocaleString('ru-RU').replace(/,/g,' ') + ' сум';
  }

  /* ---------- generate 1000 products per brand ---------- */
  const PRODUCTS = [];
  BRANDS.forEach(brand => {
    for(let i = 0; i < 1000; i++){
      const cat = ALL_CATS[i % ALL_CATS.length];
      const model = brand.models[i % brand.models.length];
      const yearStart = 2012 + (i % 11);
      const yearEnd = yearStart + 4;
      const [minP, maxP] = PRICE_RANGE[cat];
      const price = Math.round((minP + Math.random() * (maxP - minP)) / 5000) * 5000;
      const variant = i % 2 === 0 ? 'Оригинал' : 'Аналог';
      const id = `${brand.code}-${i}`;
      PRODUCTS.push({
        id, brand: brand.name, cat, group: CHASSIS_CATS.includes(cat) ? 'chas' : 'eng',
        name: `${CAT_LABELS[cat]} — ${brand.name} ${model} (${yearStart}–${yearEnd})`,
        part: `${brand.code}-${cat.toUpperCase().slice(0,3)}-${String(i+1).padStart(4,'0')}`,
        variant, price
      });
    }
  });
  const PRODUCTS_BY_ID = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

  /* ---------- catalog rendering ---------- */
  const brandTabsEl = document.getElementById('brandTabs');
  const gridEl = document.getElementById('productGrid');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const PAGE_SIZE = 30;
  let currentBrand = BRANDS[0].name;
  let visibleCount = PAGE_SIZE;

  brandTabsEl.innerHTML = BRANDS.map(b =>
    `<button class="brand-tab${b.name === currentBrand ? ' active' : ''}" data-brand="${b.name}">${b.name}</button>`
  ).join('');

  function cardHTML(p){
    return `
      <div class="product-card" data-id="${p.id}">
        <div class="product-thumb">
          <span class="cat-tag ${p.group}">${p.group === 'chas' ? 'Ходовая' : 'Мотор'}</span>
          ${iconSvg(p.cat)}
        </div>
        <h4>${p.name}</h4>
        <div class="product-part">${p.part} · ${p.variant}</div>
        <div class="product-footer">
          <span class="product-price">${formatPrice(p.price)}</span>
          <button class="add-cart-btn" data-id="${p.id}" aria-label="В корзину">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          </button>
        </div>
      </div>`;
  }

  function renderGrid(){
    const items = PRODUCTS.filter(p => p.brand === currentBrand).slice(0, visibleCount);
    gridEl.innerHTML = items.map(cardHTML).join('');
    loadMoreBtn.style.display = visibleCount < 1000 ? 'inline-block' : 'none';
  }

  brandTabsEl.addEventListener('click', e => {
    const btn = e.target.closest('.brand-tab');
    if(!btn) return;
    currentBrand = btn.dataset.brand;
    visibleCount = PAGE_SIZE;
    brandTabsEl.querySelectorAll('.brand-tab').forEach(t => t.classList.toggle('active', t === btn));
    renderGrid();
    document.getElementById('catalog').scrollIntoView({ behavior:'smooth', block:'start' });
  });

  loadMoreBtn.addEventListener('click', () => {
    visibleCount = Math.min(visibleCount + PAGE_SIZE, 1000);
    renderGrid();
  });

  gridEl.addEventListener('click', e => {
    const addBtn = e.target.closest('.add-cart-btn');
    if(addBtn){ addToCart(addBtn.dataset.id); return; }
    const card = e.target.closest('.product-card');
    if(card) openProductModal(card.dataset.id);
  });

  renderGrid();

  /* ---------- cart (persisted in localStorage) ---------- */
  function loadCart(){
    try{
      const raw = localStorage.getItem('avtolider_cart');
      if(!raw) return {};
      const parsed = JSON.parse(raw);
      // оставляем только id, которые всё ещё существуют в каталоге
      const clean = {};
      Object.entries(parsed).forEach(([id, qty]) => { if(PRODUCTS_BY_ID[id] && qty > 0) clean[id] = qty; });
      return clean;
    }catch(e){ return {}; }
  }
  function saveCart(){
    try{ localStorage.setItem('avtolider_cart', JSON.stringify(cart)); }catch(e){}
  }

  const cart = loadCart(); // id -> qty
  const cartBadge = document.getElementById('cartBadge');
  const cartItemsEl = document.getElementById('cartItems');
  const cartTotalEl = document.getElementById('cartTotal');
  const cartOverlay = document.getElementById('cartOverlay');

  function cartCount(){ return Object.values(cart).reduce((a,b) => a+b, 0); }
  function cartTotal(){ return Object.entries(cart).reduce((sum,[id,qty]) => sum + PRODUCTS_BY_ID[id].price*qty, 0); }

  function addToCart(id, qty){
    qty = qty || 1;
    cart[id] = (cart[id] || 0) + qty;
    updateCartUI();
    showToast('Добавлено в корзину: ' + PRODUCTS_BY_ID[id].name.split(' — ')[0]);
  }

  function updateCartUI(){
    saveCart();
    const count = cartCount();
    cartBadge.textContent = count;
    cartBadge.hidden = count === 0;

    const ids = Object.keys(cart);
    if(ids.length === 0){
      cartItemsEl.innerHTML = '<div class="cart-empty">Корзина пуста</div>';
    } else {
      cartItemsEl.innerHTML = ids.map(id => {
        const p = PRODUCTS_BY_ID[id];
        const qty = cart[id];
        return `
          <div class="cart-item">
            <div class="cart-item-thumb">${iconSvg(p.cat)}</div>
            <div class="cart-item-info">
              <h5>${p.name}</h5>
              <div class="cart-item-price">${formatPrice(p.price)}</div>
              <div class="cart-item-controls">
                <button class="qty-btn" data-act="dec" data-id="${id}">−</button>
                <span class="qty-val">${qty}</span>
                <button class="qty-btn" data-act="inc" data-id="${id}">+</button>
                <span class="remove-item" data-act="rm" data-id="${id}">Удалить</span>
              </div>
            </div>
          </div>`;
      }).join('');
    }
    cartTotalEl.textContent = formatPrice(cartTotal());
  }

  cartItemsEl.addEventListener('click', e => {
    const t = e.target.closest('[data-act]');
    if(!t) return;
    const id = t.dataset.id;
    if(t.dataset.act === 'inc') cart[id]++;
    if(t.dataset.act === 'dec'){ cart[id]--; if(cart[id] <= 0) delete cart[id]; }
    if(t.dataset.act === 'rm') delete cart[id];
    updateCartUI();
  });

  function openCart(){ cartOverlay.classList.add('open'); updateCartUI(); }
  function closeCart(){ cartOverlay.classList.remove('open'); }
  document.getElementById('openCart').addEventListener('click', openCart);
  document.getElementById('closeCart').addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', e => { if(e.target === cartOverlay) closeCart(); });

  updateCartUI();

  /* ---------- product detail modal ---------- */
  const productOverlay = document.getElementById('productOverlay');
  const pmCatTag = document.getElementById('pmCatTag');
  const pmThumb = document.getElementById('pmThumb');
  const pmName = document.getElementById('pmName');
  const pmPart = document.getElementById('pmPart');
  const pmPrice = document.getElementById('pmPrice');
  const pmBrand = document.getElementById('pmBrand');
  const pmGroup = document.getElementById('pmGroup');
  const pmQty = document.getElementById('pmQty');
  const pmDec = document.getElementById('pmDec');
  const pmInc = document.getElementById('pmInc');
  const pmAddBtn = document.getElementById('pmAddBtn');
  let activeProductId = null;
  let pmQtyVal = 1;

  function openProductModal(id){
    const p = PRODUCTS_BY_ID[id];
    activeProductId = id;
    pmQtyVal = 1;
    pmQty.textContent = pmQtyVal;
    pmCatTag.textContent = p.group === 'chas' ? 'Ходовая часть' : 'Мотор';
    pmThumb.innerHTML = iconSvg(p.cat);
    pmName.textContent = p.name;
    pmPart.textContent = p.part + ' · ' + p.variant;
    pmPrice.textContent = formatPrice(p.price);
    pmBrand.textContent = p.brand;
    pmGroup.textContent = CAT_LABELS[p.cat];
    productOverlay.classList.add('open');
  }
  function closeProductModal(){ productOverlay.classList.remove('open'); }

  document.getElementById('closeProductModal').addEventListener('click', closeProductModal);
  productOverlay.addEventListener('click', e => { if(e.target === productOverlay) closeProductModal(); });

  pmDec.addEventListener('click', () => { if(pmQtyVal > 1){ pmQtyVal--; pmQty.textContent = pmQtyVal; } });
  pmInc.addEventListener('click', () => { pmQtyVal++; pmQty.textContent = pmQtyVal; });

  pmAddBtn.addEventListener('click', () => {
    if(!activeProductId) return;
    addToCart(activeProductId, pmQtyVal);
    closeProductModal();
  });

  /* ---------- checkout ---------- */
  const checkoutOverlay = document.getElementById('checkoutOverlay');
  const orderFirstName = document.getElementById('orderFirstName');
  const orderLastName = document.getElementById('orderLastName');
  const orderPhone = document.getElementById('orderPhone');
  const orderAddress = document.getElementById('orderAddress');
  const orderSummary = document.getElementById('orderSummary');
  const orderError = document.getElementById('orderError');
  const submitOrderBtn = document.getElementById('submitOrderBtn');

  document.getElementById('checkoutBtn').addEventListener('click', () => {
    if(cartCount() === 0) return;
    if(!userState.loggedIn){
      closeCart();
      showToast('Пожалуйста, войдите, чтобы оформить заказ');
      if(window.openLoginModal) window.openLoginModal();
      return;
    }
    closeCart();
    orderFirstName.value = userState.firstName || '';
    orderLastName.value = userState.lastName || '';
    orderPhone.value = userState.phone ? '+' + userState.phone : '';
    orderAddress.value = userState.address || '';
    orderError.textContent = '';
    const ids = Object.keys(cart);
    orderSummary.innerHTML = ids.map(id => {
      const p = PRODUCTS_BY_ID[id];
      return `<div class="row"><span>${p.name.split(' — ')[0]} × ${cart[id]}</span><span>${formatPrice(p.price*cart[id])}</span></div>`;
    }).join('') + `<div class="row total"><span>Итого</span><span>${formatPrice(cartTotal())}</span></div>`;
    checkoutOverlay.classList.add('open');
  });
  document.getElementById('closeCheckout').addEventListener('click', () => checkoutOverlay.classList.remove('open'));
  checkoutOverlay.addEventListener('click', e => { if(e.target === checkoutOverlay) checkoutOverlay.classList.remove('open'); });

  submitOrderBtn.addEventListener('click', async () => {
    const first = orderFirstName.value.trim();
    const last = orderLastName.value.trim();
    const phone = orderPhone.value.trim();
    const address = orderAddress.value.trim();

    if(!first || !last || !phone || !address){
      orderError.textContent = 'Заполните имя, фамилию, телефон и адрес.';
      return;
    }
    orderError.textContent = '';
    submitOrderBtn.classList.add('loading');
    submitOrderBtn.disabled = true;

    const payload = {
      firstName: first,
      lastName: last,
      phone: phone.replace(/\D/g,''),
      address: address,
      items: Object.entries(cart).map(([id, qty]) => ({
        id, name: PRODUCTS_BY_ID[id].name, partNumber: PRODUCTS_BY_ID[id].part,
        price: PRODUCTS_BY_ID[id].price, qty
      })),
      total: cartTotal()
    };

    try{
      // Уведомление в Telegram владельцу магазина — единственный канал приёма заказов
      sendTelegramNotification(payload);

      // 1. Уведомление об успешном оформлении
      showToast('Заказ успешно оформлен! Мы свяжемся с вами по телефону.', 'success');
      // 2. Очистка корзины
      Object.keys(cart).forEach(id => delete cart[id]);
      updateCartUI();
      checkoutOverlay.classList.remove('open');
    }catch(err){
      orderError.textContent = 'Не удалось отправить заказ. Попробуйте ещё раз или позвоните нам.';
    }finally{
      submitOrderBtn.classList.remove('loading');
      submitOrderBtn.disabled = false;
    }
  });

  /* ---------- profile / auth state (persisted in localStorage) ---------- */
  function loadUser(){
    try{
      const raw = localStorage.getItem('avtolider_user');
      if(!raw) return { loggedIn:false, phone:'', firstName:'', lastName:'', address:'' };
      const parsed = JSON.parse(raw);
      return { loggedIn:!!parsed.loggedIn, phone:parsed.phone||'', firstName:parsed.firstName||'', lastName:parsed.lastName||'', address:parsed.address||'' };
    }catch(e){ return { loggedIn:false, phone:'', firstName:'', lastName:'', address:'' }; }
  }
  function saveUser(){
    try{ localStorage.setItem('avtolider_user', JSON.stringify(userState)); }catch(e){}
  }

  const userState = loadUser();
  const loginBtn = document.getElementById('openLogin');
  const loginMain = document.getElementById('loginMain');
  const loginSub = document.getElementById('loginSub');
  const profileOverlay = document.getElementById('profileOverlay');
  const profilePhoneVal = document.getElementById('profilePhoneVal');
  const profileFirstName = document.getElementById('profileFirstName');
  const profileLastName = document.getElementById('profileLastName');
  const saveProfileBtn = document.getElementById('saveProfileBtn');

  function updateLoginButtonUI(){
    if(userState.loggedIn){
      loginMain.textContent = 'Профиль';
      if(userState.firstName){
        loginSub.textContent = userState.firstName;
        loginSub.hidden = false;
      } else {
        loginSub.hidden = true;
      }
    } else {
      loginMain.textContent = 'Войти';
      loginSub.hidden = true;
    }
  }
  updateLoginButtonUI(); // применяем состояние сразу при загрузке страницы

  window.isLoggedIn = () => userState.loggedIn;

  window.onAuthSuccess = function(phone, firstName, lastName){
    userState.loggedIn = true;
    userState.phone = phone;
    userState.firstName = firstName || userState.firstName;
    userState.lastName = lastName || userState.lastName;
    saveUser();
    updateLoginButtonUI();
    showToast('Добро пожаловать, ' + (userState.firstName || '') + '!', 'success');
  };

  window.openProfileModal = function(){
    profilePhoneVal.textContent = userState.phone ? '+' + userState.phone : '—';
    profileFirstName.value = userState.firstName;
    profileLastName.value = userState.lastName;
    profileOverlay.classList.add('open');
  };

  document.getElementById('closeProfile').addEventListener('click', () => profileOverlay.classList.remove('open'));
  profileOverlay.addEventListener('click', e => { if(e.target === profileOverlay) profileOverlay.classList.remove('open'); });

  saveProfileBtn.addEventListener('click', () => {
    userState.firstName = profileFirstName.value.trim();
    userState.lastName = profileLastName.value.trim();
    saveUser();
    updateLoginButtonUI();
    showToast('Профиль обновлён', 'success');
    profileOverlay.classList.remove('open');
  });

  document.getElementById('logoutLink').addEventListener('click', () => {
    userState.loggedIn = false;
    userState.phone = '';
    userState.firstName = '';
    userState.lastName = '';
    saveUser();
    updateLoginButtonUI();
    profileOverlay.classList.remove('open');
    showToast('Вы вышли из аккаунта');
  });

  /* ---------- rotating header phone number ---------- */
  const HEADER_PHONES = [
    { num: '+998 90 744-51-57', tel: '+998907445157' },
    { num: '+998 91 417-55-05', tel: '+998914175505' },
    { num: '+998 91 080-55-05', tel: '+998910805505' }
  ];
  let headerPhoneIdx = 0;
  const headerPhoneEl = document.getElementById('headerPhone');
  const headerPhoneNumEl = document.getElementById('headerPhoneNum');
  setInterval(() => {
    headerPhoneIdx = (headerPhoneIdx + 1) % HEADER_PHONES.length;
    const p = HEADER_PHONES[headerPhoneIdx];
    headerPhoneNumEl.textContent = p.num;
    headerPhoneEl.setAttribute('href', 'tel:' + p.tel);
  }, 5 * 60 * 1000); // каждые 5 минут
})();