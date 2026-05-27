// ============================================================
// Edge Function: instagram-webhook
// Recibe DMs de Instagram via Meta Webhooks y responde con el bot
//
// Deploy: supabase functions deploy instagram-webhook
// URL pública: https://TU_PROYECTO.supabase.co/functions/v1/instagram-webhook
// Configurar en: Meta for Developers → Webhooks → messages
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VERIFY_TOKEN       = Deno.env.get('IG_WEBHOOK_VERIFY_TOKEN') || 'instaventas_verify';
const IG_API_VERSION     = 'v18.0';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // ── Verificación del webhook (GET) ────────────────────────
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // ── Recibir eventos de mensajes (POST) ───────────────────
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  // Procesar cada entrada del webhook
  for (const entry of body.entry || []) {
    const igAccountId = entry.id;

    // Buscar la tienda por instagram account id
    const { data: configs } = await sb
      .from('config')
      .select('store_id, bot')
      .not('bot', 'is', null);

    const storeConfig = configs?.find(
      (c: any) => c.bot?.ig_account_id === igAccountId
    );
    if (!storeConfig) continue;

    const storeId  = storeConfig.store_id;
    const botConfig = storeConfig.bot;

    for (const change of entry.messaging || entry.changes?.[0]?.value?.messages || []) {
      const senderId = change.sender?.id || change.from;
      const text     = change.message?.text || change.text?.body || '';
      if (!text || !senderId) continue;

      // Obtener respuesta del bot
      const response = await getBotResponse(text, botConfig, storeId, sb);

      // Enviar respuesta por Instagram Graph API
      if (botConfig.ig_token && botConfig.channels?.instagram) {
        await sendInstagramDM(senderId, response, botConfig.ig_token, igAccountId);
      }

      // Guardar conversación en la BD
      await sb.from('bot_conversations').insert({
        store_id:    storeId,
        channel:     'instagram',
        external_id: senderId,
        user_handle: senderId,
        message:     text,
        response:    response,
        converted:   false
      });

      // Insertar evento en el feed
      await sb.from('events').insert({
        store_id: storeId,
        type:     'bot',
        message:  `Bot respondió DM en Instagram — ${text.slice(0, 40)}...`
      });
    }
  }

  return new Response('ok', { status: 200 });
});

// ── Lógica del bot ────────────────────────────────────────────

async function getBotResponse(
  text: string,
  botConfig: any,
  storeId: string,
  sb: any
): Promise<string> {
  const lower = text.toLowerCase().trim();

  // 1. Buscar en keywords personalizadas
  for (const kw of botConfig.keywords || []) {
    if (kw.trigger && lower.includes(kw.trigger.toLowerCase())) {
      return fillTemplate(kw.response, botConfig);
    }
  }

  // 2. Obtener productos si la consulta parece de precio/catálogo
  if (/precio|costo|cuanto|cuánto|cuánto|sale|vale/.test(lower)) {
    const { data: products } = await sb
      .from('products')
      .select('name, price, stock')
      .eq('store_id', storeId)
      .eq('active', true)
      .limit(5);
    if (products?.length) {
      const list = products.map((p: any) => `• ${p.name}: $${p.price}`).join('\n');
      return `💰 Nuestros precios:\n${list}\n\n¿Querés info de alguno en particular?`;
    }
    return fillTemplate(botConfig.msgs?.price || '', botConfig);
  }

  // 3. Triggers built-in
  const triggers: Record<string, string> = {
    'catalogo|catálogo|productos': botConfig.msgs?.catalog || '',
    'pago|pagos|tarjeta|transferencia': botConfig.msgs?.payment || '',
    'envio|envío|entrega|flete': '📦 Hacemos envíos a todo el país. El costo depende de tu zona. ¿Me decís tu código postal?',
    'stock|disponible|hay': '🛍️ Para consultar stock de un producto específico, escribinos su nombre.',
    'hola|buenas|buenos|hey': botConfig.msgs?.welcome || '',
    '1': botConfig.msgs?.catalog || '',
    '2': botConfig.msgs?.price   || '',
    '3': botConfig.msgs?.payment || '',
    '4': '📦 Para el estado de tu pedido necesito tu número de orden. ¿Lo tenés?'
  };

  for (const [pattern, response] of Object.entries(triggers)) {
    if (new RegExp(pattern).test(lower)) {
      return fillTemplate(response, botConfig);
    }
  }

  // 4. Respuesta por defecto
  return fillTemplate(botConfig.msgs?.welcome || '¡Hola! 👋 ¿En qué te puedo ayudar?', botConfig);
}

function fillTemplate(template: string, bot: any): string {
  if (!template) return '¿En qué más puedo ayudarte? 😊';
  return template
    .replace(/\{\{nombre\}\}/g, 'Cliente')
    .replace(/\{\{tienda\}\}/g,       bot.store_name    || 'nuestra tienda')
    .replace(/\{\{link_catalogo\}\}/g, bot.catalog_link || 'https://tu-tienda.com/catalogo')
    .replace(/\{\{ig_handle\}\}/g,    bot.ig_handle     || '@tutienda')
    .replace(/\{\{link_precios\}\}/g,  bot.catalog_link || 'https://tu-tienda.com')
    .replace(/\{\{link_resena\}\}/g,  'https://tu-tienda.com/resenas')
    .replace(/\{\{producto\}\}/g,     'tu pedido');
}

async function sendInstagramDM(
  recipientId: string,
  message: string,
  token: string,
  accountId: string
): Promise<void> {
  await fetch(`https://graph.facebook.com/${IG_API_VERSION}/${accountId}/messages`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message:   { text: message }
    })
  });
}
