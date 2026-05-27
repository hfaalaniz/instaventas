/* ============================================================
   PAGOS — Mercado Pago API, PayPal, Stripe, Cripto
   ============================================================ */

let mpInstance = null;

function initPagos() {
  loadPagosFromState();
  bindPagosEvents();
  initGatewayTabs();
  initMPEnvTabs();
}

function loadPagosFromState() {
  const p = APP_STATE.pagos;
  setVal('mp-access-token', p.mp_access_token);
  setVal('mp-public-key',   p.mp_public_key);
  setVal('mp-country',      p.mp_country);
  setVal('mp-webhook',      p.mp_webhook || `${location.origin}/webhook/mercadopago`);

  // Methods
  setCheck('pm-card-toggle',     p.methods.card);
  setCheck('pm-transfer-toggle', p.methods.transfer);
  setCheck('pm-cash-toggle',     p.methods.cash);
  setCheck('pm-quota-toggle',    p.methods.quota);

  // PayPal
  setVal('pp-client-id',     p.paypal.client_id);
  setVal('pp-env',           p.paypal.env);
  setVal('pp-currency',      p.paypal.currency);

  // Stripe
  setVal('stripe-pub-key',       p.stripe.pub_key);
  setVal('stripe-secret-key',    p.stripe.secret_key);
  setVal('stripe-webhook-secret',p.stripe.webhook_secret);

  // Crypto
  setVal('crypto-btc',  p.crypto.btc);
  setVal('crypto-eth',  p.crypto.eth);
  setVal('crypto-usdt', p.crypto.usdt);
  setVal('nowpay-key',  p.crypto.nowpay_key);

  // Transfer
  setVal('bank-name',     p.transfer.name);
  setVal('bank-cuit',     p.transfer.cuit);
  setVal('bank-cbu',      p.transfer.cbu);
  setVal('bank-alias',    p.transfer.alias);
  setVal('bank-cvu',      p.transfer.cvu);
  setVal('bank-name-sel', p.transfer.bank);

  // Checkout mode
  selectCheckout(p.checkout_mode || 'pro');
}

function bindPagosEvents() {
  // Save main
  document.getElementById('btn-save-pagos')?.addEventListener('click', savePagosConfig);

  // Test connection
  document.getElementById('btn-test-mp')?.addEventListener('click', testMPConnection);

  // Generate preference
  document.getElementById('btn-create-preference')?.addEventListener('click', createMPPreference);

  // FB Pixel ID live update (in pixel module)
  document.getElementById('mp-public-key')?.addEventListener('input', debounce(() => {
    if (mpInstance) return;
    const key = document.getElementById('mp-public-key').value;
    if (validateMPPublicKey(key)) initMercadoPago(key);
  }, 800));

  // PayPal
  document.getElementById('btn-save-paypal')?.addEventListener('click', savePaypalConfig);

  // Stripe
  document.getElementById('btn-save-stripe')?.addEventListener('click', saveStripeConfig);

  // Crypto
  document.getElementById('btn-save-crypto')?.addEventListener('click', saveCryptoConfig);

  // Transfer
  document.getElementById('btn-save-transfer')?.addEventListener('click', saveTransferConfig);

  // Quota visibility
  document.getElementById('pm-quota-toggle')?.addEventListener('change', e => {
    document.getElementById('quota-config').style.display = e.target.checked ? 'block' : 'none';
  });
}

function initGatewayTabs() {
  document.querySelectorAll('.gateway-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.gateway-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.gateway-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById('panel-' + tab.dataset.gateway);
      if (panel) panel.classList.add('active');
    });
  });
}

function initMPEnvTabs() {
  document.querySelectorAll('.env-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.env-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      APP_STATE.pagos.mp_env = tab.dataset.env;
    });
  });
}

function selectCheckout(mode) {
  APP_STATE.pagos.checkout_mode = mode;
  document.getElementById('co-pro')?.classList.toggle('selected', mode === 'pro');
  document.getElementById('co-api')?.classList.toggle('selected', mode === 'api');
  const proCheck = document.querySelector('#co-pro .co-check');
  const apiCheck = document.querySelector('#co-api .co-check');
  if (proCheck) proCheck.style.display = mode === 'pro' ? 'block' : 'none';
  if (apiCheck) apiCheck.style.display = mode === 'api' ? 'block' : 'none';

  const brickContainer = document.getElementById('mp-checkout-brick-container');
  if (brickContainer) brickContainer.style.display = mode === 'api' ? 'block' : 'none';

  if (mode === 'api') {
    const key = document.getElementById('mp-public-key')?.value;
    if (key && validateMPPublicKey(key)) {
      initMercadoPago(key);
    }
  }
}

