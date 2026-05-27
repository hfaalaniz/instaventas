// ============================================================
// Edge Function: mp-webhook
// Recibe notificaciones de Mercado Pago (pagos, preferencias)
//
// Deploy: supabase functions deploy mp-webhook
// URL: https://TU_PROYECTO.supabase.co/functions/v1/mp-webhook
// Configurar en: MP Developers → Notificaciones → Webhooks
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP_API       = 'https://api.mercadopago.com/v1';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: any;
  try { body = await req.json(); } catch { return new Response('Bad request', { status: 400 }); }

  const { type, data } = body;

  // Solo procesar notificaciones de pagos
  if (type !== 'payment' || !data?.id) {
    return new Response('ok', { status: 200 });
  }

  const paymentId = data.id;

  // Buscar la tienda por el webhook URL — MP envía el storeId en el query param
  const url      = new URL(req.url);
  const storeId  = url.searchParams.get('store_id');
  if (!storeId) return new Response('Missing store_id', { status: 400 });

  // Obtener token de MP de la tienda
  const { data: configRow } = await sb
    .from('config')
    .select('pagos')
    .eq('store_id', storeId)
    .single();

  const mpToken = configRow?.pagos?.mp_access_token;
  if (!mpToken) return new Response('MP token not configured', { status: 400 });

  // Consultar el pago en la API de MP
  const mpRes  = await fetch(`${MP_API}/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${mpToken}` }
  });
  const payment = await mpRes.json();

  if (!mpRes.ok) {
    console.error('Error consultando pago MP:', payment);
    return new Response('MP API error', { status: 500 });
  }

  const status = mapMPStatus(payment.status);

  // Buscar si ya existe la orden
  const { data: existing } = await sb
    .from('orders')
    .select('id')
    .eq('external_id', String(paymentId))
    .eq('store_id', storeId)
    .single();

  if (existing) {
    // Actualizar estado
    await sb.from('orders')
      .update({ status, raw_payload: payment })
      .eq('id', existing.id);
  } else {
    // Crear nueva orden
    await sb.from('orders').insert({
      store_id:       storeId,
      external_id:    String(paymentId),
      gateway:        'mp',
      customer_name:  payment.payer?.first_name
                      ? `${payment.payer.first_name} ${payment.payer.last_name || ''}`.trim()
                      : payment.payer?.email || 'Cliente MP',
      customer_email: payment.payer?.email || '',
      amount:         payment.transaction_amount || 0,
      currency:       payment.currency_id || 'ARS',
      status,
      raw_payload:    payment,
      items:          payment.additional_info?.items || []
    });
  }

  // Si el pago fue aprobado: insertar evento + intentar marcar carrito como recuperado
  if (status === 'approved') {
    await sb.from('events').insert({
      store_id: storeId,
      type:     'venta',
      message:  `Pago aprobado por $${payment.transaction_amount} — ${payment.payer?.email || 'Cliente'}`,
      metadata: { payment_id: paymentId, amount: payment.transaction_amount }
    });

    // Intentar recuperar carrito pendiente del mismo email
    const email = payment.payer?.email;
    if (email) {
      await sb.from('carts')
        .update({ status: 'recovered' })
        .eq('store_id', storeId)
        .eq('customer_email', email)
        .eq('status', 'pending');
    }
  }

  return new Response('ok', { status: 200 });
});

function mapMPStatus(mpStatus: string): string {
  const map: Record<string, string> = {
    'approved':        'approved',
    'pending':         'pending',
    'in_process':      'pending',
    'rejected':        'rejected',
    'cancelled':       'rejected',
    'refunded':        'refunded',
    'charged_back':    'refunded',
    'authorized':      'pending'
  };
  return map[mpStatus] || 'pending';
}
