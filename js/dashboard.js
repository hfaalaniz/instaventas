/* ============================================================
   DASHBOARD — KPIs en tiempo real, Chart, Activity Feed
   ============================================================ */

const FEED_EVENTS = [
  { type: 'Venta',     cls: 'badge-venta',   msgs: ['Sofía T. compró Pack Premium — $28.000', 'Ana M. compró Remera Logo — $4.500', 'Carlos R. compró Kit Completo — $52.000', 'Valentina S. compró Perfume XL — $18.700', 'Juan P. compró Auriculares Pro — $9.200'] },
  { type: 'Carrito',   cls: 'badge-carrito', msgs: ['Recordatorio enviado a pedro@mail.com', 'Recordatorio #2 enviado a sofia@gmail.com', 'Cupón VUELVE-A4B7 generado para lucas@hot.com'] },
  { type: 'Recuperado',cls: 'badge-recup',   msgs: ['Emilio R. completó su compra — $11.200', 'Laura P. usó cupón VUELVE-X3Y2 — $7.400', 'Miguel F. volvió a comprar — $15.000'] },
  { type: 'Pixel',     cls: 'badge-pixel',   msgs: ['Evento "Purchase" registrado — Facebook', 'Evento "AddToCart" — Instagram', '"InitiateCheckout" — Meta Pixel activo'] },
  { type: 'Bot',       cls: 'badge-bot',     msgs: ['Bot respondió DM @user_IG en 0.8s', 'Cotización enviada por WhatsApp a +549...', 'Bot cerró venta automática — $6.500'] }
];

const CHART_DATA = {
  hoy: {
    labels: ['08:00','10:00','12:00','14:00','16:00','18:00','20:00'],
    ventas:      [12000, 28500, 44200, 61800, 88400, 130200, 156800],
    pedidos:     [1, 3, 4, 6, 10, 13, 15],
    recuperados: [0, 3200, 5100, 8400, 13700, 18900, 22000]
  },
  semana: {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    ventas:      [89400, 134200, 98700, 156800, 142300, 203100, 156800],
    pedidos:     [8, 12, 9, 15, 13, 19, 15],
    recuperados: [15200, 22800, 18100, 28400, 24700, 36500, 22000]
  },
  mes: {
    labels: ['S1', 'S2', 'S3', 'S4'],
    ventas:      [487200, 612800, 541300, 698400],
    pedidos:     [42, 58, 49, 67],
    recuperados: [82400, 104700, 91200, 118600]
  }
};

let currentPeriod = APP_STATE.dashboard_period || 'hoy';

let salesChart = null;
let feedCount = 0;
let feedInterval = null;
let kpiInterval  = null;
let currentChartType = 'ventas';
let dashboardInitialized = false;

function initDashboard() {
  // Set today's date
  const todayEl = document.getElementById('today-date');
  if (todayEl) todayEl.textContent = getTodayFormatted();

  // Init KPIs
  updateDashboardKPIs();

  // Init chart
  initSalesChart('ventas');

  // Init feed with some items
  populateInitialFeed();

  // Guardar sólo un par de intervalos — limpiar anteriores si los hubiera
  if (kpiInterval)  clearInterval(kpiInterval);
  if (feedInterval) clearInterval(feedInterval);
  kpiInterval  = setInterval(updateDashboardKPIs, 8000);
  feedInterval = setInterval(addFeedItem, 5000);
  dashboardInitialized = true;

  // Period tabs
  document.querySelectorAll('.period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentPeriod = tab.dataset.period;
      APP_STATE.dashboard_period = currentPeriod;
      updateDashboardKPIs(true);
      updateChartData(currentChartType || 'ventas');
      updatePeriodLabel();
    });
  });
  updatePeriodLabel();

  // Chart tab events
  document.querySelectorAll('.chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentChartType = tab.dataset.chart;
      updateChartData(currentChartType);
    });
  });

  // Refresh button
  document.getElementById('btn-refresh-dashboard')?.addEventListener('click', () => {
    updateDashboardKPIs(true);
    showToast('Dashboard actualizado', 'success');
  });

  // Export button
  document.getElementById('btn-export-dashboard')?.addEventListener('click', exportDashboardCSV);

  // Module card navigation
  document.querySelectorAll('.module-card[data-goto]').forEach(card => {
    card.addEventListener('click', () => showSection(card.dataset.goto));
  });
}

