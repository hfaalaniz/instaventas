/* ============================================================
   DB — Capa de acceso a datos sobre Supabase
   Todas las funciones reciben/retornan objetos planos,
   igual que el APP_STATE actual.
   ============================================================ */

// ── Config de tienda ──────────────────────────────────────────

async function dbGetStore() {
  const { data, error } = await sb.from('stores').select('*').eq('id', getStoreId()).single();
  if (error) { console.error('dbGetStore:', error); return null; }
  return data;
}

async function dbSaveStore(fields) {
  const { error } = await sb.from('stores').update(fields).eq('id', getStoreId());
  if (error) throw error;
}

// ── Config modular (pagos, bot, pixel, etc.) ──────────────────

async function dbGetConfig() {
  const { data, error } = await sb.from('config').select('*').eq('store_id', getStoreId()).single();
  if (error) { console.error('dbGetConfig:', error); return null; }
  return data;
}

async function dbSaveConfig(section, value) {
  // section: 'pagos' | 'carrito' | 'bot' | 'pixel' | 'email' | 'notifs'
  const { error } = await sb.from('config')
    .update({ [section]: value, updated_at: new Date().toISOString() })
    .eq('store_id', getStoreId());
  if (error) throw error;
}

async function dbSaveAllConfig(configObj) {
  const { error } = await sb.from('config')
    .update({ ...configObj, updated_at: new Date().toISOString() })
    .eq('store_id', getStoreId());
  if (error) throw error;
}

// ── Productos ─────────────────────────────────────────────────

async function dbGetProducts() {
  const { data, error } = await sb.from('products')
    .select('*')
    .eq('store_id', getStoreId())
    .order('created_at', { ascending: false });
  if (error) { console.error('dbGetProducts:', error); return []; }
  return data.map(dbProductToApp);
}

async function dbSaveProduct(product) {
  const row = appProductToDb(product);
  if (product.id && !product.id.startsWith('P00')) {
    // Update
    const { error } = await sb.from('products').update(row).eq('id', product.id);
    if (error) throw error;
    return product.id;
  } else {
    // Insert
    const { data, error } = await sb.from('products').insert({ ...row, store_id: getStoreId() }).select('id').single();
    if (error) throw error;
    return data.id;
  }
}

async function dbDeleteProduct(id) {
  const { error } = await sb.from('products').delete().eq('id', id);
  if (error) throw error;
}

function dbProductToApp(row) {
  return {
    id:       row.id,
    name:     row.name,
    category: row.category || '',
    price:    parseFloat(row.price) || 0,
    priceOld: parseFloat(row.price_old) || 0,
    stock:    row.stock || 0,
    sku:      row.sku || '',
    desc:     row.description || '',
    img:      row.image_url || '',
    link:     row.link || '',
    active:   row.active !== false
  };
}

function appProductToDb(p) {
  return {
    name:        p.name,
    category:    p.category || '',
    price:       p.price || 0,
    price_old:   p.priceOld || 0,
    stock:       p.stock || 0,
    sku:         p.sku || '',
    description: p.desc || '',
    image_url:   p.img || '',
    link:        p.link || '',
    active:      p.active !== false
  };
}

// ── Suscriptores ──────────────────────────────────────────────

async function dbGetSubscribers() {
  const { data, error } = await sb.from('subscribers')
    .select('id, email, name, source, created_at')
    .eq('store_id', getStoreId())
    .eq('active', true)
    .order('created_at', { ascending: false });
  if (error) { console.error('dbGetSubscribers:', error); return []; }
  return data.map(s => ({
    id:    s.id,
    email: s.email,
    name:  s.name || '',
    date:  new Date(s.created_at).toLocaleDateString('es-AR')
  }));
}

async function dbAddSubscriber(email, name = '', source = 'manual') {
  const { error } = await sb.from('subscribers').insert({
    store_id: getStoreId(), email, name, source
  });
  if (error) {
    if (error.code === '23505') throw new Error('Este email ya está suscripto');
    throw error;
  }
}

async function dbRemoveSubscriber(id) {
  const { error } = await sb.from('subscribers').update({ active: false }).eq('id', id);
  if (error) throw error;
}

// ── Campañas ──────────────────────────────────────────────────

async function dbGetCampaigns() {
  const { data, error } = await sb.from('email_campaigns')
    .select('*')
    .eq('store_id', getStoreId())
    .order('sent_at', { ascending: false })
    .limit(20);
  if (error) { console.error('dbGetCampaigns:', error); return []; }
  return data.map(c => ({
    id:      c.id,
    subject: c.subject,
    segment: c.segment,
    sent:    c.sent_count,
    opened:  c.opened,
    clicked: c.clicked,
    date:    new Date(c.sent_at).toLocaleDateString('es-AR')
  }));
}

