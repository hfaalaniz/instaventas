// ============================================================
// Edge Function: carrito-cron
// Detecta carritos abandonados y dispara la secuencia de emails
//
// Deploy: supabase functions deploy carrito-cron
// Activar cron en SQL Editor:
//   select cron.schedule(
//     'carrito-cron-hourly',
//     '0 * * * *',
//     $$ select net.http_post(
//       url := 'https://TU_PROYECTO.supabase.co/functions/v1/carrito-cron',
//       headers := '{"Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb
//     ) $$
//   );
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FUNCTIONS_URL = Deno.env.get('SUPABASE_URL')!.replace('.supabase.co', '.supabase.co/functions/v1');

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

Deno.serve(async (_req: Request) => {
  console.log('carrito-cron: ejecutando', new Date().toISOString());

  // Obtener todos los carritos pendientes con más de 1 hora
  const oneHourAgo    = new Date(Date.now() - 1  * 60 * 60 * 1000).toISOString();
  const twentyFourH   = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const fortyEightH   = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString();

  const { data: carts, error } = await sb
    .from('carts')
    .select('*, stores!inner(id), config!inner(carrito, email)')
    .eq('status', 'pending')
    .lt('created_at', oneHourAgo);

  if (error) {
    console.error('Error obteniendo carritos:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let processed = 0;
  let skipped   = 0;

  for (const cart of carts || []) {
    const config     = (cart as any).config;
    const carritoConf = config?.carrito || {};
    const emailConf  = config?.email    || {};
    const storeId    = cart.store_id;
    const cartAge    = cart.created_at;

    // Respetar horario comercial si está configurado
    if (carritoConf.settings?.respectHours) {
      const hour = new Date().getHours();
      if (hour < 8 || hour >= 23) { skipped++; continue; }
    }

    // No procesar carritos muy viejos
    if (cartAge < sevenDaysAgo) {
      await sb.from('carts').update({ status: 'expired' }).eq('id', cart.id);
      continue;
    }

    // Monto mínimo
    const minAmount = carritoConf.settings?.minAmount || 0;
    if (parseFloat(cart.amount) < minAmount) { skipped++; continue; }

    // Determinar qué recordatorio enviar
    const reminderToSend = getReminderToSend(cart.reminder_num, cartAge, oneHourAgo, twentyFourH, fortyEightH, carritoConf);
    if (!reminderToSend) { skipped++; continue; }

    // No enviar si el reminder está desactivado
    const reminderActive = carritoConf.reminders?.[reminderToSend - 1]?.active;
    if (reminderActive === false) { skipped++; continue; }

    // Generar cupón si aplica
    let couponCode = '';
    if (reminderToSend >= 2 && carritoConf.discount?.active) {
      const prefix = carritoConf.discount?.prefix || 'VUELVE';
      couponCode   = generateCoupon(prefix);
    }

    // Construir link de recuperación
    const recoveryLink = `${Deno.env.get('APP_URL') || 'https://tu-tienda.com'}/carrito/${cart.id}`;

    // Enviar email
    if (cart.customer_email && emailConf) {
      await sendRecoveryEmail({
        storeId,
        to:       cart.customer_email,
        nombre:   cart.customer_name || 'Cliente',
        producto: cart.product_name  || 'tu producto',
        amount:   cart.amount,
        link:     recoveryLink,
        coupon:   couponCode,
        discount: carritoConf.discount?.pct || 10,
        reminder: reminderToSend
      });
    }

    // Actualizar reminder_num y cupón
    await sb.from('carts')
      .update({
        reminder_num: reminderToSend,
        coupon_code:  couponCode
      })
      .eq('id', cart.id);

    // Registrar evento
    await sb.from('events').insert({
      store_id: storeId,
      type:     'carrito',
      message:  `Recordatorio #${reminderToSend} enviado a ${cart.customer_email || cart.customer_name}`,
      metadata: { cart_id: cart.id, reminder: reminderToSend }
    });

    processed++;
  }

  const summary = { processed, skipped, total: (carts || []).length };
  console.log('carrito-cron resultado:', summary);
  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});

// ── Helpers ───────────────────────────────────────────────────

function getReminderToSend(
  currentReminder: number,
  cartAge: string,
  oneHourAgo: string,
  twentyFourH: string,
  fortyEightH: string,
  config: any
): number | null {
  if (currentReminder === 0 && cartAge < oneHourAgo)  return 1;
  if (currentReminder === 1 && cartAge < twentyFourH) return 2;
  if (currentReminder === 2 && cartAge < fortyEightH) return 3;
  return null;
}

function generateCoupon(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code    = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${code}`;
}

async function sendRecoveryEmail(params: {
  storeId: string; to: string; nombre: string; producto: string;
  amount: number; link: string; coupon: string; discount: number; reminder: number;
}) {
  const templateMap: Record<number, string> = { 1: 'carrito_1', 2: 'carrito_2', 3: 'carrito_3' };
  const subjectMap:  Record<number, string> = {
    1: `¡Olvidaste algo en tu carrito! 🛒`,
    2: `${params.discount}% OFF para que completes tu compra 🎁`,
    3: `⏰ Último aviso — tu descuento vence hoy`
  };

  await fetch(`${FUNCTIONS_URL}/send-email`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify({
      store_id: params.storeId,
      to:       params.to,
      subject:  subjectMap[params.reminder],
      template: templateMap[params.reminder],
      variables: {
        nombre:    params.nombre,
        producto:  params.producto,
        link:      params.link,
        descuento: String(params.discount),
        codigo:    params.coupon
      }
    })
  });
}