// ── Mercado Pago SDK ──────────────────────────────────────────

function initMercadoPago(publicKey) {
  if (!window.MercadoPago) { console.warn('MP SDK no cargado'); return; }
  try {
    mpInstance = new MercadoPago(publicKey, { locale: 'es-AR' });
    console.log('MercadoPago SDK inicializado con', publicKey.substring(0, 12) + '...');
  } catch (e) {
    console.warn('Error iniciando MP SDK:', e);
  }
}

async function renderMPBrick(preferenceId) {
  if (!mpInstance) {
    showToast('Configurá la Public Key primero', 'error');
    return;
  }
  const container = document.getElementById('mp-checkout-brick-container');
  if (!container) return;
  container.innerHTML = '<div id="wallet_container"></div>';
  try {
    const bricksBuilder = mpInstance.bricks();
    await bricksBuilder.create('wallet', 'wallet_container', {
      initialization: { preferenceId }
    });
  } catch (e) {
    container.innerHTML = '<p style="color:red;font-size:12px">Error renderizando brick: ' + e.message + '</p>';
  }
}

async function testMPConnection() {
  const token = document.getElementById('mp-access-token')?.value;
  if (!token) { showToast('Ingresá el Access Token', 'error'); return; }

  const btn = document.getElementById('btn-test-mp');
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="ti ti-loader"></i> Probando...';
  btn.disabled = true;

  const testDiv = document.getElementById('mp-connection-test');
  const resultDiv = document.getElementById('mp-test-result');
  if (testDiv) testDiv.style.display = 'block';
  if (resultDiv) { resultDiv.className = 'test-result loading'; resultDiv.textContent = 'Verificando credenciales...'; }

  try {
    // En producción real, esto se haría server-side para no exponer el token
    // Simulamos la validación del formato del token
    await new Promise(r => setTimeout(r, 1500));

    if (!validateMPToken(token)) {
      throw new Error('Formato de Access Token inválido. Debería comenzar con TEST- o APP_USR-');
    }

    if (resultDiv) {
      resultDiv.className = 'test-result success';
      resultDiv.innerHTML = '<i class="ti ti-check"></i> Conexión exitosa — Credenciales válidas';
    }

    // Init SDK with public key
    const pubKey = document.getElementById('mp-public-key')?.value;
    if (pubKey && validateMPPublicKey(pubKey)) {
      initMercadoPago(pubKey);
    }

    showToast('✓ Mercado Pago conectado', 'success');

    // Update module status
    const statusEl = document.getElementById('mod-pagos-status');
    if (statusEl) { statusEl.textContent = 'Conectado'; statusEl.className = 'status-badge on'; }

  } catch (err) {
    if (resultDiv) {
      resultDiv.className = 'test-result error';
      resultDiv.innerHTML = '<i class="ti ti-x"></i> Error: ' + err.message;
    }
    showToast('Error de conexión: ' + err.message, 'error');
  } finally {
    btn.innerHTML = orig;
    btn.disabled = false;
  }
}

