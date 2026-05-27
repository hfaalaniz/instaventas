/* ============================================================
   CONFIGURACIÓN — Tienda, notificaciones, dark mode, backup,
                   validaciones gateways, wizard onboarding,
                   atajos de teclado
   ============================================================ */

// ── Inicialización ────────────────────────────────────────────

function initConfiguracion() {
  loadConfigFromState();
  bindConfigEvents();
  applyDarkMode(APP_STATE.config.dark_mode);
  bindKeyboardShortcuts();
  if (!APP_STATE.onboarding_done) {
    setTimeout(() => showWizard(), 600);
  }
}

function loadConfigFromState() {
  const c = APP_STATE.config;
  setCfgVal('cfg-store-name',     c.store_name);
  setCfgVal('cfg-store-category', c.store_category);
  setCfgVal('cfg-store-url',      c.store_url);
  setCfgVal('cfg-store-ig',       c.store_ig);
  setCfgVal('cfg-store-email',    c.store_email);
  setCfgVal('cfg-store-whatsapp', c.store_whatsapp);
  setCfgVal('cfg-store-country',  c.store_country);
  setCfgVal('cfg-timezone',       c.timezone);
  setCfgCheck('notif-venta',   c.notifications.venta);
  setCfgCheck('notif-carrito', c.notifications.carrito);
  setCfgCheck('notif-bot',     c.notifications.bot);
  setCfgCheck('notif-reporte', c.notifications.reporte);
  setCfgCheck('notif-stock',   c.notifications.stock);
  setCfgVal('notif-email',     c.notifications.email);
  setCfgCheck('cfg-dark-mode', c.dark_mode);
  updateContactButtons();
}

function saveConfiguracion() {
  const c = APP_STATE.config;
  c.store_name     = document.getElementById('cfg-store-name')?.value?.trim()     || '';
  c.store_category = document.getElementById('cfg-store-category')?.value         || '';
  c.store_url      = document.getElementById('cfg-store-url')?.value?.trim()      || '';
  c.store_ig       = document.getElementById('cfg-store-ig')?.value?.trim()       || '';
  c.store_email    = document.getElementById('cfg-store-email')?.value?.trim()    || '';
  c.store_whatsapp = document.getElementById('cfg-store-whatsapp')?.value?.trim() || '';
  c.store_country  = document.getElementById('cfg-store-country')?.value          || 'AR';
  c.timezone       = document.getElementById('cfg-timezone')?.value               || '';
  c.dark_mode      = document.getElementById('cfg-dark-mode')?.checked            || false;
  c.notifications.venta   = document.getElementById('notif-venta')?.checked;
  c.notifications.carrito = document.getElementById('notif-carrito')?.checked;
  c.notifications.bot     = document.getElementById('notif-bot')?.checked;
  c.notifications.reporte = document.getElementById('notif-reporte')?.checked;
  c.notifications.stock   = document.getElementById('notif-stock')?.checked;
  c.notifications.email   = document.getElementById('notif-email')?.value || '';

  // Sync store name into bot state
  APP_STATE.bot.store_name = c.store_name;
  APP_STATE.bot.ig_handle  = c.store_ig;

  saveState();
  applyDarkMode(c.dark_mode);
  updateContactButtons();
  showToast('✓ Configuración guardada', 'success');
}

function updateContactButtons() {
  const c = APP_STATE.config;
  const wa    = document.getElementById('cfg-whatsapp-link');
  const waNum = document.getElementById('cfg-wa-display');
  const em    = document.getElementById('cfg-email-link');
  const emNum = document.getElementById('cfg-email-display');
  const ig    = document.getElementById('cfg-ig-link');
  const igNum = document.getElementById('cfg-ig-display');

  if (wa && waNum) {
    const num = c.store_whatsapp.replace(/\D/g,'');
    wa.href = num ? `https://wa.me/${num}` : '#';
    waNum.textContent = c.store_whatsapp || 'No configurado';
  }
  if (em && emNum) {
    em.href = c.store_email ? `mailto:${c.store_email}` : '#';
    emNum.textContent = c.store_email || 'No configurado';
  }
  if (ig && igNum) {
    const handle = c.store_ig.replace('@','');
    ig.href = handle ? `https://instagram.com/${handle}` : '#';
    igNum.textContent = c.store_ig || 'No configurado';
  }
}

// ── Dark mode ─────────────────────────────────────────────────

