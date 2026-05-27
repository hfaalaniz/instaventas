/* ============================================================
   AUTO-VENTAS — Bot config, Keywords, Chat simulator
   ============================================================ */

const BOT_RESPONSES = {
  'precio':    (s) => s.msgs.price,
  'precios':   (s) => s.msgs.price,
  'catalogo':  (s) => s.msgs.catalog,
  'catálogo':  (s) => s.msgs.catalog,
  'pago':      (s) => s.msgs.payment,
  'pagos':     (s) => s.msgs.payment,
  'envio':     (s) => '📦 Hacemos envíos a todo el país. El costo se calcula al terminar la compra.',
  'envío':     (s) => '📦 Hacemos envíos a todo el país. El costo se calcula al terminar la compra.',
  'stock':     (s) => '🛍️ Para consultar stock escribinos el nombre del producto.',
  'hola':      (s) => s.msgs.welcome,
  'buenos':    (s) => s.msgs.welcome,
  '1':         (s) => s.msgs.catalog,
  '2':         (s) => s.msgs.price,
  '3':         (s) => s.msgs.payment,
  '4':         (s) => '📦 Para consultar el estado de tu pedido necesito tu número de orden. ¿Lo tenés?'
};

const BOT_HISTORY_MOCK = [
  { id: 'h1', channel: 'instagram', user: '@sofia_ropa',  msg: 'Hola! Cuánto sale el pack premium?', response: 'Los precios los encontrás en nuestro catálogo 👉 ...', time: '14:32', date: 'Hoy', converted: true  },
  { id: 'h2', channel: 'whatsapp',  user: '+5491112345678', msg: 'Hacen envíos a Córdoba?',          response: 'Hacemos envíos a todo el país 📦 ...',              time: '13:15', date: 'Hoy', converted: false },
  { id: 'h3', channel: 'instagram', user: '@lucas_compras', msg: 'Cuáles son los métodos de pago?', response: 'Aceptamos todos los métodos de pago 💳 ...',         time: '11:47', date: 'Hoy', converted: true  },
  { id: 'h4', channel: 'facebook',  user: 'María García',  msg: 'Tienen stock del producto B?',     response: '🛍️ Para consultar stock escribinos el nombre ...',   time: '10:02', date: 'Hoy', converted: false },
  { id: 'h5', channel: 'whatsapp',  user: '+5491187654321', msg: 'Hola quiero cotizar',             response: '¡Hola! 👋 Gracias por escribirnos ...',              time: '09:18', date: 'Ayer', converted: true  },
  { id: 'h6', channel: 'instagram', user: '@ana_fashionista', msg: 'Tienen cuotas?',               response: '📅 Cuotas sin interés disponibles ...',               time: '20:55', date: 'Ayer', converted: false }
];

let historyFilter = 'all';

async function initVentas() {
  loadBotFromState();
  renderKeywordsList();
  bindVentasEvents();
  renderBotHistory();
  bindHistoryFilters();

  if (getStoreId()) {
    try {
      // Cargar config del bot desde Supabase
      const cfg = await dbGetConfig();
      if (cfg?.bot && Object.keys(cfg.bot).length) {
        Object.assign(APP_STATE.bot, cfg.bot);
        loadBotFromState();
        renderKeywordsList();
      }
    } catch (e) { console.warn('dbGetConfig bot:', e); }

    try {
      const convs = await dbGetConversations(null, 50);
      if (convs.length) {
        APP_STATE.bot_history = convs;
        renderBotHistory(historyFilter);
      }
    } catch (e) { console.warn('dbGetConversations:', e); }
  }

  startBotMetricsUpdate();
}

