// ============================================================
// Edge Function: send-email
// Envía emails via SMTP (Resend/SendGrid/Brevo)
// Llamada desde: carrito-cron, frontend, otros webhooks
//
// Deploy: supabase functions deploy send-email
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Resend es el proveedor más simple para empezar (resend.com — gratis hasta 3000/mes)
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

interface EmailPayload {
  store_id:   string;
  to:         string;
  subject:    string;
  html?:      string;
  text?:      string;
  template?:  string;  // 'carrito_1' | 'carrito_2' | 'carrito_3' | 'welcome' | 'campaign'
  variables?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let payload: EmailPayload;
  try { payload = await req.json(); } catch { return new Response('Bad request', { status: 400 }); }

  const { store_id, to, subject, html, text, template, variables } = payload;
  if (!store_id || !to || !subject) {
    return new Response('Missing required fields: store_id, to, subject', { status: 400 });
  }

  // Obtener config del email de la tienda
  const { data: configRow } = await sb
    .from('config')
    .select('email')
    .eq('store_id', store_id)
    .single();

  const emailConfig = configRow?.email || {};
  const provider    = emailConfig.provider || 'resend';
  const fromEmail   = emailConfig.smtp?.from || emailConfig.sendgrid?.from || emailConfig.brevo?.from || 'onboarding@resend.dev';
  const fromName    = emailConfig.smtp?.from_name || 'InstaVentas';

  // Construir body HTML
  let emailHtml = html;
  if (!emailHtml && template) {
    emailHtml = buildTemplateHtml(template, variables || {}, fromName);
  }
  if (!emailHtml && text) {
    emailHtml = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">${text.replace(/\n/g,'<br>')}</div>`;
  }

  // Enviar según proveedor
  let result: { ok: boolean; error?: string };
  if (provider === 'sendgrid' && emailConfig.sendgrid?.key) {
    result = await sendWithSendGrid(emailConfig.sendgrid.key, to, fromEmail, fromName, subject, emailHtml || '');
  } else if (provider === 'brevo' && emailConfig.brevo?.key) {
    result = await sendWithBrevo(emailConfig.brevo.key, to, fromEmail, fromName, subject, emailHtml || '');
  } else if (RESEND_API_KEY) {
    result = await sendWithResend(RESEND_API_KEY, to, fromEmail, fromName, subject, emailHtml || '');
  } else {
    // Fallback: loguear en lugar de enviar (útil en desarrollo)
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    result = { ok: true };
  }

  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), { status: 500 });
  }

  // Registrar evento
  await sb.from('events').insert({
    store_id,
    type:    'bot',
    message: `Email enviado a ${to}: "${subject}"`
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});

// ── Proveedores de email ──────────────────────────────────────

async function sendWithResend(apiKey: string, to: string, from: string, fromName: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${fromName} <${from}>`, to, subject, html })
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true };
}

async function sendWithSendGrid(apiKey: string, to: string, from: string, fromName: string, subject: string, html: string) {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name: fromName },
      subject,
      content: [{ type: 'text/html', value: html }]
    })
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true };
}

async function sendWithBrevo(apiKey: string, to: string, from: string, fromName: string, subject: string, html: string) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { email: from, name: fromName },
      to:     [{ email: to }],
      subject,
      htmlContent: html
    })
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true };
}

// ── Templates de email ────────────────────────────────────────

function buildTemplateHtml(template: string, vars: Record<string, string>, storeName: string): string {
  const base = (content: string) => `
    <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,sans-serif">
      <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08)">
        <div style="background:#e94560;padding:20px 24px">
          <div style="color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.5px">${storeName}</div>
        </div>
        <div style="padding:28px 24px;font-size:14px;color:#333;line-height:1.6">${content}</div>
        <div style="padding:16px 24px;background:#f4f5f7;font-size:11px;color:#999;text-align:center">
          © ${new Date().getFullYear()} ${storeName} · <a href="#" style="color:#999">Desuscribirse</a>
        </div>
      </div>
    </body></html>
  `;

  const nombre   = vars.nombre   || 'Cliente';
  const producto = vars.producto || 'tu producto';
  const link     = vars.link     || '#';
  const descuento = vars.descuento || '10';
  const codigo   = vars.codigo   || 'VUELVE10';

  switch (template) {
    case 'carrito_1':
      return base(`
        <h2 style="margin-top:0;color:#1a1d23">Hola ${nombre}, olvidaste algo 🛒</h2>
        <p>Notamos que dejaste <strong>${producto}</strong> en tu carrito.</p>
        <p>¡Todavía está disponible para vos!</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${link}" style="background:#e94560;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
            Completar mi compra →
          </a>
        </div>
        <p style="color:#888;font-size:12px">Si ya compraste, ignorá este mensaje.</p>
      `);

    case 'carrito_2':
      return base(`
        <h2 style="margin-top:0;color:#1a1d23">¡${nombre}, tenemos algo especial para vos! 🎁</h2>
        <p>Tu carrito con <strong>${producto}</strong> sigue esperándote.</p>
        <p>Como queremos que lo tengas, te regalamos un <strong>${descuento}% de descuento</strong>:</p>
        <div style="background:#f4f5f7;border-radius:8px;padding:16px;text-align:center;margin:20px 0">
          <div style="font-size:24px;font-weight:900;letter-spacing:2px;color:#e94560">${codigo}</div>
          <div style="font-size:12px;color:#888;margin-top:4px">Válido por 24 horas</div>
        </div>
        <div style="text-align:center;margin:20px 0">
          <a href="${link}" style="background:#e94560;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
            Usar mi descuento →
          </a>
        </div>
      `);

    case 'carrito_3':
      return base(`
        <h2 style="margin-top:0;color:#1a1d23">⏰ Último llamado, ${nombre}</h2>
        <p>Tu cupón <strong>${codigo}</strong> con ${descuento}% OFF vence <strong>hoy</strong>.</p>
        <p><strong>${producto}</strong> sigue en tu carrito.</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${link}" style="background:#e94560;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
            Comprar antes que expire →
          </a>
        </div>
      `);

    case 'welcome':
      return base(`
        <h2 style="margin-top:0;color:#1a1d23">¡Bienvenido/a! 🎉</h2>
        <p>Hola ${nombre}, gracias por sumarte a <strong>${storeName}</strong>.</p>
        <p>Vas a recibir nuestras mejores ofertas, lanzamientos y novedades.</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${link}" style="background:#e94560;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
            Ver tienda →
          </a>
        </div>
      `);

    default:
      return base(`<p>${vars.body || ''}</p>`);
  }
}
