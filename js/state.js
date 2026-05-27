/* ============================================================
   STATE — Estado global persistido en localStorage
   ============================================================ */

const STATE_KEY = 'instaventas_state';

const DEFAULT_STATE = {
  // Pagos
  pagos: {
    mp_access_token: '',
    mp_public_key: '',
    mp_country: 'AR',
    mp_webhook: '',
    mp_env: 'sandbox',
    checkout_mode: 'pro',
    methods: {
      card: true,
      transfer: true,
      cash: false,
      quota: true
    },
    quotas: ['3', '6', '12'],
    paypal: { client_id: '', env: 'sandbox', currency: 'USD' },
    stripe: { pub_key: '', secret_key: '', webhook_secret: '' },
    crypto: { btc: '', eth: '', usdt: '', nowpay_key: '' },
    transfer: { name: '', cuit: '', cbu: '', alias: '', cvu: '', bank: '' }
  },

  // Carrito
  carrito: {
    reminders: [
      { active: true, hours: 1, channels: ['email', 'instagram'] },
      { active: true, hours: 24, channels: ['email', 'instagram', 'whatsapp'] },
      { active: false, hours: 48, channels: ['whatsapp'] }
    ],
    discount: { active: true, pct: 10, hours: 24, prefix: 'VUELVE' },
    settings: {
      detectPixel: true,
      respectHours: true,
      stopOnPurchase: true,
      minAmount: 1000,
      maxDays: 7
    }
  },

  // Bot
  bot: {
    channels: { instagram: true, whatsapp: true, telegram: false },
    night_mode: true,
    night_start: '22:00',
    night_end: '08:00',
    followup: false,
    ai_mode: false,
    openai_key: '',
    ig_token: '',
    ig_account_id: '',
    ig_webhook_verify: '',
    wa_phone_id: '',
    wa_token: '',
    wa_number: '',
    store_name: '',
    ig_handle: '',
    catalog_link: '',
    msgs: {
      welcome:  '¡Hola {{nombre}}! 👋 Gracias por escribirnos a {{tienda}}.\nSomos tu tienda online favorita 🛍️\n\n¿En qué te podemos ayudar?\n1️⃣ Ver catálogo\n2️⃣ Precios y stock\n3️⃣ Formas de pago\n4️⃣ Estado de mi pedido',
      catalog:  '¡Claro! Te comparto nuestro catálogo completo 📦\n\n🛍️ Ver todo: {{link_catalogo}}\n📸 Instagram: {{ig_handle}}\n\n¿Querés info de algún producto en particular?',
      price:    'Los precios están actualizados en nuestro sitio 💰\n\n🔗 Ver precios: {{link_precios}}\n💳 Aceptamos: Tarjeta, transferencia y efectivo\n📦 Envíos a todo el país\n\n¿Te interesa algún producto específico?',
      payment:  'Aceptamos todos los métodos de pago 💳\n\n✅ Tarjeta (débito/crédito)\n✅ Transferencia CBU/CVU\n✅ Mercado Pago\n✅ Efectivo (Rapipago)\n📅 Cuotas sin interés disponibles\n\n¿Querés que te envíe el link de pago?',
      followup: '¡Hola {{nombre}}! 😊\nYa deberías tener tu pedido {{producto}}.\n\n¿Llegó todo bien? Nos encantaría saber tu experiencia.\nDejanos tu reseña: {{link_resena}} ⭐\n\n¡Gracias por confiar en nosotros!'
    },
    keywords: [
      { trigger: 'precio', response: 'Los precios los encontrás en nuestro catálogo 👉 {{link_precios}}' },
      { trigger: 'envío', response: 'Hacemos envíos a todo el país 📦 El costo se calcula al finalizar la compra.' },
      { trigger: 'stock', response: 'Para consultar stock de un producto específico, escribinos el nombre 🛍️' },
      { trigger: 'pago', response: 'Aceptamos tarjeta, transferencia y efectivo. ¿Querés el link de pago? 💳' }
    ]
  },

  // Pixel
  pixel: {
    fb_pixel_id: '',
    fb_capi_token: '',
    ig_dataset_id: '',
    fb_events: { pageview: true, viewcontent: true, addtocart: true, initcheckout: true, purchase: true, lead: false, contact: false, schedule: false },
    ig_features: { stories: true, shopping: true, capi: false, lookalike: false },
    fb_active: false,
    ig_active: false
  },

  // Dashboard
  dashboard: {
    totalSales: 156800,
    totalOrders: 15,
    totalRecovered: 22000,
    abandonRate: 27
  },

  // Auditoría
  audit: {
    biz_name: '',
    category: '',
    ig_handle: '',
    revenue: 'mid',
    problem: '',
    tools: []
  },

  // Configuración general de la tienda
  config: {
    store_name: '',
    store_category: '',
    store_url: '',
    store_ig: '',
    store_email: '',
    store_whatsapp: '',
    store_country: 'AR',
    timezone: 'America/Argentina/Buenos_Aires',
    dark_mode: false,
    notifications: {
      venta: true,
      carrito: true,
      bot: false,
      reporte: true,
      stock: true,
      email: ''
    }
  },

  // Email Marketing
  email: {
    provider: 'smtp',
    smtp: { host: '', port: 587, user: '', pass: '', from: '', from_name: '' },
    sendgrid: { key: '', from: '' },
    mailchimp: { key: '', list_id: '' },
    brevo: { key: '', from: '' },
    subscribers: [],
    flows: {
      welcome:     { active: true,  msg: '¡Bienvenido/a a {{tienda}}! 🎉\nGracias por sumarte a nuestra comunidad.\n\nTe prometemos solo contenido de valor: ofertas exclusivas, lanzamientos y novedades.\n\n👉 Visitá nuestra tienda: {{link_tienda}}' },
      carrito:     { active: true,  msg: 'Hola {{nombre}}, olvidaste algo 🛒\n\nTu {{producto}} sigue en tu carrito esperándote.\nCompletá tu compra antes de que se agote el stock.\n\n🔗 {{link_carrito}}' },
      postcompra:  { active: false, msg: '¡Hola {{nombre}}! ¿Cómo llegó tu pedido? 📦\n\nTu opinión es muy importante para nosotros.\nDejanos tu reseña de {{producto}} y ayudá a otros a elegir.\n\n⭐ {{link_resena}}' },
      reactivacion:{ active: false, msg: '¡Te extrañamos, {{nombre}}! 💙\n\nHace un tiempo que no nos visitás. Tenemos novedades increíbles y un descuento especial solo para vos.\n\n🎁 Usá el código VOLVÉ10 y obtené 10% OFF\n👉 {{link_tienda}}' }
    },
    campaigns: []
  },

  // Catálogo de productos
  catalogo: {
    products: []
  },

  // Historial de conversaciones del bot
  bot_history: [],

  // Dashboard — período seleccionado
  dashboard_period: 'hoy',

  // Onboarding completado
  onboarding_done: false
};

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return deepClone(DEFAULT_STATE);
    return deepMerge(deepClone(DEFAULT_STATE), JSON.parse(raw));
  } catch {
    return deepClone(DEFAULT_STATE);
  }
}

function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(APP_STATE));
  } catch (e) {
    console.warn('No se pudo guardar el estado:', e);
  }
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Estado global
const APP_STATE = loadState();
