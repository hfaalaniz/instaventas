/* ============================================================
   SISTEMA AUTOMÁTICO DE VENTAS — app.js
   ============================================================ */

// ─── NAVIGATION ───────────────────────────────────────────
document.querySelectorAll('.nav-item[data-page]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const page = link.dataset.page;
    navigateTo(page);
    // Close sidebar on mobile
    if (window.innerWidth <= 700) {
      document.getElementById('sidebar').classList.remove('open');
    }
  });
});

function navigateTo(page) {
  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const link = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (link) link.classList.add('active');

  // Update pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  // Update topbar title
  const titles = {
    dashboard: 'Dashboard',
    pagos: 'Configuración de Pagos',
    carrito: 'Carrito Abandonado',
    autoventas: 'Auto-Ventas',
    pixel: 'Pixel Publicitario',
    auditoria: 'Auditoría Gratuita',
    configuracion: 'Configuración',
  };

  document.getElementById('pageTitle').textContent = titles[page] || page;
}

// Mobile menu toggle
document.getElementById('menuBtn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ─── TOAST ────────────────────────────────────────────────
function showToast(msg, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ─── CHART.JS DASHBOARD ───────────────────────────────────
let ventasChart;

function initChart() {
  const ctx = document.getElementById('ventasChart');
  if (!ctx) return;

  const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Hoy'];
  const data   = [92000, 138000, 115000, 165000, 121000, 187000, 148500];

  ventasChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Ventas',
          data,
          backgroundColor: 'rgba(233,69,96,0.15)',
          borderColor: '#e94560',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Recuperado',
          data: data.map(v => Math.round(v * 0.18)),
          backgroundColor: 'rgba(29,158,117,0.12)',
          borderColor: '#1D9E75',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'DM Sans', size: 11 }, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            label: ctx => ' $' + ctx.parsed.y.toLocaleString('es-AR')
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 } } },
        y: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            font: { family: 'DM Sans', size: 10 },
            callback: v => '$' + (v / 1000).toFixed(0) + 'k'
          }
        }
      }
    }
  });
}

window.addEventListener('load', () => {
  if (window.Chart) initChart();
  else setTimeout(initChart, 600);
});

// ─── LIVE KPI UPDATES ─────────────────────────────────────
const kpiData = [
  { ventas: '$148.500', pedidos: '15', recuperado: '$26.730', abandono: '26%' },
  { ventas: '$157.200', pedidos: '17', recuperado: '$28.296', abandono: '22%' },
  { ventas: '$134.900', pedidos: '12', recuperado: '$24.282', abandono: '30%' },
  { ventas: '$169.800', pedidos: '19', recuperado: '$30.564', abandono: '18%' },
];

let kpiIdx = 0;

function updateKPIs() {
  const d = kpiData[kpiIdx % kpiData.length];
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) { el.style.opacity = '0'; setTimeout(() => { el.textContent = val; el.style.opacity = '1'; }, 200); }
  };

  set('kpi-ventas', d.ventas);
  set('kpi-pedidos', d.pedidos);
  set('kpi-recuperado', d.recuperado);
  set('kpi-abandono', d.abandono);
  kpiIdx++;
}

setInterval(updateKPIs, 6000);

// ─── LIVE FEED ────────────────────────────────────────────
const feedEvents = [
  { tag: 'Venta', cls: 'tag-venta', msg: 'Sofía T. compró <strong>Pack Premium</strong> — $28.000' },
  { tag: 'Carrito', cls: 'tag-carrito', msg: 'Recordatorio enviado a <strong>pedro@mail.com</strong>' },
  { tag: 'Venta', cls: 'tag-venta', msg: 'Juan M. compró <strong>Producto C</strong> — $4.500' },
  { tag: 'Pixel', cls: 'tag-pixel', msg: 'Evento <strong>Purchase</strong> registrado — Facebook' },
  { tag: 'Recuperado', cls: 'tag-recuperado', msg: 'Emilio R. completó su compra — $11.200' },
  { tag: 'Venta', cls: 'tag-venta', msg: 'Paula G. compró <strong>Combo Starter</strong> — $19.800' },
  { tag: 'Pixel', cls: 'tag-pixel', msg: 'Evento <strong>AddToCart</strong> — Instagram' },
  { tag: 'Carrito', cls: 'tag-carrito', msg: 'Cupón VUELVE10 enviado a <strong>mario@mail.com</strong>' },
];

let feedIdx = 0;

