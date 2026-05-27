/* ============================================================
   PIXEL — Facebook Pixel, Instagram (Meta), CAPI, Events log
   ============================================================ */

const PIXEL_EVENTS_MOCK = [
  { type: 'Purchase',    cls: 'ev-purchase',    source: 'Facebook', data: 'value: $28.000 · currency: ARS',   ago: '1min' },
  { type: 'AddToCart',   cls: 'ev-addtocart',   source: 'Instagram',data: 'content: Pack Premium',             ago: '3min' },
  { type: 'PageView',    cls: 'ev-pageview',    source: 'Facebook', data: 'url: /producto/pack-premium',       ago: '4min' },
  { type: 'ViewContent', cls: 'ev-viewcontent', source: 'Facebook', data: 'content_type: product',             ago: '6min' },
  { type: 'Lead',        cls: 'ev-lead',        source: 'Instagram',data: 'form: contacto',                    ago: '9min' },
  { type: 'Purchase',    cls: 'ev-purchase',    source: 'Facebook', data: 'value: $12.500 · currency: ARS',   ago: '14min' }
];

function initPixel() {
  loadPixelFromState();
  populateEventLog();
  bindPixelEvents();
  startPixelMetricsUpdate();
  generateFBCode();
}

function loadPixelFromState() {
  const p = APP_STATE.pixel;
  setVal('fb-pixel-id',    p.fb_pixel_id);
  setVal('fb-capi-token',  p.fb_capi_token);
  setVal('ig-dataset-id',  p.ig_dataset_id);

  // FB events
  setCheck('fb-ev-pageview',     p.fb_events.pageview);
  setCheck('fb-ev-viewcontent',  p.fb_events.viewcontent);
  setCheck('fb-ev-addtocart',    p.fb_events.addtocart);
  setCheck('fb-ev-initcheckout', p.fb_events.initcheckout);
  setCheck('fb-ev-purchase',     p.fb_events.purchase);
  setCheck('fb-ev-lead',         p.fb_events.lead);
  setCheck('fb-ev-contact',      p.fb_events.contact);
  setCheck('fb-ev-schedule',     p.fb_events.schedule);

  // IG features
  setCheck('ig-stories',    p.ig_features.stories);
  setCheck('ig-shopping',   p.ig_features.shopping);
  setCheck('ig-capi',       p.ig_features.capi);
  setCheck('ig-lookalike',  p.ig_features.lookalike);

  // Status badges
  updatePixelStatusBadges();
}

function bindPixelEvents() {
  document.getElementById('btn-save-pixel')?.addEventListener('click', savePixelConfig);

  document.getElementById('btn-activate-fb')?.addEventListener('click', activateFBPixel);
  document.getElementById('btn-activate-ig')?.addEventListener('click', activateIGPixel);

  // Live update code preview on ID change
  document.getElementById('fb-pixel-id')?.addEventListener('input', debounce(() => {
    generateFBCode();
  }, 500));

  // Live pixel event log
  setInterval(addPixelEventLog, 8000);
}

function savePixelConfig() {
  const p = APP_STATE.pixel;
  p.fb_pixel_id   = document.getElementById('fb-pixel-id')?.value || '';
  p.fb_capi_token = document.getElementById('fb-capi-token')?.value || '';
  p.ig_dataset_id = document.getElementById('ig-dataset-id')?.value || '';

  p.fb_events.pageview     = document.getElementById('fb-ev-pageview')?.checked;
  p.fb_events.viewcontent  = document.getElementById('fb-ev-viewcontent')?.checked;
  p.fb_events.addtocart    = document.getElementById('fb-ev-addtocart')?.checked;
  p.fb_events.initcheckout = document.getElementById('fb-ev-initcheckout')?.checked;
  p.fb_events.purchase     = document.getElementById('fb-ev-purchase')?.checked;
  p.fb_events.lead         = document.getElementById('fb-ev-lead')?.checked;
  p.fb_events.contact      = document.getElementById('fb-ev-contact')?.checked;
  p.fb_events.schedule     = document.getElementById('fb-ev-schedule')?.checked;

  p.ig_features.stories    = document.getElementById('ig-stories')?.checked;
  p.ig_features.shopping   = document.getElementById('ig-shopping')?.checked;
  p.ig_features.capi       = document.getElementById('ig-capi')?.checked;
  p.ig_features.lookalike  = document.getElementById('ig-lookalike')?.checked;

  saveState();
  generateFBCode();
  showToast('✓ Configuración de Pixel guardada', 'success');
}

