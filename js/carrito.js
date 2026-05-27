/* ============================================================
   CARRITO ABANDONADO — Secuencias, Lista, Filtros
   ============================================================ */

const MOCK_CARTS = [
  { id: 'C001', name: 'Lucas Martínez',    email: 'lucas@mail.com',      product: 'Pack Premium',    amount: 15300, status: 'pending',   reminder: 1, ago: '2h',  source: 'Instagram' },
  { id: 'C002', name: 'Valentina Sosa',    email: 'vale.s@gmail.com',    product: 'Remera Logo x2',  amount:  9800, status: 'pending',   reminder: 2, ago: '5h',  source: 'Web' },
  { id: 'C003', name: 'Roberto Díaz',      email: 'rdi@hotmail.com',     product: 'Kit Completo',    amount: 22000, status: 'recovered', reminder: 2, ago: '1d',  source: 'WhatsApp' },
  { id: 'C004', name: 'Florencia Ruiz',    email: 'flor.r@yahoo.com',    product: 'Producto Deluxe', amount:  7400, status: 'pending',   reminder: 3, ago: '2d',  source: 'Instagram' },
  { id: 'C005', name: 'Andrés López',      email: 'andres@mail.com',     product: 'Pack Básico',     amount:  4200, status: 'expired',   reminder: 3, ago: '4d',  source: 'Web' },
  { id: 'C006', name: 'Mariana Ríos',      email: 'mari.rios@gmail.com', product: 'Auriculares Pro', amount: 12900, status: 'pending',   reminder: 1, ago: '45min',source: 'Instagram' }
];

let cartFilter = 'all';

function initCarrito() {
  loadCarritoFromState();
  renderCartTable(MOCK_CARTS);
  bindCarritoEvents();
  updateCartKPIs();
}

function loadCarritoFromState() {
  const c = APP_STATE.carrito;

  // Reminders
  setCheck('rem-1', c.reminders[0].active);
  setCheck('rem-2', c.reminders[1].active);
  setCheck('rem-3', c.reminders[2].active);

  // Discount
  setCheck('discount-toggle', c.discount.active);
  setVal('discount-pct',     c.discount.pct);
  setVal('coupon-hours',      c.discount.hours);
  setVal('coupon-prefix',     c.discount.prefix);

  // Settings
  setVal('min-cart-amount',   c.settings.minAmount);
  setVal('max-days-inactive', c.settings.maxDays);

  // Messages from state
  setVal('rem-1-msg', APP_STATE.carrito.msg1 || '¡Hola {{nombre}}! 👋 Olvidaste algo en tu carrito.\nTenés {{producto}} esperándote por ${{precio}}.\nCompletá tu compra acá: {{link}}');
  setVal('rem-2-msg', APP_STATE.carrito.msg2 || '{{nombre}}, ¡tu carrito sigue esperándote! 🎁\nTenemos un descuento especial del {{descuento}}% para vos.\nUsá el código {{codigo}} al finalizar la compra.\nVálido por 24hs: {{link}}');
  setVal('rem-3-msg', APP_STATE.carrito.msg3 || '{{nombre}}, ¡último llamado! ⏰\nTu descuento del {{descuento}}% vence HOY.\nNo te pierdas {{producto}} al mejor precio.\nComprá ahora: {{link}}');
}

function bindCarritoEvents() {
  document.getElementById('btn-save-carrito')?.addEventListener('click', saveCarritoConfig);

  // Botón exportar CSV en la cabecera de la sección
  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn-outline btn-sm';
  exportBtn.innerHTML = '<i class="ti ti-download"></i> Exportar CSV';
  exportBtn.addEventListener('click', exportCarritosCSV);

  // Botón agregar carrito manual
  const addBtn = document.createElement('button');
  addBtn.className = 'btn-outline btn-sm';
  addBtn.innerHTML = '<i class="ti ti-plus"></i> Agregar manual';
  addBtn.addEventListener('click', openAddCartModal);

  const header = document.querySelector('#section-carrito .section-actions');
  if (header) { header.prepend(addBtn); header.prepend(exportBtn); }

  // Step highlight on reminder toggle
  ['rem-1','rem-2','rem-3'].forEach((id, i) => {
    document.getElementById(id)?.addEventListener('change', e => {
      document.getElementById('step-' + (i+1))?.classList.toggle('active-step', e.target.checked);
    });
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      cartFilter = btn.dataset.filter;
      const filtered = cartFilter === 'all' ? MOCK_CARTS : MOCK_CARTS.filter(c => c.status === cartFilter);
      renderCartTable(filtered);
    });
  });
}

