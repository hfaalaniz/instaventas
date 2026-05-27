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

async function initDashboard() {
  const todayEl = document.getElementById('today-date');
  if (todayEl) todayEl.textContent = getTodayFormatted();

  updateDashboardKPIs();
  initSalesChart('ventas');
  await populateInitialFeed();

  if (kpiInterval)  clearInterval(kpiInterval);
  if (feedInterval) clearInterval(feedInterval);
  kpiInterval  = setInterval(updateDashboardKPIs, 30000);
  feedInterval = setInterval(addFeedItem, 15000);
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

async function updateDashboardKPIs(animate = false) {
  const setKPI = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  if (getStoreId()) {
    try {
      const [orderStats, carts, convs] = await Promise.all([
        dbGetOrderStats(),
        dbGetCarts(),
        dbGetConversations(null, 100)
      ]);

      const totalSales    = orderStats.totalSales   || 0;
      const totalOrders   = orderStats.totalOrders  || 0;
      const recovered     = (carts || []).filter(c => c.status === 'recovered').reduce((s, c) => s + c.amount, 0);
      const pending       = (carts || []).filter(c => c.status === 'pending').length;
      const total         = (carts || []).length;
      const abandonRate   = total ? Math.round(pending / total * 100) : 0;
      const botChats      = (convs || []).length;
      const botConverted  = (convs || []).filter(c => c.converted).length;

      setKPI('kpi-ventas',       formatCurrency(totalSales));
      setKPI('kpi-pedidos',      totalOrders);
      setKPI('kpi-recuperados',  formatCurrency(recovered));
      setKPI('kpi-abandon',      abandonRate + '%');
      setKPI('kpi-bot-chats',    botChats);
      setKPI('kpi-pixel-events', formatNumber(botConverted));

      setKPI('kpi-ventas-delta',  totalOrders ? '▲ ' + totalOrders + ' órdenes hoy' : '— sin ventas hoy');
      setKPI('kpi-pedidos-delta', '— actualizado ahora');
      setKPI('kpi-recup-delta',   recovered > 0 ? '▲ ' + formatCurrency(recovered) + ' recuperados' : '— sin recuperaciones');
      setKPI('kpi-bot-delta',     botChats ? botConverted + ' convertidos de ' + botChats : '— sin actividad');

      APP_STATE.dashboard.totalSales    = totalSales;
      APP_STATE.dashboard.totalOrders   = totalOrders;
      APP_STATE.dashboard.totalRecovered= recovered;
      APP_STATE.dashboard.abandonRate   = abandonRate;
      return;
    } catch (e) { console.warn('updateDashboardKPIs:', e); }
  }

  // Fallback a datos del estado local
  const s = APP_STATE.dashboard;
  setKPI('kpi-ventas',       formatCurrency(s.totalSales || 0));
  setKPI('kpi-pedidos',      s.totalOrders || 0);
  setKPI('kpi-recuperados',  formatCurrency(s.totalRecovered || 0));
  setKPI('kpi-abandon',      (s.abandonRate || 0) + '%');
  setKPI('kpi-bot-chats',    '—');
  setKPI('kpi-pixel-events', '—');
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

async function populateInitialFeed() {
  const list = document.getElementById('feed-list');
  if (!list) return;

  if (getStoreId()) {
    try {
      const events = await dbGetEvents(8);
      if (events.length) {
        const clsMap = { bot: 'badge-bot', pixel: 'badge-pixel', venta: 'badge-venta', carrito: 'badge-carrito', recuperado: 'badge-recup' };
        events.forEach(ev => {
          const ago = timeAgo ? timeAgo(ev.created_at) : 'antes';
          list.appendChild(buildFeedItem(capitalize(ev.type), clsMap[ev.type] || 'badge-bot', ev.message, ago));
          feedCount++;
        });
        updateFeedCount();
        return;
      }
    } catch (e) { console.warn('populateInitialFeed:', e); }
  }

  // Fallback mock
  const items = [
    { type: 'Venta',      cls: 'badge-venta',   msg: 'María G. compró Producto A — $12.500',               ago: 'hace 2min' },
    { type: 'Carrito',    cls: 'badge-carrito',  msg: 'Recordatorio enviado a lucas@mail.com',               ago: 'hace 8min' },
    { type: 'Venta',      cls: 'badge-venta',   msg: 'Carlos R. compró Producto B — $8.200',                ago: 'hace 15min' },
    { type: 'Pixel',      cls: 'badge-pixel',   msg: 'Evento "AddToCart" registrado — Instagram',           ago: 'hace 21min' },
    { type: 'Recuperado', cls: 'badge-recup',   msg: 'Ana P. completó su compra tras recordatorio — $6.900', ago: 'hace 34min' }
  ];
  items.forEach(item => {
    list.appendChild(buildFeedItem(item.type, item.cls, item.msg, item.ago));
    feedCount++;
  });
  updateFeedCount();
}

async function addFeedItem() {
  const list = document.getElementById('feed-list');
  if (!list) return;

  if (getStoreId()) {
    try {
      const events = await dbGetEvents(1);
      if (events.length) {
        const ev = events[0];
        const clsMap = { bot: 'badge-bot', pixel: 'badge-pixel', venta: 'badge-venta', carrito: 'badge-carrito', recuperado: 'badge-recup' };
        pushFeedItem(capitalize(ev.type), clsMap[ev.type] || 'badge-bot', ev.message);
        return;
      }
    } catch {}
  }

  // Fallback mock solo si no hay BD
  const group = FEED_EVENTS[Math.floor(Math.random() * FEED_EVENTS.length)];
  const msg   = group.msgs[Math.floor(Math.random() * group.msgs.length)];
  pushFeedItem(group.type, group.cls, msg);
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