async function createMPPreference() {
  const token   = document.getElementById('mp-access-token')?.value;
  const product = document.getElementById('test-product')?.value;
  const price   = parseFloat(document.getElementById('test-price')?.value);

  if (!token) { showToast('Configurá el Access Token primero', 'error'); return; }
  if (!product || !price) { showToast('Completá producto y precio', 'error'); return; }

  const btn = document.getElementById('btn-create-preference');
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="ti ti-loader"></i> Generando...';
  btn.disabled = true;

  const resultDiv = document.getElementById('mp-preference-result');

  try {
    // NOTA: En producción, esta llamada debe hacerse DESDE EL BACKEND para no exponer el Access Token
    // El endpoint real de MP es: POST https://api.mercadopago.com/checkout/preferences
    // Aquí simulamos la respuesta para demo
    await new Promise(r => setTimeout(r, 1000));

    const isSandbox = token.startsWith('TEST-') || APP_STATE.pagos.mp_env === 'sandbox';
    const mockPreferenceId = 'PREF-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const baseUrl = isSandbox ? 'https://sandbox.mercadopago.com.ar/checkout/v1/redirect' : 'https://www.mercadopago.com.ar/checkout/v1/redirect';
    const checkoutUrl = `${baseUrl}?pref_id=${mockPreferenceId}`;

    // Si es modo Checkout API, renderizar el Brick
    if (APP_STATE.pagos.checkout_mode === 'api') {
      await renderMPBrick(mockPreferenceId);
    }

    if (resultDiv) {
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = `
        <div style="font-size:13px;font-weight:600;color:var(--color-green);margin-bottom:8px">
          <i class="ti ti-check"></i> Preferencia creada correctamente
        </div>
        <div style="font-size:11px;color:var(--color-text-2);margin-bottom:6px">
          Preference ID: <strong>${mockPreferenceId}</strong> ·
          Monto: <strong>${formatCurrency(price)}</strong>
        </div>
        <div class="pref-link">
          <span class="pref-url" id="mp-checkout-url">${checkoutUrl}</span>
          <button class="btn-primary btn-sm" onclick="copyField('mp-checkout-url')">
            <i class="ti ti-copy"></i> Copiar
          </button>
          <a href="${checkoutUrl}" target="_blank" class="btn-outline btn-sm">
            <i class="ti ti-external-link"></i> Abrir
          </a>
        </div>
        <div style="font-size:11px;color:var(--color-amber);margin-top:8px">
          <i class="ti ti-alert-triangle"></i> En producción, generá preferencias desde tu backend para proteger el Access Token.
        </div>
      `;
    }
    showToast('✓ Link de pago generado', 'success');

  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.innerHTML = orig;
    btn.disabled = false;
  }
}

// ── Guardar configuraciones ───────────────────────────────────

function savePagosConfig() {
  const p = APP_STATE.pagos;
  p.mp_access_token = document.getElementById('mp-access-token')?.value || '';
  p.mp_public_key   = document.getElementById('mp-public-key')?.value || '';
  p.mp_country      = document.getElementById('mp-country')?.value || 'AR';
  p.methods.card     = document.getElementById('pm-card-toggle')?.checked || false;
  p.methods.transfer = document.getElementById('pm-transfer-toggle')?.checked || false;
  p.methods.cash     = document.getElementById('pm-cash-toggle')?.checked || false;
  p.methods.quota    = document.getElementById('pm-quota-toggle')?.checked || false;

  if (p.mp_public_key && validateMPPublicKey(p.mp_public_key)) {
    initMercadoPago(p.mp_public_key);
  }

  saveState();
  showToast('✓ Configuración de pagos guardada', 'success');

  // Update dashboard module status
  const statusEl = document.getElementById('mod-pagos-status');
  if (statusEl && p.mp_access_token && p.mp_public_key) {
    statusEl.textContent = 'Conectado';
    statusEl.className = 'status-badge on';
  }
}

function savePaypalConfig() {
  APP_STATE.pagos.paypal = {
    client_id: document.getElementById('pp-client-id')?.value || '',
    env:       document.getElementById('pp-env')?.value || 'sandbox',
    currency:  document.getElementById('pp-currency')?.value || 'USD'
  };
  saveState();
  showToast('✓ PayPal guardado', 'success');
}

function saveStripeConfig() {
  APP_STATE.pagos.stripe = {
    pub_key:        document.getElementById('stripe-pub-key')?.value || '',
    secret_key:     document.getElementById('stripe-secret-key')?.value || '',
    webhook_secret: document.getElementById('stripe-webhook-secret')?.value || ''
  };
  saveState();
  showToast('✓ Stripe guardado', 'success');
}

function saveCryptoConfig() {
  APP_STATE.pagos.crypto = {
    btc:        document.getElementById('crypto-btc')?.value || '',
    eth:        document.getElementById('crypto-eth')?.value || '',
    usdt:       document.getElementById('crypto-usdt')?.value || '',
    nowpay_key: document.getElementById('nowpay-key')?.value || ''
  };
  saveState();
  showToast('✓ Billeteras cripto guardadas', 'success');
}

function saveTransferConfig() {
  APP_STATE.pagos.transfer = {
    name:  document.getElementById('bank-name')?.value || '',
    cuit:  document.getElementById('bank-cuit')?.value || '',
    cbu:   document.getElementById('bank-cbu')?.value || '',
    alias: document.getElementById('bank-alias')?.value || '',
    cvu:   document.getElementById('bank-cvu')?.value || '',
    bank:  document.getElementById('bank-name-sel')?.value || ''
  };
  saveState();
  showToast('✓ Datos bancarios guardados', 'success');
}

// Helpers
function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val) el.value = val;
}
function setCheck(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}