function loadBotFromState() {
  const b = APP_STATE.bot;
  setCheck('ch-instagram', b.channels.instagram);
  setCheck('ch-whatsapp',  b.channels.whatsapp);
  setCheck('ch-facebook',  b.channels.facebook || false);
  setCheck('ch-telegram',  b.channels.telegram);
  setCheck('night-mode',   b.night_mode);
  setVal('night-start',    b.night_start);
  setVal('night-end',      b.night_end);
  setCheck('followup-toggle', b.followup);
  setCheck('ai-mode',      b.ai_mode);
  setVal('openai-key',     b.openai_key);
  setVal('ig-token',       b.ig_token);
  setVal('ig-account-id',  b.ig_account_id);
  setVal('ig-webhook-verify', b.ig_webhook_verify);
  setVal('wa-phone-id',    b.wa_phone_id);
  setVal('wa-token',       b.wa_token);
  setVal('wa-number',      b.wa_number);

  // Messages
  setVal('welcome-msg',   b.msgs.welcome);
  setVal('catalog-msg',   b.msgs.catalog);
  setVal('price-msg',     b.msgs.price);
  setVal('payment-msg',   b.msgs.payment);
  setVal('followup-msg',  b.msgs.followup);
}

function bindVentasEvents() {
  document.getElementById('btn-save-bot')?.addEventListener('click', saveBotConfig);

  // Message tabs
  document.querySelectorAll('.msg-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.msg-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.msg-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('msg-' + tab.dataset.msg)?.classList.add('active');
    });
  });

  // AI mode toggle
  document.getElementById('ai-mode')?.addEventListener('change', e => {
    const field = document.getElementById('ai-key-field');
    if (field) field.style.display = e.target.checked ? 'block' : 'none';
  });
  if (APP_STATE.bot.ai_mode) {
    const field = document.getElementById('ai-key-field');
    if (field) field.style.display = 'block';
  }

  // Add keyword
  document.getElementById('btn-add-keyword')?.addEventListener('click', () => {
    APP_STATE.bot.keywords.push({ trigger: '', response: '' });
    renderKeywordsList();
  });

  // Chat input enter
  document.getElementById('chat-sim-input')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') simulateChat();
  });
}

function renderKeywordsList() {
  const list = document.getElementById('keywords-list');
  if (!list) return;
  list.innerHTML = APP_STATE.bot.keywords.map((kw, i) => `
    <div class="keyword-row">
      <input type="text" class="kw-trigger" placeholder="palabra clave"
        value="${kw.trigger}" data-kw="${i}" data-field="trigger"
        oninput="updateKeyword(${i},'trigger',this.value)" />
      <input type="text" class="kw-response" placeholder="respuesta automática"
        value="${kw.response}" data-kw="${i}" data-field="response"
        oninput="updateKeyword(${i},'response',this.value)" />
      <button class="btn-remove-kw" onclick="removeKeyword(${i})"><i class="ti ti-trash"></i></button>
    </div>
  `).join('') || '<div style="color:var(--color-text-3);font-size:12px;padding:8px 0">No hay palabras clave configuradas</div>';
}

function updateKeyword(idx, field, val) {
  if (APP_STATE.bot.keywords[idx]) APP_STATE.bot.keywords[idx][field] = val;
}

function removeKeyword(idx) {
  APP_STATE.bot.keywords.splice(idx, 1);
  renderKeywordsList();
  showToast('Palabra clave eliminada', 'success');
}

function saveBotConfig() {
  const b = APP_STATE.bot;
  b.channels.instagram = document.getElementById('ch-instagram')?.checked;
  b.channels.whatsapp  = document.getElementById('ch-whatsapp')?.checked;
  b.channels.facebook  = document.getElementById('ch-facebook')?.checked;
  b.channels.telegram  = document.getElementById('ch-telegram')?.checked;
  b.night_mode  = document.getElementById('night-mode')?.checked;
  b.night_start = document.getElementById('night-start')?.value;
  b.night_end   = document.getElementById('night-end')?.value;
  b.followup    = document.getElementById('followup-toggle')?.checked;
  b.ai_mode     = document.getElementById('ai-mode')?.checked;
  b.openai_key  = document.getElementById('openai-key')?.value;
  b.ig_token    = document.getElementById('ig-token')?.value;
  b.ig_account_id    = document.getElementById('ig-account-id')?.value;
  b.ig_webhook_verify= document.getElementById('ig-webhook-verify')?.value;
  b.wa_phone_id = document.getElementById('wa-phone-id')?.value;
  b.wa_token    = document.getElementById('wa-token')?.value;
  b.wa_number   = document.getElementById('wa-number')?.value;

  b.msgs.welcome  = document.getElementById('welcome-msg')?.value;
  b.msgs.catalog  = document.getElementById('catalog-msg')?.value;
  b.msgs.price    = document.getElementById('price-msg')?.value;
  b.msgs.payment  = document.getElementById('payment-msg')?.value;
  b.msgs.followup = document.getElementById('followup-msg')?.value;

  saveState();

  // Persistir en Supabase
  if (getStoreId()) {
    dbSaveConfig('bot', b).catch(e => console.warn('dbSaveConfig bot:', e));
  }

  showToast('✓ Bot guardado correctamente', 'success');

  // Update dashboard metric
  const statusEl = document.getElementById('mod-bot-status');
  if (statusEl) { statusEl.textContent = 'Activo'; statusEl.className = 'status-badge on'; }
}