function addFeedItem() {
  const feed = document.getElementById('activityFeed');
  if (!feed) return;

  const ev = feedEvents[feedIdx % feedEvents.length];
  const div = document.createElement('div');
  div.className = 'feed-item';
  div.style.cssText = 'opacity:0;transition:opacity .4s';
  div.innerHTML = `
    <span class="feed-tag ${ev.cls}">${ev.tag}</span>
    <span class="feed-msg">${ev.msg}</span>
    <span class="feed-time">ahora</span>
  `;

  feed.insertBefore(div, feed.firstChild);
  setTimeout(() => div.style.opacity = '1', 50);

  // Update older items' times
  const items = feed.querySelectorAll('.feed-time');
  const times = ['ahora','hace 2 min','hace 5 min','hace 10 min','hace 18 min','hace 27 min'];
  items.forEach((el, i) => { if (times[i]) el.textContent = times[i]; });

  // Keep max 7 items
  while (feed.children.length > 7) feed.removeChild(feed.lastChild);
  feedIdx++;
}

setInterval(addFeedItem, 8000);

// ─── MERCADO PAGO ─────────────────────────────────────────
function guardarMP() {
  const token = document.getElementById('mp-token').value.trim();
  const pubkey = document.getElementById('mp-pubkey').value.trim();

  if (!token || !pubkey) {
    showToast('⚠️ Completá el Access Token y la Public Key');
    return;
  }

  showToast('💾 Guardando configuración de Mercado Pago...');
  setTimeout(() => {
    document.getElementById('mp-success').style.display = 'block';
    showToast('✅ Mercado Pago configurado correctamente');
  }, 1200);
}

function probarConexionMP() {
  showToast('🔌 Probando conexión con Mercado Pago API...');
  setTimeout(() => {
    showToast('✅ Conexión exitosa — Token válido');
    document.getElementById('mp-success').style.display = 'block';
  }, 1500);
}

function toggleMPEnv() {
  const env = document.getElementById('mp-env').value;
  const tokenEl = document.getElementById('mp-token');
  if (env === 'sandbox') {
    tokenEl.value = 'TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    showToast('🔧 Modo Sandbox activado — no se procesarán pagos reales');
  } else {
    tokenEl.value = 'APP_USR-demo-token-produccion';
    showToast('🚀 Modo Producción activado');
  }
}

