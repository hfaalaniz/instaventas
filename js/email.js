/* ============================================================
   EMAIL MARKETING — Suscriptores, Flows, Campañas
   ============================================================ */

const CAMPAIGN_HISTORY_MOCK = [
  { id: 'cam1', subject: '🎉 Oferta especial de fin de semana',  segment: 'Todos', sent: 142, opened: 67, clicked: 23, date: '2026-05-18' },
  { id: 'cam2', subject: '📦 Nuevos productos disponibles',       segment: 'Activos', sent: 89, opened: 52, clicked: 31, date: '2026-05-12' },
  { id: 'cam3', subject: '💙 Te extrañamos — Volvé con 15% OFF', segment: 'Inactivos', sent: 54, opened: 21, clicked: 8, date: '2026-05-05' }
];

function initEmail() {
  loadEmailFromState();
  renderSubscribersList();
  renderCampaignTable();
  bindEmailEvents();
  updateEmailKPIs();
}

function loadEmailFromState() {
  const e = APP_STATE.email;
  setEmailVal('smtp-host',       e.smtp.host);
  setEmailVal('smtp-port',       e.smtp.port);
  setEmailVal('smtp-user',       e.smtp.user);
  setEmailVal('smtp-pass',       e.smtp.pass);
  setEmailVal('smtp-from',       e.smtp.from);
  setEmailVal('smtp-from-name',  e.smtp.from_name);
  setEmailVal('sendgrid-key',    e.sendgrid.key);
  setEmailVal('sendgrid-from',   e.sendgrid.from);
  setEmailVal('mailchimp-key',   e.mailchimp.key);
  setEmailVal('mailchimp-list',  e.mailchimp.list_id);
  setEmailVal('brevo-key',       e.brevo.key);
  setEmailVal('brevo-from',      e.brevo.from);
  // Flows
  setEmailCheck('flow-welcome',     e.flows.welcome.active);
  setEmailCheck('flow-carrito',     e.flows.carrito.active);
  setEmailCheck('flow-postcompra',  e.flows.postcompra.active);
  setEmailCheck('flow-reactivacion',e.flows.reactivacion.active);
  setEmailVal('flow-welcome-msg',     e.flows.welcome.msg);
  setEmailVal('flow-carrito-msg',     e.flows.carrito.msg);
  setEmailVal('flow-postcompra-msg',  e.flows.postcompra.msg);
  setEmailVal('flow-reactivacion-msg',e.flows.reactivacion.msg);
}

function saveEmailConfig() {
  const e = APP_STATE.email;
  e.provider = currentEmailProvider;
  e.smtp.host      = document.getElementById('smtp-host')?.value || '';
  e.smtp.port      = parseInt(document.getElementById('smtp-port')?.value) || 587;
  e.smtp.user      = document.getElementById('smtp-user')?.value || '';
  e.smtp.pass      = document.getElementById('smtp-pass')?.value || '';
  e.smtp.from      = document.getElementById('smtp-from')?.value || '';
  e.smtp.from_name = document.getElementById('smtp-from-name')?.value || '';
  e.sendgrid.key   = document.getElementById('sendgrid-key')?.value || '';
  e.sendgrid.from  = document.getElementById('sendgrid-from')?.value || '';
  e.mailchimp.key  = document.getElementById('mailchimp-key')?.value || '';
  e.mailchimp.list_id = document.getElementById('mailchimp-list')?.value || '';
  e.brevo.key      = document.getElementById('brevo-key')?.value || '';
  e.brevo.from     = document.getElementById('brevo-from')?.value || '';
  e.flows.welcome.active      = document.getElementById('flow-welcome')?.checked;
  e.flows.carrito.active      = document.getElementById('flow-carrito')?.checked;
  e.flows.postcompra.active   = document.getElementById('flow-postcompra')?.checked;
  e.flows.reactivacion.active = document.getElementById('flow-reactivacion')?.checked;
  e.flows.welcome.msg      = document.getElementById('flow-welcome-msg')?.value || '';
  e.flows.carrito.msg      = document.getElementById('flow-carrito-msg')?.value || '';
  e.flows.postcompra.msg   = document.getElementById('flow-postcompra-msg')?.value || '';
  e.flows.reactivacion.msg = document.getElementById('flow-reactivacion-msg')?.value || '';
  saveState();
  showToast('✓ Configuración de email guardada', 'success');
}

// ── Suscriptores ──────────────────────────────────────────────