// ── Chat Simulator ────────────────────────────────────────────

function simulateChat() {
  const input = document.getElementById('chat-sim-input');
  if (!input) return;
  const msg = input.value.trim();
  if (!msg) return;

  const preview = document.getElementById('chat-preview');
  if (!preview) return;

  // User bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble user';
  userBubble.textContent = msg;
  preview.appendChild(userBubble);

  // Typing indicator
  const typing = document.createElement('div');
  typing.className = 'chat-bubble typing';
  typing.innerHTML = '<span></span><span></span><span></span>';
  preview.appendChild(typing);
  preview.scrollTop = preview.scrollHeight;

  input.value = '';

  setTimeout(() => {
    preview.removeChild(typing);

    const response = getBotResponse(msg.toLowerCase());
    const botBubble = document.createElement('div');
    botBubble.className = 'chat-bubble bot';
    botBubble.textContent = response;
    preview.appendChild(botBubble);
    preview.scrollTop = preview.scrollHeight;

    addToHistory('instagram', '@simulador', msg, response, false);
  }, rand(800, 1800));
}

function getBotResponse(msg) {
  const b = APP_STATE.bot;

  // Check user-defined keywords first
  for (const kw of b.keywords) {
    if (kw.trigger && msg.includes(kw.trigger.toLowerCase())) {
      return fillTemplate(kw.response);
    }
  }

  // Check built-in triggers
  for (const [trigger, responseFn] of Object.entries(BOT_RESPONSES)) {
    if (msg.includes(trigger)) {
      return fillTemplate(responseFn(b));
    }
  }

  // Default
  return fillTemplate(b.msgs.welcome);
}

function fillTemplate(template) {
  if (!template) return '¿En qué más puedo ayudarte? 😊';
  const b = APP_STATE.bot;
  return template
    .replace(/\{\{nombre\}\}/g, 'Usuario')
    .replace(/\{\{tienda\}\}/g, b.store_name || 'nuestra tienda')
    .replace(/\{\{link_catalogo\}\}/g, b.catalog_link || 'https://tu-tienda.com/catalogo')
    .replace(/\{\{ig_handle\}\}/g, b.ig_handle || '@tutienda')
    .replace(/\{\{link_precios\}\}/g, b.catalog_link || 'https://tu-tienda.com/precios')
    .replace(/\{\{link_resena\}\}/g, 'https://tu-tienda.com/resenas')
    .replace(/\{\{producto\}\}/g, 'tu pedido');
}

// ── Bot metrics ───────────────────────────────────────────────

async function startBotMetricsUpdate() {
  const update = async () => {
    const history = APP_STATE.bot_history || [];
    const today   = new Date().toLocaleDateString('es-AR');
    const todayChats = history.filter(h => h.date === 'Hoy' || h.date === today);
    const total    = todayChats.length || 0;
    const convs    = todayChats.filter(h => h.converted).length || 0;
    const igChats  = todayChats.filter(h => h.channel === 'instagram').length || 0;
    const waChats  = todayChats.filter(h => h.channel === 'whatsapp').length || 0;

    const setKV = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setKV('bot-chats-today',  total  || '—');
    setKV('bot-conversions',  convs  || '—');
    setKV('bot-ig-chats',     igChats || '—');
    setKV('bot-wa-chats',     waChats || '—');
    const mEl = document.getElementById('mod-bot-metric');
    if (mEl) mEl.textContent = total ? Math.round(convs / total * 100) + '% conv.' : 'Sin datos';
  };
  await update();
  setInterval(update, 30000);
}