function toggleVisibility(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

function copiarWebhook() {
  const url = document.getElementById('webhook-url').value;
  navigator.clipboard.writeText(url).then(() => {
    showToast('📋 URL del webhook copiada al portapapeles');
  });
}

function updatePaymentMethod(method, enabled) {
  showToast(`${enabled ? '✅' : '🔴'} ${method} ${enabled ? 'habilitado' : 'deshabilitado'}`);
}

// ─── CARRITO ──────────────────────────────────────────────
function guardarCarrito() {
  showToast('💾 Secuencia de recuperación guardada ✅');
}

function updateDescPct(val) {
  document.getElementById('desc-pct-val').textContent = val + '%';
}

function updateHoras(val) {
  document.getElementById('cupón-horas-val').textContent = val + 'hs';
}

function exportarCarritos() {
  const rows = [
    ['Cliente','Email','Monto','Tiempo','Estado'],
    ['Lucas Martínez','lucas@mail.com','$15.300','2h','1° reminder'],
    ['Valentina Sosa','vale.s@gmail.com','$9.800','5h','2° reminder'],
    ['Roberto Díaz','rdi@hotmail.com','$22.000','1d','Recuperado'],
    ['Florencia Ruiz','flor.r@yahoo.com','$7.400','2d','Expirado'],
  ];

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'carritos_abandonados.csv';
  a.click(); URL.revokeObjectURL(url);
  showToast('📥 CSV exportado correctamente');
}

function enviarManual(email) {
  showToast(`📧 Recordatorio enviado a ${email}`);
}

// ─── BOT ──────────────────────────────────────────────────
function guardarBot() {
  showToast('💾 Mensajes del bot guardados ✅');
}

function toggleHorario(checked) {
  document.getElementById('horario-manual').style.display = checked ? 'none' : 'block';
}

function agregarFAQ() {
  const list = document.getElementById('faq-list');
  const div = document.createElement('div');
  div.className = 'faq-item';
  div.innerHTML = `
    <div class="faq-trigger">
      <input type="text" class="faq-input" placeholder="palabras clave separadas por /" />
    </div>
    <div class="faq-response">
      <textarea class="faq-textarea" placeholder="Respuesta automática..."></textarea>
    </div>
    <button class="btn-delete" onclick="this.parentElement.remove()">✕</button>
  `;
  list.appendChild(div);
  div.querySelector('input').focus();
  showToast('➕ Nueva pregunta frecuente agregada');
}

// ─── PIXEL ────────────────────────────────────────────────
function updateFBCode() {
  const id = document.getElementById('fb-pixel-id').value || 'TU_PIXEL_ID';
  const pre = document.getElementById('fb-code-content');
  pre.innerHTML = `&lt;!-- Facebook Pixel Code --&gt;
&lt;script&gt;
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id}');
fbq('track', 'PageView');
&lt;/script&gt;
&lt;noscript&gt;
&lt;img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"/&gt;
&lt;/noscript&gt;
&lt;!-- End Facebook Pixel Code --&gt;`;
}

function copiarCodigo(id) {
  const el = document.getElementById(id);
  const text = el.innerText;
  navigator.clipboard.writeText(text).then(() => {
    showToast('📋 Código copiado al portapapeles');
  });
}

function activarPixelFB() {
  const id = document.getElementById('fb-pixel-id').value.trim();
  if (!id) {
    showToast('⚠️ Ingresá el ID del Pixel de Facebook');
    return;
  }
  showToast('⚡ Activando Pixel de Facebook...');
  setTimeout(() => {
    document.getElementById('fb-status').textContent = 'Activo';
    document.getElementById('fb-status').className = 'pill pill-on';
    showToast('✅ Facebook Pixel activado correctamente — ID: ' + id);
  }, 1200);
}

function activarPixelIG() {
  showToast('⚡ Activando Pixel de Instagram...');
  setTimeout(() => {
    document.getElementById('ig-status').textContent = 'Activo';
    document.getElementById('ig-status').className = 'pill pill-on';
    showToast('✅ Instagram Pixel activado — conectado via Meta Business');
  }, 1200);
}

// ─── AUDITORÍA ────────────────────────────────────────────
function enviarAuditoria() {
  const nombre  = document.getElementById('aud-nombre').value.trim();
  const rubro   = document.getElementById('aud-rubro').value.trim();
  const web     = document.getElementById('aud-web').value.trim();
  const email   = document.getElementById('aud-email').value.trim();
  const ventas  = document.getElementById('aud-ventas').value;
  const problema = document.getElementById('aud-problema').value.trim();

  if (!nombre || !email || !web) {
    showToast('⚠️ Completá al menos nombre, email y sitio web');
    return;
  }

  showToast('🚀 Enviando solicitud de auditoría...');
  setTimeout(() => {
    document.getElementById('aud-success').style.display = 'block';
    document.getElementById('check-audit').innerHTML = '<span class="check-icon">✅</span> Auditoría solicitada';
    document.getElementById('check-audit').classList.remove('incomplete');
    showToast('✅ ¡Solicitud recibida! Te contactamos en 24hs');
  }, 1500);
}

// ─── CONFIGURACIÓN ────────────────────────────────────────
function updateStoreName(val) {
  const el = document.getElementById('storeName');
  if (el) el.textContent = val || 'Mi Tienda';
}

// ─── EXPORTAR REPORTE ─────────────────────────────────────
function exportarReporte() {
  const period = document.getElementById('periodSelect').value;
  showToast(`📥 Generando reporte de ${period}...`);
  setTimeout(() => {
    const data = `REPORTE DE VENTAS\nPeríodo: ${period}\n\nVentas totales: $148.500\nPedidos: 15\nRecuperado: $26.730\nTasa abandono: 26%\n\nGenerado: ${new Date().toLocaleString('es-AR')}`;
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `reporte-ventas-${period}.txt`;
    a.click(); URL.revokeObjectURL(url);
    showToast('✅ Reporte descargado');
  }, 800);
}

// ─── PERIOD CHANGE (actualizar KPIs) ─────────────────────
document.getElementById('periodSelect').addEventListener('change', function() {
  const period = this.value;
  const periods = {
    hoy:    { ventas: '$148.500', pedidos: '15', recuperado: '$26.730', abandono: '26%' },
    semana: { ventas: '$987.300', pedidos: '94', recuperado: '$177.714', abandono: '23%' },
    mes:    { ventas: '$3.824.100', pedidos: '367', recuperado: '$688.338', abandono: '21%' },
  };

  const d = periods[period];
  document.getElementById('kpi-ventas').textContent    = d.ventas;
  document.getElementById('kpi-pedidos').textContent   = d.pedidos;
  document.getElementById('kpi-recuperado').textContent = d.recuperado;
  document.getElementById('kpi-abandono').textContent  = d.abandono;
});