function saveCarritoConfig() {
  const c = APP_STATE.carrito;
  c.reminders[0].active = document.getElementById('rem-1')?.checked;
  c.reminders[1].active = document.getElementById('rem-2')?.checked;
  c.reminders[2].active = document.getElementById('rem-3')?.checked;

  c.discount.active = document.getElementById('discount-toggle')?.checked;
  c.discount.pct    = parseInt(document.getElementById('discount-pct')?.value) || 10;
  c.discount.hours  = parseInt(document.getElementById('coupon-hours')?.value) || 24;
  c.discount.prefix = document.getElementById('coupon-prefix')?.value || 'VUELVE';

  c.settings.minAmount  = parseInt(document.getElementById('min-cart-amount')?.value) || 1000;
  c.settings.maxDays    = parseInt(document.getElementById('max-days-inactive')?.value) || 7;

  APP_STATE.carrito.msg1 = document.getElementById('rem-1-msg')?.value;
  APP_STATE.carrito.msg2 = document.getElementById('rem-2-msg')?.value;
  APP_STATE.carrito.msg3 = document.getElementById('rem-3-msg')?.value;

  saveState();
  showToast('✓ Secuencia de carrito guardada', 'success');
}

function updateCartKPIs() {
  const abandoned = MOCK_CARTS.filter(c => c.status === 'pending').length;
  const recovered = MOCK_CARTS.filter(c => c.status === 'recovered').length;
  const sent      = MOCK_CARTS.reduce((sum, c) => sum + c.reminder, 0);
  const amount    = MOCK_CARTS.filter(c => c.status === 'recovered').reduce((s, c) => s + c.amount, 0);

  setTextContent('cart-total-abandoned', abandoned);
  setTextContent('cart-total-recovered', recovered);
  setTextContent('cart-reminders-sent',  sent);
  setTextContent('cart-recovered-amount', formatCurrency(amount));
  setTextContent('abandoned-count', abandoned);
  setTextContent('mod-carrito-metric', abandoned + ' pendientes');
}

function renderCartTable(carts) {
  const table = document.getElementById('cart-table');
  if (!table) return;

  if (!carts.length) {
    table.innerHTML = `
      <div style="padding:2rem;text-align:center;color:var(--color-text-3)">
        <i class="ti ti-shopping-cart-off" style="font-size:32px;display:block;margin-bottom:8px"></i>
        No hay carritos en esta categoría
      </div>`;
    return;
  }

  table.innerHTML = `
    <div class="cart-row header-row">
      <div>Cliente</div>
      <div>Producto</div>
      <div>Estado</div>
      <div>Monto</div>
      <div>Acción</div>
    </div>
    ${carts.map(c => buildCartRow(c)).join('')}
  `;

  // Bind send reminder buttons
  table.querySelectorAll('[data-send-reminder]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cartId = btn.dataset.sendReminder;
      sendReminder(cartId);
    });
  });
}

