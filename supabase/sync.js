/* ============================================================
   SYNC — Sincronización bidireccional localStorage ↔ Supabase

   Estrategia:
   - Al arrancar: carga desde Supabase y fusiona con DEFAULT_STATE
   - Al guardar:  escribe en localStorage (sync inmediato) + Supabase (async)
   - Sin conexión: funciona solo con localStorage, sube al reconectar
   ============================================================ */

// Reemplaza saveState() del state.js original
async function saveStateWithSync(section = null) {
  // 1. Siempre guardar en localStorage primero (no bloquea)
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(APP_STATE));
  } catch (e) {
    console.warn('localStorage write error:', e);
  }

  // 2. Si no hay store_id (no logueado), terminar
  if (!getStoreId()) return;

  // 3. Sync a Supabase en background
  try {
    if (section) {
      // Sync solo la sección modificada
      await syncSectionToSupabase(section);
    } else {
      // Sync completo
      await syncAllToSupabase();
    }
  } catch (e) {
    console.warn('Supabase sync error (se reintentará):', e.message);
    markPendingSync();
  }
}

// Sobreescribir la función original saveState
function saveState(section = null) {
  saveStateWithSync(section); // fire-and-forget
}

// ── Cargar estado desde Supabase al iniciar ───────────────────

async function loadStateFromSupabase() {
  if (!getStoreId()) return false;

  try {
    // Cargar store info
    const store = await dbGetStore();
    if (store) {
      APP_STATE.config.store_name     = store.store_name  || '';
      APP_STATE.config.store_category = store.category    || '';
      APP_STATE.config.store_url      = store.url         || '';
      APP_STATE.config.store_ig       = store.ig_handle   || '';
      APP_STATE.config.store_email    = store.email       || '';
      APP_STATE.config.store_whatsapp = store.whatsapp    || '';
      APP_STATE.config.store_country  = store.country     || 'AR';
      APP_STATE.config.timezone       = store.timezone    || 'America/Argentina/Buenos_Aires';
      APP_STATE.config.dark_mode      = store.dark_mode   || false;
    }

    // Cargar config modular
    const config = await dbGetConfig();
    if (config) {
      if (config.pagos  && Object.keys(config.pagos).length)  APP_STATE.pagos  = deepMerge(deepClone(APP_STATE.pagos),  config.pagos);
      if (config.carrito && Object.keys(config.carrito).length) APP_STATE.carrito = deepMerge(deepClone(APP_STATE.carrito), config.carrito);
      if (config.bot    && Object.keys(config.bot).length)    APP_STATE.bot    = deepMerge(deepClone(APP_STATE.bot),    config.bot);
      if (config.pixel  && Object.keys(config.pixel).length)  APP_STATE.pixel  = deepMerge(deepClone(APP_STATE.pixel),  config.pixel);
      if (config.email  && Object.keys(config.email).length)  APP_STATE.email  = deepMerge(deepClone(APP_STATE.email),  config.email);
      if (config.notifs && Object.keys(config.notifs).length) APP_STATE.config.notifications = deepMerge(deepClone(APP_STATE.config.notifications), config.notifs);
    }

    // Cargar suscriptores
    const subscribers = await dbGetSubscribers();
    APP_STATE.email.subscribers = subscribers;

    // Cargar campañas recientes
    const campaigns = await dbGetCampaigns();
    APP_STATE.email.campaigns = campaigns;

    // Cargar productos
    const products = await dbGetProducts();
    APP_STATE.catalogo.products = products;

    // Cargar historial del bot
    const conversations = await dbGetConversations(null, 30);
    APP_STATE.bot_history = conversations;

    // Guardar en localStorage el estado actualizado
    localStorage.setItem(STATE_KEY, JSON.stringify(APP_STATE));

    console.log('✓ Estado cargado desde Supabase');
    return true;
  } catch (e) {
    console.warn('Error cargando desde Supabase, usando localStorage:', e.message);
    return false;
  }
}

// ── Sync secciones individuales ───────────────────────────────

async function syncSectionToSupabase(section) {
  switch (section) {
    case 'config':
      await dbSaveStore({
        store_name:  APP_STATE.config.store_name,
        category:    APP_STATE.config.store_category,
        url:         APP_STATE.config.store_url,
        ig_handle:   APP_STATE.config.store_ig,
        email:       APP_STATE.config.store_email,
        whatsapp:    APP_STATE.config.store_whatsapp,
        country:     APP_STATE.config.store_country,
        timezone:    APP_STATE.config.timezone,
        dark_mode:   APP_STATE.config.dark_mode
      });
      await dbSaveConfig('notifs', APP_STATE.config.notifications);
      break;
    case 'pagos':
      await dbSaveConfig('pagos', sanitizePagos(APP_STATE.pagos));
      break;
    case 'carrito':
      await dbSaveConfig('carrito', APP_STATE.carrito);
      break;
    case 'bot':
      await dbSaveConfig('bot', sanitizeBot(APP_STATE.bot));
      break;
    case 'pixel':
      await dbSaveConfig('pixel', APP_STATE.pixel);
      break;
    case 'email':
      await dbSaveConfig('email', sanitizeEmail(APP_STATE.email));
      break;
  }
}

async function syncAllToSupabase() {
  await Promise.all([
    syncSectionToSupabase('config'),
    syncSectionToSupabase('pagos'),
    syncSectionToSupabase('carrito'),
    syncSectionToSupabase('bot'),
    syncSectionToSupabase('pixel'),
    syncSectionToSupabase('email')
  ]);
}

// ── Sanitizar antes de subir (no guardar tokens en texto plano idealmente) ──

function sanitizePagos(pagos) {
  // Los tokens se guardan encriptados solo en Supabase Vault en producción.
  // Por ahora los guardamos en la columna JSONB de config (solo accesible por el dueño via RLS).
  return pagos;
}

function sanitizeBot(bot) {
  // Excluir openai_key del sync si no querés guardarlo en Supabase
  // const { openai_key, ...rest } = bot;
  // return rest;
  return bot;
}

function sanitizeEmail(email) {
  // Excluir passwords SMTP — solo guardar proveedor, from, etc.
  const { smtp, ...rest } = email;
  const safeSMTP = { host: smtp.host, port: smtp.port, user: smtp.user, from: smtp.from, from_name: smtp.from_name };
  // pass no se sincroniza a Supabase — queda solo en localStorage
  return { ...rest, smtp: safeSMTP };
}

// ── Retry de sync pendiente ───────────────────────────────────

const PENDING_SYNC_KEY = 'instaventas_pending_sync';

function markPendingSync() {
  localStorage.setItem(PENDING_SYNC_KEY, '1');
}

async function retryPendingSync() {
  if (!localStorage.getItem(PENDING_SYNC_KEY)) return;
  if (!getStoreId()) return;
  try {
    await syncAllToSupabase();
    localStorage.removeItem(PENDING_SYNC_KEY);
    console.log('✓ Sync pendiente completado');
  } catch (e) {
    console.warn('Retry sync fallido, se reintentará:', e.message);
  }
}

// Reintentar sync cuando el usuario vuelve a estar online
window.addEventListener('online', retryPendingSync);
