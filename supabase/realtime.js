/* ============================================================
   REALTIME — Suscripciones en tiempo real de Supabase
   Alimenta el activity feed y los KPIs del dashboard
   ============================================================ */

let realtimeChannel = null;

function initRealtime() {
  const storeId = getStoreId();
  if (!storeId) return;

  // Desuscribir canal anterior si existe
  if (realtimeChannel) {
    sb.removeChannel(realtimeChannel);
  }

  realtimeChannel = sb.channel(`store-${storeId}`)

    // Nueva orden aprobada → actualizar KPIs y feed
    .on('postgres_changes', {
      event:  'INSERT',
      schema: 'public',
      table:  'orders',
      filter: `store_id=eq.${storeId}`
    }, payload => {
      const order = payload.new;
      if (order.status === 'approved') {
        const msg = `${order.customer_name || 'Cliente'} compró — ${formatCurrency(parseFloat(order.amount))}`;
        pushFeedItem('Venta', 'badge-venta', msg);
        refreshDashboardStats();
      }
    })

    // Nuevo carrito abandonado → feed + KPIs
    .on('postgres_changes', {
      event:  'INSERT',
      schema: 'public',
      table:  'carts',
      filter: `store_id=eq.${storeId}`
    }, payload => {
      const cart = payload.new;
      const msg  = `Carrito detectado — ${cart.customer_name || cart.customer_email} — ${formatCurrency(parseFloat(cart.amount))}`;
      pushFeedItem('Carrito', 'badge-carrito', msg);
    })

    // Carrito recuperado
    .on('postgres_changes', {
      event:  'UPDATE',
      schema: 'public',
      table:  'carts',
      filter: `store_id=eq.${storeId}`
    }, payload => {
      if (payload.new.status === 'recovered') {
        const cart = payload.new;
        const msg  = `${cart.customer_name || 'Cliente'} completó su compra — ${formatCurrency(parseFloat(cart.amount))}`;
        pushFeedItem('Recuperado', 'badge-recup', msg);
        refreshDashboardStats();
      }
    })

    // Nuevo evento (bot, pixel, etc.)
    .on('postgres_changes', {
      event:  'INSERT',
      schema: 'public',
      table:  'events',
      filter: `store_id=eq.${storeId}`
    }, payload => {
      const ev = payload.new;
      const clsMap = {
        bot:        'badge-bot',
        pixel:      'badge-pixel',
        venta:      'badge-venta',
        carrito:    'badge-carrito',
        recuperado: 'badge-recup'
      };
      pushFeedItem(
        capitalize(ev.type),
        clsMap[ev.type] || 'badge-bot',
        ev.message
      );
    })

    .subscribe(status => {
      console.log('Realtime status:', status);
    });
}

function stopRealtime() {
  if (realtimeChannel) {
    sb.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

// Inyectar un ítem en el feed del dashboard en tiempo real
function pushFeedItem(type, cls, msg) {
  const list = document.getElementById('feed-list');
  if (!list) return;

  const item = document.createElement('div');
  item.className = 'feed-item';
  item.style.opacity = '0';
  item.innerHTML = `
    <span class="feed-badge ${cls}">${type}</span>
    <span class="feed-msg">${msg}</span>
    <span class="feed-time">ahora</span>
  `;
  list.insertBefore(item, list.firstChild);
  setTimeout(() => { item.style.transition = 'opacity 0.4s'; item.style.opacity = '1'; }, 20);
  if (list.children.length > 8) list.removeChild(list.lastChild);

  feedCount++;
  const countEl = document.getElementById('feed-count');
  if (countEl) countEl.textContent = feedCount + ' eventos';
}

// Refrescar KPIs del dashboard con datos reales de la BD
async function refreshDashboardStats() {
  try {
    const stats = await dbGetOrderStats();
    const setKPI = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setKPI('kpi-ventas',   formatCurrency(stats.totalSales));
    setKPI('kpi-pedidos',  stats.totalOrders);

    // Evento de actualización para el estado del dashboard
    APP_STATE.dashboard.totalSales  = stats.totalSales;
    APP_STATE.dashboard.totalOrders = stats.totalOrders;
  } catch (e) {
    console.warn('refreshDashboardStats:', e);
  }
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