async function dbSaveCampaign(campaign) {
  const { error } = await sb.from('email_campaigns').insert({
    store_id:   getStoreId(),
    subject:    campaign.subject,
    body:       campaign.body || '',
    segment:    campaign.segment || 'all',
    sent_count: campaign.sent || 0,
    opened:     campaign.opened || 0,
    clicked:    campaign.clicked || 0,
    status:     'sent'
  });
  if (error) throw error;
}

// ── Carritos ──────────────────────────────────────────────────

async function dbGetCarts(status = null) {
  let q = sb.from('carts').select('*').eq('store_id', getStoreId());
  if (status) q = q.eq('status', status);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) { console.error('dbGetCarts:', error); return []; }
  return data.map(c => ({
    id:       c.id,
    name:     c.customer_name,
    email:    c.customer_email,
    product:  c.product_name,
    amount:   parseFloat(c.amount),
    status:   c.status,
    reminder: c.reminder_num,
    ago:      timeAgo(c.created_at),
    source:   c.source || 'web'
  }));
}

async function dbSaveCart(cart) {
  const row = {
    store_id:       getStoreId(),
    customer_name:  cart.name || '',
    customer_email: cart.email || '',
    customer_phone: cart.phone || '',
    product_name:   cart.product || '',
    amount:         cart.amount || 0,
    status:         cart.status || 'pending',
    reminder_num:   cart.reminder || 0,
    source:         cart.source || 'manual'
  };
  if (cart.id && cart.id.length > 10) {
    const { error } = await sb.from('carts').update(row).eq('id', cart.id);
    if (error) throw error;
  } else {
    const { data, error } = await sb.from('carts').insert(row).select('id').single();
    if (error) throw error;
    return data.id;
  }
}

async function dbUpdateCartStatus(id, status, couponCode = '') {
  const { error } = await sb.from('carts')
    .update({ status, coupon_code: couponCode })
    .eq('id', id);
  if (error) throw error;
}

// ── Órdenes ───────────────────────────────────────────────────

async function dbGetOrders(limit = 20) {
  const { data, error } = await sb.from('orders')
    .select('*')
    .eq('store_id', getStoreId())
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('dbGetOrders:', error); return []; }
  return data;
}

async function dbGetOrderStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await sb.from('orders')
    .select('amount, status, created_at')
    .eq('store_id', getStoreId())
    .eq('status', 'approved')
    .gte('created_at', today.toISOString());

  if (error) return { totalSales: 0, totalOrders: 0 };
  const totalSales  = data.reduce((s, o) => s + parseFloat(o.amount), 0);
  const totalOrders = data.length;
  return { totalSales, totalOrders };
}

// ── Conversaciones del bot ────────────────────────────────────

async function dbGetConversations(channel = null, limit = 30) {
  let q = sb.from('bot_conversations')
    .select('*')
    .eq('store_id', getStoreId());
  if (channel) q = q.eq('channel', channel);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);
  if (error) { console.error('dbGetConversations:', error); return []; }
  return data.map(c => ({
    id:        c.id,
    channel:   c.channel,
    user:      c.user_handle,
    msg:       c.message,
    response:  c.response,
    converted: c.converted,
    time:      new Date(c.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    date:      new Date(c.created_at).toLocaleDateString('es-AR')
  }));
}

async function dbSaveConversation(conv) {
  const { error } = await sb.from('bot_conversations').insert({
    store_id:    getStoreId(),
    channel:     conv.channel,
    external_id: conv.externalId || '',
    user_handle: conv.user || '',
    message:     conv.msg || '',
    response:    conv.response || '',
    converted:   conv.converted || false
  });
  if (error) console.error('dbSaveConversation:', error);
}

// ── Eventos del feed ──────────────────────────────────────────

async function dbGetEvents(limit = 20) {
  const { data, error } = await sb.from('events')
    .select('*')
    .eq('store_id', getStoreId())
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('dbGetEvents:', error); return []; }
  return data;
}

async function dbInsertEvent(type, message, metadata = {}) {
  const { error } = await sb.from('events').insert({
    store_id: getStoreId(),
    type, message, metadata
  });
  if (error) console.error('dbInsertEvent:', error);
}

// ── Eventos Pixel ─────────────────────────────────────────────

async function dbGetPixelStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await sb.from('pixel_events')
    .select('event_name, value')
    .eq('store_id', getStoreId())
    .gte('created_at', today.toISOString());

  if (error) return {};
  const stats = {};
  data.forEach(e => {
    stats[e.event_name] = (stats[e.event_name] || 0) + 1;
  });
  return stats;
}