function renderSubscribersList() {
  const list = document.getElementById('subscribers-list');
  if (!list) return;
  const subs = APP_STATE.email.subscribers || [];
  if (!subs.length) {
    list.innerHTML = `<div style="padding:1rem;text-align:center;color:var(--color-text-3);font-size:13px">No hay suscriptores aún. Agregá el primero.</div>`;
    return;
  }
  list.innerHTML = subs.slice(0, 10).map((s, i) => `
    <div class="subscriber-row">
      <div class="subscriber-avatar">${s.email[0].toUpperCase()}</div>
      <div class="subscriber-email">${s.email}</div>
      <div class="subscriber-date">${s.date || '—'}</div>
      <button class="btn-remove-kw" onclick="removeSubscriber(${i})" title="Eliminar"><i class="ti ti-trash"></i></button>
    </div>
  `).join('') + (subs.length > 10 ? `<div style="text-align:center;font-size:12px;color:var(--color-text-3);padding:8px">y ${subs.length - 10} más...</div>` : '');
  document.getElementById('subscribers-count').textContent = `${subs.length} suscriptores`;
  document.getElementById('email-subscribers').textContent = subs.length;
}

function addSubscriber(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Email inválido', 'error'); return;
  }
  const subs = APP_STATE.email.subscribers;
  if (subs.find(s => s.email === email)) { showToast('Ya existe este suscriptor', 'error'); return; }
  subs.push({ email, date: new Date().toLocaleDateString('es-AR') });
  saveState();
  renderSubscribersList();
  updateEmailKPIs();
  showToast(`✓ ${email} agregado`, 'success');
}

function removeSubscriber(idx) {
  APP_STATE.email.subscribers.splice(idx, 1);
  saveState();
  renderSubscribersList();
  updateEmailKPIs();
  showToast('Suscriptor eliminado', 'success');
}

function exportSubscribersCSV() {
  const subs = APP_STATE.email.subscribers;
  if (!subs.length) { showToast('No hay suscriptores para exportar', 'error'); return; }
  const rows = [['Email', 'Fecha']].concat(subs.map(s => [s.email, s.date || '']));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `suscriptores-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✓ CSV exportado', 'success');
}

function importSubscribersCSV(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const lines = e.target.result.split('\n').slice(1);
    let added = 0;
    const subs = APP_STATE.email.subscribers;
    lines.forEach(line => {
      const email = line.split(',')[0]?.trim().replace(/"/g, '');
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !subs.find(s => s.email === email)) {
        subs.push({ email, date: new Date().toLocaleDateString('es-AR') });
        added++;
      }
    });
    saveState();
    renderSubscribersList();
    updateEmailKPIs();
    showToast(`✓ ${added} suscriptores importados`, 'success');
  };
  reader.readAsText(file);
}

// ── Campañas ──────────────────────────────────────────────────

function renderCampaignTable() {
  const table = document.getElementById('campaign-table');
  if (!table) return;
  const all = [...CAMPAIGN_HISTORY_MOCK, ...(APP_STATE.email.campaigns || [])];
  if (!all.length) {
    table.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--color-text-3)">No hay campañas enviadas aún</div>`;
    return;
  }
  table.innerHTML = `
    <div class="campaign-row header-row">
      <div>Asunto</div><div>Segmento</div><div>Enviados</div><div>Abiertos</div><div>Clicks</div><div>Fecha</div>
    </div>
    ${all.map(c => `
      <div class="campaign-row">
        <div class="campaign-subject">${c.subject}</div>
        <div style="font-size:12px;color:var(--color-text-3)">${c.segment}</div>
        <div>${c.sent}</div>
        <div class="green">${c.opened} <span style="font-size:11px;color:var(--color-text-3)">(${Math.round(c.opened/c.sent*100)}%)</span></div>
        <div class="amber">${c.clicked} <span style="font-size:11px;color:var(--color-text-3)">(${Math.round(c.clicked/c.sent*100)}%)</span></div>
        <div style="font-size:12px;color:var(--color-text-3)">${c.date}</div>
      </div>
    `).join('')}
  `;
}

function sendCampaign() {
  const subject = document.getElementById('campaign-subject')?.value?.trim();
  const segment = document.getElementById('campaign-segment')?.value;
  const body    = document.getElementById('campaign-body')?.value?.trim();
  const result  = document.getElementById('campaign-result');

  if (!subject) { showToast('Ingresá el asunto', 'error'); return; }
  if (!body)    { showToast('Escribí el cuerpo del email', 'error'); return; }

  const subs  = APP_STATE.email.subscribers;
  const total = subs.length || 0;

  const btn = document.getElementById('btn-send-campaign');
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="ti ti-loader"></i> Enviando...';
  btn.disabled = true;

  setTimeout(() => {
    const campaign = {
      id: 'cam' + Date.now(), subject,
      segment: { all: 'Todos', active: 'Activos', inactive: 'Inactivos', abandoned: 'Carrito' }[segment] || 'Todos',
      sent: total, opened: Math.round(total * 0.38), clicked: Math.round(total * 0.12),
      date: new Date().toLocaleDateString('es-AR')
    };
    APP_STATE.email.campaigns.push(campaign);
    saveState();
    renderCampaignTable();
    if (result) {
      result.style.display = 'block';
      result.className = 'notification notif-success';
      result.innerHTML = `<i class="ti ti-circle-check"></i> Campaña "<strong>${subject}</strong>" enviada a ${total} suscriptores.`;
    }
    document.getElementById('campaign-subject').value = '';
    document.getElementById('campaign-body').value    = '';
    btn.innerHTML = orig;
    btn.disabled  = false;
    showToast('✓ Campaña enviada', 'success');
  }, 1800);
}

