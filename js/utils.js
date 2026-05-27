/* ============================================================
   UTILS — Funciones utilitarias compartidas
   ============================================================ */

// Toast notification
function showToast(msg, type = 'default', duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

// Toggle password visibility
function togglePassword(inputId) {
  const el = document.getElementById(inputId);
  el.type = el.type === 'password' ? 'text' : 'password';
}

// Copy to clipboard
async function copyField(inputId) {
  const el = document.getElementById(inputId);
  const val = el.value || el.textContent;
  if (!val) { showToast('Nada que copiar', 'error'); return; }
  try {
    await navigator.clipboard.writeText(val);
    showToast('✓ Copiado al portapapeles', 'success');
  } catch {
    el.select();
    document.execCommand('copy');
    showToast('✓ Copiado', 'success');
  }
}

// Copy text directly
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('✓ Copiado al portapapeles', 'success');
  } catch {
    showToast('No se pudo copiar', 'error');
  }
}

// Format currency
function formatCurrency(amount, currency = 'ARS') {
  const locales = { ARS: 'es-AR', CLP: 'es-CL', MXN: 'es-MX', COP: 'es-CO', BRL: 'pt-BR', USD: 'en-US', UYU: 'es-UY' };
  return new Intl.NumberFormat(locales[currency] || 'es-AR', {
    style: 'currency', currency, maximumFractionDigits: 0
  }).format(amount);
}

// Format number
function formatNumber(n) {
  return new Intl.NumberFormat('es-AR').format(n);
}

// Format relative time
function timeAgo(date) {
  const diff = Math.round((Date.now() - new Date(date)) / 1000);
  if (diff < 60)    return `hace ${diff}s`;
  if (diff < 3600)  return `hace ${Math.round(diff/60)}min`;
  if (diff < 86400) return `hace ${Math.round(diff/3600)}h`;
  return `hace ${Math.round(diff/86400)}d`;
}

// Random between
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Debounce
function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Generate coupon code
function generateCoupon(prefix = 'VUELVE') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${code}`;
}

// Insert variable into textarea
function insertVar(textareaId, varText) {
  const ta = document.getElementById(textareaId);
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  ta.value = ta.value.substring(0, start) + varText + ta.value.substring(end);
  ta.selectionStart = ta.selectionEnd = start + varText.length;
  ta.focus();
}

// Show section
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.section === id);
    b.setAttribute('aria-selected', b.dataset.section === id);
  });
  const sec = document.getElementById('section-' + id);
  if (sec) {
    sec.classList.add('active');
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Validate MP Access Token format
function validateMPToken(token) {
  return /^(TEST|APP_USR)-\d+-\w+-\w+$/i.test(token) || token.length > 30;
}

// Validate MP Public Key format
function validateMPPublicKey(key) {
  return /^(TEST|APP_USR)-\w+/i.test(key) || key.length > 20;
}

// Get today's date formatted
function getTodayFormatted() {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
}

// Create element helper
function el(tag, attrs = {}, children = []) {
  const elem = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'className') elem.className = v;
    else if (k === 'innerHTML') elem.innerHTML = v;
    else if (k === 'textContent') elem.textContent = v;
    else elem.setAttribute(k, v);
  });
  children.forEach(c => typeof c === 'string' ? elem.appendChild(document.createTextNode(c)) : elem.appendChild(c));
  return elem;
}

// Animate number counter
function animateNumber(element, from, to, duration = 800, formatter = String) {
  const start = performance.now();
  const update = (time) => {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + (to - from) * eased);
    element.textContent = formatter(current);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}