function buildCartRow(c) {
  const statusBadge = {
    pending:   `<span class="feed-badge badge-carrito">${c.reminder}° recordatorio</span>`,
    recovered: `<span class="feed-badge badge-venta">Recuperado ✓</span>`,
    expired:   `<span class="feed-badge" style="background:var(--color-bg-3);color:var(--color-text-3)">Expirado</span>`
  }[c.status] || '';

  const amountClass = c.status === 'recovered' ? 'recovered' : 'pending';
  const actionBtn = c.status === 'pending'
    ? `<button class="cart-action-btn" data-send-reminder="${c.id}"><i class="ti ti-send"></i> Enviar</button>`
    : `<button class="cart-action-btn" onclick="viewCartDetail('${c.id}')"><i class="ti ti-eye"></i> Ver</button>`;

  return `
    <div class="cart-row">
      <div>
        <div class="cart-name">${c.name}</div>
        <div class="cart-email">${c.email} · ${c.ago} · <span style="color:var(--color-purple)">${c.source}</span></div>
      </div>
      <div style="font-size:12px;color:var(--color-text-2)">${c.product}</div>
      <div>${statusBadge}</div>
      <div class="cart-amount ${amountClass}">${formatCurrency(c.amount)}</div>
      <div>${actionBtn}</div>
    </div>
  `;
}

function sendReminder(cartId) {
  const cart = MOCK_CARTS.find(c => c.id === cartId);
  if (!cart) return;

  const reminderNum = Math.min(cart.reminder, 3);
  const config = APP_STATE.carrito;
  const msg = buildReminderMessage(reminderNum, cart, config);

  showToast(`✓ Recordatorio #${reminderNum} enviado a ${cart.name}`, 'success');

  // Simulate updating state
  cart.reminder = Math.min(cart.reminder + 1, 3);
  if (cart.reminder > 3) cart.status = 'expired';
  renderCartTable(MOCK_CARTS.filter(c => cartFilter === 'all' ? true : c.status === cartFilter));
  updateCartKPIs();

  console.log('Mensaje a enviar:', msg);
}

function buildReminderMessage(num, cart, config) {
  const templates = {
    1: document.getElementById('rem-1-msg')?.value || '',
    2: document.getElementById('rem-2-msg')?.value || '',
    3: document.getElementById('rem-3-msg')?.value || ''
  };
  const coupon = generateCoupon(config.discount.prefix);
  return (templates[num] || '')
    .replace(/\{\{nombre\}\}/g, cart.name.split(' ')[0])
    .replace(/\{\{producto\}\}/g, cart.product)
    .replace(/\{\{precio\}\}/g, formatCurrency(cart.amount))
    .replace(/\{\{descuento\}\}/g, config.discount.pct)
    .replace(/\{\{codigo\}\}/g, coupon)
    .replace(/\{\{link\}\}/g, 'https://tu-tienda.com/carrito/' + cart.id);
}

function viewCartDetail(cartId) {
  const cart = MOCK_CARTS.find(c => c.id === cartId);
  if (!cart) return;
  showToast(`${cart.name} — ${formatCurrency(cart.amount)} — ${cart.status}`, 'success');
}

function exportCarritosCSV() {
  const rows = [['ID','Cliente','Email','Producto','Monto','Estado','Recordatorio','Hace','Canal']];
  const carts = cartFilter === 'all' ? MOCK_CARTS : MOCK_CARTS.filter(c => c.status === cartFilter);
  carts.forEach(c => rows.push([c.id, c.name, c.email, c.product, c.amount, c.status, c.reminder, c.ago, c.source]));
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `carritos-abandonados-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✓ CSV exportado', 'success');
}

function openAddCartModal() {
  const name  = prompt('Nombre del cliente:');
  if (!name) return;
  const email   = prompt('Email:') || '';
  const product = prompt('Producto:') || 'Producto';
  const amount  = parseInt(prompt('Monto (ARS):') || '0');
  const newCart = {
    id:       'C' + String(Date.now()).slice(-4),
    name, email, product, amount,
    status:   'pending',
    reminder: 1,
    ago:      'ahora',
    source:   'Manual'
  };
  MOCK_CARTS.unshift(newCart);
  renderCartTable(cartFilter === 'all' ? MOCK_CARTS : MOCK_CARTS.filter(c => c.status === cartFilter));
  updateCartKPIs();
  showToast(`✓ Carrito de ${name} agregado`, 'success');
}

// Helpers
function setTextContent(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setVal(id, val) {
  const el = document.getElementById(id);
  if (el !== null && val !== undefined) el.value = val;
}
function setCheck(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}