function previewCampaign() {
  const subject = document.getElementById('campaign-subject')?.value || '(sin asunto)';
  const body    = document.getElementById('campaign-body')?.value   || '';
  const store   = APP_STATE.config.store_name || 'Mi Tienda';
  const modal   = document.getElementById('email-preview-modal');
  const content = document.getElementById('email-preview-content');
  if (!modal || !content) return;
  content.innerHTML = `
    <div class="email-preview-envelope">
      <div class="email-prev-header"><strong>De:</strong> ${store} &lt;${APP_STATE.email.smtp.from || 'ventas@mitienda.com'}&gt;</div>
      <div class="email-prev-header"><strong>Asunto:</strong> ${subject}</div>
      <div class="email-prev-body">${body.replace(/\n/g, '<br>')}</div>
      <div class="email-prev-footer">© ${new Date().getFullYear()} ${store}. <a href="#">Desuscribirse</a></div>
    </div>
  `;
  modal.style.display = 'flex';
}

function updateEmailKPIs() {
  const subs = APP_STATE.email.subscribers?.length || 0;
  const allCamps = [...CAMPAIGN_HISTORY_MOCK, ...(APP_STATE.email.campaigns || [])];
  const totalSent   = allCamps.reduce((s, c) => s + c.sent, 0);
  const totalOpened = allCamps.reduce((s, c) => s + c.opened, 0);
  const totalClicked = allCamps.reduce((s, c) => s + c.clicked, 0);
  const openRate  = totalSent ? Math.round(totalOpened  / totalSent * 100) : 38;
  const clickRate = totalSent ? Math.round(totalClicked / totalSent * 100) : 12;

  const setKV = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setKV('email-subscribers', subs);
  setKV('email-open-rate',  openRate + '%');
  setKV('email-click-rate', clickRate + '%');
  setKV('email-unsub-rate', '0.8%');
}

// ── Provider tabs ─────────────────────────────────────────────

let currentEmailProvider = APP_STATE.email.provider || 'smtp';

function bindEmailEvents() {
  // Provider tabs
  document.querySelectorAll('.email-prov-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.email-prov-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.email-prov-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      currentEmailProvider = tab.dataset.prov;
      document.getElementById('epanel-' + currentEmailProvider)?.classList.add('active');
    });
  });
  // Activar proveedor actual
  document.querySelector(`.email-prov-tab[data-prov="${currentEmailProvider}"]`)?.click();

  // Save
  document.getElementById('btn-save-email')?.addEventListener('click', saveEmailConfig);

  // Test email
  document.getElementById('btn-test-email')?.addEventListener('click', testEmailConnection);

  // Add subscriber
  document.getElementById('btn-add-subscriber')?.addEventListener('click', () => {
    const input = document.getElementById('new-subscriber-email');
    addSubscriber(input?.value?.trim());
    if (input) input.value = '';
  });
  document.getElementById('new-subscriber-email')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      addSubscriber(e.target.value.trim());
      e.target.value = '';
    }
  });

  // Export suscriptores
  document.getElementById('btn-export-subscribers')?.addEventListener('click', exportSubscribersCSV);

  // Import CSV
  const uploadArea = document.getElementById('subscribers-upload-area');
  const csvInput   = document.getElementById('subscribers-csv');
  uploadArea?.addEventListener('click', () => csvInput?.click());
  uploadArea?.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
  uploadArea?.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
  uploadArea?.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) importSubscribersCSV(file);
  });
  csvInput?.addEventListener('change', e => { if (e.target.files[0]) importSubscribersCSV(e.target.files[0]); });

  // Campaign
  document.getElementById('btn-send-campaign')?.addEventListener('click', sendCampaign);
  document.getElementById('btn-preview-campaign')?.addEventListener('click', previewCampaign);

  // Close preview modal
  document.getElementById('btn-close-email-preview')?.addEventListener('click', () => {
    document.getElementById('email-preview-modal').style.display = 'none';
  });
}

async function testEmailConnection() {
  const result = document.getElementById('email-test-result');
  const btn    = document.getElementById('btn-test-email');
  const orig   = btn.innerHTML;
  btn.innerHTML = '<i class="ti ti-loader"></i> Probando...';
  btn.disabled = true;
  await new Promise(r => setTimeout(r, 1500));
  if (result) {
    result.style.display = 'block';
    result.className = 'notification notif-success';
    result.innerHTML = '<i class="ti ti-circle-check"></i> Conexión simulada OK. Configurá las credenciales reales para envíos efectivos.';
  }
  btn.innerHTML = orig;
  btn.disabled  = false;
}

function setEmailVal(id, val) { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; }
function setEmailCheck(id, val) { const el = document.getElementById(id); if (el) el.checked = !!val; }

window.removeSubscriber = removeSubscriber;
window.previewCampaign  = previewCampaign;