function applyDarkMode(on) {
  document.documentElement.setAttribute('data-theme', on ? 'dark' : 'light');
  const icon = document.getElementById('dark-toggle-icon');
  if (icon) { icon.className = on ? 'ti ti-sun' : 'ti ti-moon'; }
  const navBtn = document.getElementById('btn-dark-toggle');
  if (navBtn) navBtn.title = on ? 'Modo claro' : 'Modo oscuro';
}

function toggleDarkMode() {
  APP_STATE.config.dark_mode = !APP_STATE.config.dark_mode;
  const cfgCheck = document.getElementById('cfg-dark-mode');
  if (cfgCheck) cfgCheck.checked = APP_STATE.config.dark_mode;
  applyDarkMode(APP_STATE.config.dark_mode);
  saveState();
  showToast(APP_STATE.config.dark_mode ? '🌙 Modo oscuro activado' : '☀️ Modo claro activado', 'success');
}

// ── Backup JSON ───────────────────────────────────────────────

function exportConfigBackup() {
  const json = JSON.stringify(APP_STATE, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `instaventas-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✓ Backup exportado', 'success');
}

function importConfigBackup(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.pagos || !data.bot) throw new Error('Formato inválido');
      Object.assign(APP_STATE, data);
      saveState();
      location.reload();
    } catch {
      showToast('Error: archivo JSON inválido', 'error');
    }
  };
  reader.readAsText(file);
}

function resetAllConfig() {
  if (!confirm('⚠️ ¿Estás seguro? Se borrarán TODOS los datos guardados. Esta acción no se puede deshacer.')) return;
  localStorage.removeItem('instaventas_state');
  showToast('Configuración reseteada. Recargando...', 'success');
  setTimeout(() => location.reload(), 1500);
}

// ── Validaciones gateways ────────────────────────────────────

function validateGatewayForms() {
  const errors = [];
  const mpToken = document.getElementById('mp-access-token')?.value;
  const mpPKey  = document.getElementById('mp-public-key')?.value;
  if (mpToken && !validateMPToken(mpToken))   errors.push('Mercado Pago: Access Token tiene formato inválido');
  if (mpPKey  && !validateMPPublicKey(mpPKey)) errors.push('Mercado Pago: Public Key tiene formato inválido');

  const ppId = document.getElementById('pp-client-id')?.value;
  if (ppId && ppId.length < 10) errors.push('PayPal: Client ID parece incompleto');

  const stripePub = document.getElementById('stripe-pub-key')?.value;
  if (stripePub && !stripePub.startsWith('pk_')) errors.push('Stripe: Publishable Key debe empezar con pk_');
  const stripeSecret = document.getElementById('stripe-secret-key')?.value;
  if (stripeSecret && !stripeSecret.startsWith('sk_')) errors.push('Stripe: Secret Key debe empezar con sk_');

  return errors;
}

// ── Atajos de teclado ────────────────────────────────────────

function bindKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    // No disparar si estamos en un input/textarea
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const SECTIONS = ['dashboard','pagos','carrito','ventas','email','catalogo','pixel','auditoria','configuracion'];

    if (e.key === 'd' && !e.ctrlKey) { showSection('dashboard');     e.preventDefault(); }
    if (e.key === 'p' && !e.ctrlKey) { showSection('pagos');         e.preventDefault(); }
    if (e.key === 'c' && !e.ctrlKey) { showSection('carrito');       e.preventDefault(); }
    if (e.key === 'v' && !e.ctrlKey) { showSection('ventas');        e.preventDefault(); }
    if (e.key === 'e' && !e.ctrlKey) { showSection('email');         e.preventDefault(); }
    if (e.key === 'k' && !e.ctrlKey) { showSection('catalogo');      e.preventDefault(); }
    if (e.key === 'x' && !e.ctrlKey) { showSection('pixel');         e.preventDefault(); }
    if (e.key === 'a' && !e.ctrlKey) { showSection('auditoria');     e.preventDefault(); }
    if (e.key === 's' && !e.ctrlKey) { showSection('configuracion'); e.preventDefault(); }
    if (e.key === 't' && !e.ctrlKey) { toggleDarkMode();             e.preventDefault(); }

    // Tab → siguiente sección
    if (e.key === ']') {
      const active = document.querySelector('.nav-btn.active')?.dataset?.section;
      const idx = SECTIONS.indexOf(active);
      if (idx !== -1) showSection(SECTIONS[(idx + 1) % SECTIONS.length]);
      e.preventDefault();
    }
    // Shift+Tab → sección anterior
    if (e.key === '[') {
      const active = document.querySelector('.nav-btn.active')?.dataset?.section;
      const idx = SECTIONS.indexOf(active);
      if (idx !== -1) showSection(SECTIONS[(idx - 1 + SECTIONS.length) % SECTIONS.length]);
      e.preventDefault();
    }
    // ? → mostrar ayuda de atajos
    if (e.key === '?') { showShortcutsHelp(); e.preventDefault(); }
  });
}

function showShortcutsHelp() {
  const existing = document.getElementById('shortcuts-modal');
  if (existing) { existing.remove(); return; }
  const shortcuts = [
    ['d', 'Dashboard'], ['p', 'Pagos'], ['c', 'Carrito'], ['v', 'Auto-ventas'],
    ['e', 'Email'], ['k', 'Catálogo'], ['x', 'Pixel'], ['a', 'Auditoría'],
    ['s', 'Configuración'], ['t', 'Toggle dark mode'],
    [']', 'Sección siguiente'], ['[', 'Sección anterior'], ['?', 'Mostrar/ocultar atajos']
  ];
  const div = document.createElement('div');
  div.id = 'shortcuts-modal';
  div.className = 'modal-overlay';
  div.style.cssText = 'display:flex;z-index:9999';
  div.innerHTML = `
    <div class="modal-box" style="max-width:420px">
      <div class="modal-header">
        <h3><i class="ti ti-keyboard"></i> Atajos de teclado</h3>
        <button class="modal-close" onclick="document.getElementById('shortcuts-modal').remove()"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body">
        <div class="shortcuts-grid">
          ${shortcuts.map(([k, label]) => `
            <div class="shortcut-row">
              <kbd class="shortcut-key">${k}</kbd>
              <span class="shortcut-label">${label}</span>
            </div>
          `).join('')}
        </div>
        <p style="font-size:12px;color:var(--color-text-3);margin-top:12px">Los atajos funcionan cuando no hay ningún campo de texto activo.</p>
      </div>
    </div>
  `;
  div.addEventListener('click', e => { if (e.target === div) div.remove(); });
  document.body.appendChild(div);
}

// ── Wizard de onboarding ─────────────────────────────────────

let wizardStep = 1;
const WIZARD_TOTAL = 4;

function showWizard() {
  const overlay = document.getElementById('wizard-overlay');
  if (!overlay) return;
  wizardStep = 1;
  renderWizardStep();
  overlay.style.display = 'flex';
}

function hideWizard() {
  const overlay = document.getElementById('wizard-overlay');
  if (overlay) overlay.style.display = 'none';
}

function renderWizardStep() {
  for (let i = 1; i <= WIZARD_TOTAL; i++) {
    document.getElementById('wstep-' + i)?.classList.toggle('active', i === wizardStep);
  }
  const fill = document.getElementById('wizard-progress-fill');
  if (fill) fill.style.width = ((wizardStep - 1) / (WIZARD_TOTAL - 1) * 100) + '%';

  const indicators = document.getElementById('wiz-indicators');
  if (indicators) {
    indicators.innerHTML = Array.from({ length: WIZARD_TOTAL }, (_, i) => `
      <div class="wiz-dot ${i + 1 === wizardStep ? 'active' : i + 1 < wizardStep ? 'done' : ''}"></div>
    `).join('');
  }

  const backBtn = document.getElementById('wiz-btn-back');
  const nextBtn = document.getElementById('wiz-btn-next');
  if (backBtn) backBtn.style.display = wizardStep > 1 ? 'inline-flex' : 'none';
  if (nextBtn) {
    nextBtn.innerHTML = wizardStep < WIZARD_TOTAL
      ? 'Siguiente <i class="ti ti-arrow-right"></i>'
      : '<i class="ti ti-check"></i> ¡Empezar!';
  }
}

function wizardNext() {
  if (wizardStep === 1) {
    const name = document.getElementById('wiz-store-name')?.value?.trim();
    if (!name) { showToast('Ingresá el nombre de tu tienda', 'error'); return; }
    APP_STATE.config.store_name   = name;
    APP_STATE.config.store_category = document.getElementById('wiz-category')?.value || '';
    APP_STATE.config.store_ig     = document.getElementById('wiz-ig')?.value?.trim() || '';
    APP_STATE.bot.store_name      = name;
    saveState();
  }
  if (wizardStep === 2) {
    const token = document.getElementById('wiz-mp-token')?.value?.trim();
    const pubKey = document.getElementById('wiz-mp-pubkey')?.value?.trim();
    if (token)  APP_STATE.pagos.mp_access_token = token;
    if (pubKey) APP_STATE.pagos.mp_public_key   = pubKey;
    if (token || pubKey) saveState();
  }
  if (wizardStep === 3) {
    APP_STATE.bot.channels.instagram = document.getElementById('wiz-ch-instagram')?.checked;
    APP_STATE.bot.channels.whatsapp  = document.getElementById('wiz-ch-whatsapp')?.checked;
    APP_STATE.bot.channels.facebook  = document.getElementById('wiz-ch-facebook')?.checked;
    saveState();
  }
  if (wizardStep === WIZARD_TOTAL) {
    APP_STATE.onboarding_done = true;
    saveState();
    hideWizard();
    loadConfigFromState();
    showToast('✓ ¡Configuración inicial completada!', 'success');
    return;
  }
  wizardStep++;
  renderWizardStep();
}

function wizardBack() {
  if (wizardStep > 1) { wizardStep--; renderWizardStep(); }
}

// ── Bind events ───────────────────────────────────────────────

function bindConfigEvents() {
  document.getElementById('btn-save-config')?.addEventListener('click', saveConfiguracion);

  document.getElementById('btn-dark-toggle')?.addEventListener('click', toggleDarkMode);

  document.getElementById('cfg-dark-mode')?.addEventListener('change', e => {
    applyDarkMode(e.target.checked);
    APP_STATE.config.dark_mode = e.target.checked;
    saveState();
  });

  // Live preview contacto
  ['cfg-store-whatsapp','cfg-store-email','cfg-store-ig'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateContactButtons);
  });

  // Backup
  document.getElementById('btn-export-config')?.addEventListener('click', exportConfigBackup);
  const importBtn   = document.getElementById('btn-import-config');
  const importInput = document.getElementById('config-import-input');
  importBtn?.addEventListener('click', () => importInput?.click());
  importInput?.addEventListener('change', e => { if (e.target.files[0]) importConfigBackup(e.target.files[0]); });

  // Reset
  document.getElementById('btn-reset-all')?.addEventListener('click', resetAllConfig);

  // Wizard
  document.getElementById('wiz-btn-next')?.addEventListener('click', wizardNext);
  document.getElementById('wiz-btn-back')?.addEventListener('click', wizardBack);

  // Validaciones inline en pagos (attach after pagos init)
  setTimeout(bindGatewayValidations, 500);
}

function bindGatewayValidations() {
  const fields = [
    { id: 'mp-access-token',  validate: v => !v || validateMPToken(v),      msg: 'Formato inválido. Debe empezar con TEST- o APP_USR-' },
    { id: 'mp-public-key',    validate: v => !v || validateMPPublicKey(v),   msg: 'Formato inválido. Debe empezar con TEST- o APP_USR-pub-' },
    { id: 'stripe-pub-key',   validate: v => !v || v.startsWith('pk_'),      msg: 'Debe empezar con pk_test_ o pk_live_' },
    { id: 'stripe-secret-key',validate: v => !v || v.startsWith('sk_'),      msg: 'Debe empezar con sk_test_ o sk_live_' },
  ];
  fields.forEach(({ id, validate, msg }) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('blur', () => {
      const ok = validate(input.value.trim());
      input.classList.toggle('input-error', !ok);
      let hint = input.parentElement?.querySelector('.validation-hint');
      if (!ok) {
        if (!hint) {
          hint = document.createElement('span');
          hint.className = 'validation-hint error-hint';
          input.parentElement?.appendChild(hint);
        }
        hint.textContent = msg;
      } else if (hint) {
        hint.remove();
      }
    });
  });
}

// ── Helpers ───────────────────────────────────────────────────

function setCfgVal(id, val) { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; }
function setCfgCheck(id, val) { const el = document.getElementById(id); if (el) el.checked = !!val; }

window.toggleDarkMode    = toggleDarkMode;
window.showWizard        = showWizard;
window.wizardNext        = wizardNext;
window.wizardBack        = wizardBack;
window.exportConfigBackup = exportConfigBackup;
window.showShortcutsHelp  = showShortcutsHelp;