function activateFBPixel() {
  const pixelId = document.getElementById('fb-pixel-id')?.value;
  if (!pixelId || pixelId.length < 10) {
    showToast('Ingresá un Pixel ID válido (15 dígitos)', 'error'); return;
  }

  APP_STATE.pixel.fb_active = true;
  APP_STATE.pixel.fb_pixel_id = pixelId;

  // Inyectar pixel en la página
  injectFBPixel(pixelId);
  generateFBCode();
  updatePixelStatusBadges();
  saveState();
  showToast(`✓ Facebook Pixel ${pixelId} activado`, 'success');

  // Update module status
  const statusEl = document.getElementById('mod-pixel-status');
  if (statusEl) { statusEl.textContent = 'Activo'; statusEl.className = 'status-badge on'; }
}

function activateIGPixel() {
  const pixelId = document.getElementById('fb-pixel-id')?.value || document.getElementById('ig-dataset-id')?.value;
  if (!pixelId || pixelId.length < 10) {
    showToast('Configurá el Facebook Pixel primero (es el mismo Pixel)', 'error'); return;
  }
  APP_STATE.pixel.ig_active = true;
  updatePixelStatusBadges();
  saveState();
  showToast('✓ Instagram Pixel activado (Meta Pixel compartido)', 'success');
}

// ── Facebook Pixel SDK ────────────────────────────────────────

function injectFBPixel(pixelId) {
  if (document.getElementById('fb-pixel-script')) return; // Ya inyectado

  const script = document.createElement('script');
  script.id = 'fb-pixel-script';
  script.textContent = `
    !function(f,b,e,v,n,t,s){
      if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
  `;
  document.head.appendChild(script);
  console.log('FB Pixel inyectado:', pixelId);
}

function trackEvent(eventName, params = {}) {
  if (typeof fbq !== 'undefined') {
    fbq('track', eventName, params);
    addEventToLog(eventName, 'Facebook', JSON.stringify(params));
  } else {
    console.log('[Pixel simulado]', eventName, params);
    addEventToLog(eventName, 'Simulado', JSON.stringify(params));
  }
}

function testPixelEvent(platform, eventName) {
  const pixelId = document.getElementById('fb-pixel-id')?.value;
  if (!pixelId) { showToast('Ingresá el Pixel ID primero', 'error'); return; }
  trackEvent(eventName, { test: true, platform });
  showToast(`✓ Evento "${eventName}" disparado desde ${platform}`, 'success');
}

function openMetaBusiness() {
  window.open('https://business.facebook.com/events_manager', '_blank');
}

// ── Code generation ───────────────────────────────────────────

function generateFBCode() {
  const pixelId = document.getElementById('fb-pixel-id')?.value || 'TU_PIXEL_ID';
  const events  = APP_STATE.pixel.fb_events;
  const hasCAPI = document.getElementById('fb-capi-token')?.value;

  const eventLines = [];
  if (events.pageview)     eventLines.push("fbq('track', 'PageView');");
  if (events.viewcontent)  eventLines.push("fbq('track', 'ViewContent');");
  if (events.addtocart)    eventLines.push("fbq('track', 'AddToCart', {value: precio, currency: 'ARS'});");
  if (events.initcheckout) eventLines.push("fbq('track', 'InitiateCheckout');");
  if (events.purchase)     eventLines.push("fbq('track', 'Purchase', {value: total, currency: 'ARS'});");

  const code = `<!-- Meta Pixel Code -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${pixelId}');
  ${eventLines.join('\n  ')}
<\/script>
<noscript>
  <img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>
</noscript>
<!-- End Meta Pixel Code -->
${hasCAPI ? `\n<!-- Conversions API (server-side) -->\n// Configurar en tu backend con el Access Token` : ''}`;

  const preview = document.getElementById('fb-code-preview');
  if (preview) preview.textContent = code;
}