// ── Historial de conversaciones ───────────────────────────────

function renderBotHistory(filter = 'all') {
  const list = document.getElementById('bot-history-list');
  if (!list) return;

  const merged = [...BOT_HISTORY_MOCK, ...(APP_STATE.bot_history || [])];
  const filtered = filter === 'all' ? merged : merged.filter(h => h.channel === filter);

  if (!filtered.length) {
    list.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--color-text-3)"><i class="ti ti-messages-off" style="font-size:32px;display:block;margin-bottom:8px"></i>No hay conversaciones en este canal</div>`;
    return;
  }

  const channelIcon = { instagram: 'ti-brand-instagram', whatsapp: 'ti-brand-whatsapp', facebook: 'ti-brand-facebook', telegram: 'ti-brand-telegram' };
  const channelColor = { instagram: '#E4405F', whatsapp: '#25D366', facebook: '#1877F2', telegram: '#0088cc' };

  list.innerHTML = filtered.map(h => `
    <div class="history-item">
      <div class="history-channel" style="color:${channelColor[h.channel] || '#9198a8'}">
        <i class="ti ${channelIcon[h.channel] || 'ti-message'}"></i>
      </div>
      <div class="history-body">
        <div class="history-user">${h.user} <span class="history-time">${h.date} ${h.time}</span></div>
        <div class="history-msg"><strong>Cliente:</strong> ${h.msg}</div>
        <div class="history-msg"><strong>Bot:</strong> ${h.response}</div>
      </div>
      <div class="history-status">
        ${h.converted ? '<span class="feed-badge badge-venta">Convertido</span>' : '<span class="feed-badge" style="background:var(--color-bg-3);color:var(--color-text-3)">Sin venta</span>'}
      </div>
    </div>
  `).join('');
}

function bindHistoryFilters() {
  document.querySelectorAll('[data-hfilter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-hfilter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      historyFilter = btn.dataset.hfilter;
      renderBotHistory(historyFilter);
    });
  });
}

function addToHistory(channel, user, msg, response, converted = false) {
  const entry = { id: 'h' + Date.now(), channel, user, msg, response, time: new Date().toLocaleTimeString('es-AR', {hour:'2-digit',minute:'2-digit'}), date: 'Hoy', converted };
  if (!APP_STATE.bot_history) APP_STATE.bot_history = [];
  APP_STATE.bot_history.unshift(entry);
  if (APP_STATE.bot_history.length > 50) APP_STATE.bot_history.pop();
  renderBotHistory(historyFilter);
}

// ── WhatsApp Business API call ────────────────────────────────
async function sendWhatsAppMessage(to, message) {
  const b = APP_STATE.bot;
  if (!b.wa_token || !b.wa_phone_id) {
    console.warn('WhatsApp no configurado');
    return { error: 'No configurado' };
  }
  // Endpoint oficial de la API de WhatsApp Business
  const url = `https://graph.facebook.com/v18.0/${b.wa_phone_id}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${b.wa_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: 'text',
        text: { body: message }
      })
    });
    return await res.json();
  } catch (e) {
    return { error: e.message };
  }
}

// ── Instagram Graph API message ───────────────────────────────
async function sendInstagramDM(recipientId, message) {
  const b = APP_STATE.bot;
  if (!b.ig_token || !b.ig_account_id) {
    console.warn('Instagram no configurado');
    return { error: 'No configurado' };
  }
  const url = `https://graph.facebook.com/v18.0/${b.ig_account_id}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${b.ig_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message:   { text: message }
      })
    });
    return await res.json();
  } catch (e) {
    return { error: e.message };
  }
}

// Helpers
function setVal(id, val) {
  const el = document.getElementById(id);
  if (el !== null && val !== undefined) el.value = val;
}
function setCheck(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}