function updatePeriodLabel() {
  const labels = { hoy: 'Hoy', semana: 'Esta semana', mes: 'Este mes' };
  // Actualiza sólo el nodo de texto del label, sin tocar el span #today-date
  const el = document.getElementById('date-label');
  if (!el) return;
  // El primer nodo de texto es "Hoy, " — lo actualizamos directamente
  const textNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
  const newText  = (labels[currentPeriod] || 'Hoy') + ', ';
  if (textNode) {
    textNode.textContent = newText;
  } else {
    el.insertBefore(document.createTextNode(newText), el.firstChild);
  }
}

function getPeriodMultiplier() {
  return { hoy: 1, semana: 7, mes: 30 }[currentPeriod] || 1;
}

function updateDashboardKPIs(animate = false) {
  const s = APP_STATE.dashboard;
  const mult = getPeriodMultiplier();
  const ventas     = (s.totalSales     * mult) + rand(-8000, 12000) * mult;
  const pedidos    = (s.totalOrders    * mult) + rand(-2, 4) * mult;
  const recuperados= (s.totalRecovered * mult) + rand(-1000, 3000) * mult;
  const abandon    = s.abandonRate    + rand(-5, 5);
  const botChats   = rand(28, 45) * mult;
  const pixelEvts  = rand(900, 1200) * mult;

  const setKPI = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setKPI('kpi-ventas', formatCurrency(Math.max(ventas, 0)));
  setKPI('kpi-pedidos', pedidos);
  setKPI('kpi-recuperados', formatCurrency(Math.max(recuperados, 0)));
  setKPI('kpi-abandon', Math.max(abandon, 0) + '%');
  setKPI('kpi-bot-chats', botChats);
  setKPI('kpi-pixel-events', formatNumber(pixelEvts));

  // Deltas
  setKPI('kpi-ventas-delta', '▲ ' + rand(5, 22) + '% vs ayer');
  setKPI('kpi-pedidos-delta', '▲ ' + rand(2, 15) + '% vs ayer');
  setKPI('kpi-recup-delta', '— ' + rand(1, 4) + ' carritos recuperados');
  setKPI('kpi-bot-delta', '▲ ' + rand(3, 18) + '% vs ayer');
}

function exportDashboardCSV() {
  const mult = getPeriodMultiplier();
  const period = { hoy: 'Hoy', semana: 'Semana', mes: 'Mes' }[currentPeriod];
  const data = CHART_DATA[currentPeriod];
  const rows = [['Período', 'Ventas (ARS)', 'Pedidos', 'Recuperados (ARS)']];
  data.labels.forEach((lbl, i) => {
    rows.push([lbl, data.ventas[i], data.pedidos[i], data.recuperados[i]]);
  });
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-dashboard-${currentPeriod}-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✓ Reporte exportado', 'success');
}

function initSalesChart(type) {
  const canvas = document.getElementById('sales-chart');
  if (!canvas) return;

  // Si ya existe, solo actualizar datos — nunca destruir/recrear
  if (salesChart) {
    updateChartData(type);
    return;
  }

  const ctx = canvas.getContext('2d');
  salesChart = new Chart(ctx, {
    type: 'line',
    data: { labels: CHART_DATA[currentPeriod].labels, datasets: buildDatasets(type) },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      // Desactiva el ResizeObserver de Chart.js que causa el loop de crecimiento
      resizeDelay: 0,
      onResize: null,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => {
              const val = c.parsed.y;
              return (type === 'ventas' || type === 'recuperados') ? formatCurrency(val) : val + ' pedidos';
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#9198a8' } },
        y: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            font: { size: 11 },
            color: '#9198a8',
            callback: v => currentChartType === 'pedidos' ? v : '$' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v)
          }
        }
      }
    }
  });
}