function copyPixelCode(platform) {
  const id = platform === 'fb' ? 'fb-code-preview' : 'ig-code-preview';
  const el = document.getElementById(id);
  if (!el) return;
  copyText(el.textContent);
}

// ── Event log ─────────────────────────────────────────────────

function populateEventLog() {
  const log = document.getElementById('pixel-events-log');
  if (!log) return;
  PIXEL_EVENTS_MOCK.forEach(ev => {
    log.appendChild(buildEventLogItem(ev.type, ev.cls, ev.source, ev.data, ev.ago));
  });
}

function addPixelEventLog() {
  const events = [
    { type: 'PageView',    cls: 'ev-pageview',    source: 'Facebook', data: 'url: /producto/' + ['zapatillas', 'remera', 'pack-premium'][rand(0,2)] },
    { type: 'AddToCart',   cls: 'ev-addtocart',   source: 'Instagram',data: 'value: $' + rand(3000,25000) },
    { type: 'ViewContent', cls: 'ev-viewcontent', source: 'Facebook', data: 'content_ids: [' + rand(100,999) + ']' },
    { type: 'Purchase',    cls: 'ev-purchase',    source: 'Facebook', data: 'value: $' + rand(5000,50000) + ' · currency: ARS' }
  ];
  const ev = events[Math.floor(Math.random() * events.length)];
  const log = document.getElementById('pixel-events-log');
  if (!log) return;
  const item = buildEventLogItem(ev.type, ev.cls, ev.source, ev.data, 'ahora');
  item.style.opacity = '0';
  log.insertBefore(item, log.firstChild);
  setTimeout(() => { item.style.transition = 'opacity 0.4s'; item.style.opacity = '1'; }, 20);
  if (log.children.length > 10) log.removeChild(log.lastChild);
}

function addEventToLog(type, source, data) {
  const clsMap = { 'PageView': 'ev-pageview', 'AddToCart': 'ev-addtocart', 'Purchase': 'ev-purchase', 'ViewContent': 'ev-viewcontent', 'Lead': 'ev-lead' };
  const cls = clsMap[type] || 'ev-pageview';
  const log = document.getElementById('pixel-events-log');
  if (!log) return;
  const item = buildEventLogItem(type, cls, source, data, 'ahora');
  log.insertBefore(item, log.firstChild);
  if (log.children.length > 12) log.removeChild(log.lastChild);
}

function buildEventLogItem(type, cls, source, data, ago) {
  const div = document.createElement('div');
  div.className = 'event-log-item';
  div.innerHTML = `<span class="ev-type ${cls}">${type}</span><span class="ev-source">${source}</span><span class="ev-data">${data}</span><span class="ev-time">${ago}</span>`;
  return div;
}

function updatePixelStatusBadges() {
  const p = APP_STATE.pixel;
  const fbStatus = document.getElementById('fb-pixel-status');
  const igStatus = document.getElementById('ig-pixel-status');

  if (fbStatus) {
    fbStatus.innerHTML = p.fb_active
      ? '<span class="status-dot dot-on"></span> Activo'
      : '<span class="status-dot dot-off"></span> Inactivo';
  }
  if (igStatus) {
    igStatus.innerHTML = p.ig_active
      ? '<span class="status-dot dot-on"></span> Activo'
      : '<span class="status-dot dot-off"></span> Inactivo';
  }
}

function startPixelMetricsUpdate() {
  const update = () => {
    setTextContentSafe('px-pageview',   rand(800, 1200));
    setTextContentSafe('px-addtocart',  rand(100, 180));
    setTextContentSafe('px-purchase',   rand(30, 60));
    setTextContentSafe('px-viewcontent',rand(280, 420));
    setTextContentSafe('px-lead',       rand(35, 80));
    const pageviews  = parseInt(document.getElementById('px-pageview')?.textContent) || 1;
    const purchases  = parseInt(document.getElementById('px-purchase')?.textContent) || 0;
    setTextContentSafe('px-conv-rate', ((purchases / pageviews) * 100).toFixed(1) + '%');
    setTextContentSafe('kpi-pixel-events', formatNumber(rand(950, 1400)));
  };
  update();
  setInterval(update, 15000);
}

function setTextContentSafe(id, val) {
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