function buildDatasets(type) {
  const colors = {
    ventas:      { border: '#e94560', bg: 'rgba(233,69,96,0.08)' },
    pedidos:     { border: '#185FA5', bg: 'rgba(24,95,165,0.08)' },
    recuperados: { border: '#1D9E75', bg: 'rgba(29,158,117,0.08)' }
  };
  const c = colors[type] || colors.ventas;
  return [{
    data: CHART_DATA[currentPeriod][type],
    borderColor: c.border,
    backgroundColor: c.bg,
    fill: true,
    tension: 0.4,
    borderWidth: 2.5,
    pointBackgroundColor: c.border,
    pointRadius: 4,
    pointHoverRadius: 6
  }];
}

function updateChartData(type) {
  if (!salesChart) { initSalesChart(type); return; }
  salesChart.data.labels   = CHART_DATA[currentPeriod].labels;
  salesChart.data.datasets = buildDatasets(type);
  // Actualizar callback del eje Y según el tipo actual
  salesChart.options.scales.y.ticks.callback = v =>
    type === 'pedidos' ? v : '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v);
  salesChart.options.plugins.tooltip.callbacks.label = c => {
    const val = c.parsed.y;
    return (type === 'ventas' || type === 'recuperados') ? formatCurrency(val) : val + ' pedidos';
  };
  salesChart.update('active');
}

function populateInitialFeed() {
  const items = [
    { type: 'Venta',      cls: 'badge-venta',   msg: 'María G. compró Producto A — $12.500',              ago: 'hace 2min' },
    { type: 'Carrito',    cls: 'badge-carrito',  msg: 'Recordatorio enviado a lucas@mail.com',              ago: 'hace 8min' },
    { type: 'Venta',      cls: 'badge-venta',   msg: 'Carlos R. compró Producto B — $8.200',               ago: 'hace 15min' },
    { type: 'Pixel',      cls: 'badge-pixel',   msg: 'Evento "AddToCart" registrado — Instagram',          ago: 'hace 21min' },
    { type: 'Recuperado', cls: 'badge-recup',   msg: 'Ana P. completó su compra tras recordatorio — $6.900', ago: 'hace 34min' }
  ];
  const list = document.getElementById('feed-list');
  if (!list) return;
  items.forEach(item => {
    list.appendChild(buildFeedItem(item.type, item.cls, item.msg, item.ago));
    feedCount++;
  });
  updateFeedCount();
}

function addFeedItem() {
  const list = document.getElementById('feed-list');
  if (!list) return;
  const group = FEED_EVENTS[Math.floor(Math.random() * FEED_EVENTS.length)];
  const msg   = group.msgs[Math.floor(Math.random() * group.msgs.length)];
  const item  = buildFeedItem(group.type, group.cls, msg, 'ahora');
  item.style.opacity = '0';
  list.insertBefore(item, list.firstChild);
  setTimeout(() => { item.style.transition = 'opacity 0.4s'; item.style.opacity = '1'; }, 20);
  if (list.children.length > 8) list.removeChild(list.lastChild);
  feedCount++;
  updateFeedCount();
}

function buildFeedItem(type, cls, msg, time) {
  const div = document.createElement('div');
  div.className = 'feed-item';
  div.innerHTML = `<span class="feed-badge ${cls}">${type}</span><span class="feed-msg">${msg}</span><span class="feed-time">${time}</span>`;
  return div;
}

function updateFeedCount() {
  const el = document.getElementById('feed-count');
  if (el) el.textContent = feedCount + ' eventos';
}
