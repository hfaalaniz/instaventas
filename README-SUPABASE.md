# InstaVentas — Integración con Supabase

## Orden de setup (seguir exactamente)

---

## 1. Crear proyecto en Supabase

1. Ir a [app.supabase.com](https://app.supabase.com) → **New project**
2. Elegir nombre, contraseña fuerte, región más cercana (ej: South America)
3. Esperar que el proyecto se inicialice (~2 min)

---

## 2. Ejecutar el esquema SQL

1. En el panel de Supabase: **SQL Editor → New query**
2. Pegar el contenido de `supabase/migrations/001_initial_schema.sql`
3. Ejecutar (▶ Run)
4. Verificar que no haya errores — deben aparecer las tablas en **Table Editor**

---

## 3. Configurar credenciales en el frontend

En `supabase/client.js`, reemplazar las dos líneas:

```js
const SUPABASE_URL      = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY';
```

Los valores se encuentran en:
**Supabase → Settings → API → Project URL** y **anon public key**

---

## 4. Habilitar Auth providers

### Email/Password (obligatorio)
**Authentication → Providers → Email** → Enabled ✓

### Google OAuth (opcional)
1. **Authentication → Providers → Google** → Enable
2. Crear credenciales OAuth en [console.cloud.google.com](https://console.cloud.google.com)
3. Autorized redirect URI: `https://TU_PROYECTO.supabase.co/auth/v1/callback`
4. Pegar Client ID y Client Secret en Supabase

### URL de redirección
**Authentication → URL Configuration:**
- Site URL: `http://localhost` (desarrollo) o tu dominio de producción
- Redirect URLs: agregar `http://localhost/index.html`

---

## 5. Deploy de Edge Functions

Instalar Supabase CLI:
```bash
npm install -g supabase
supabase login
supabase link --project-ref TU_PROJECT_REF
```

El `project-ref` es la parte entre `https://` y `.supabase.co` de tu URL.

### Configurar variables de entorno secretas:
```bash
supabase secrets set IG_WEBHOOK_VERIFY_TOKEN=mi_token_secreto_123
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set APP_URL=https://tu-tienda.com
```

### Deployar todas las funciones:
```bash
supabase functions deploy instagram-webhook
supabase functions deploy mp-webhook
supabase functions deploy send-email
supabase functions deploy carrito-cron
```

---

## 6. Configurar webhook de Instagram

1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. **Tu App → Webhooks → Instagram**
3. Callback URL: `https://TU_PROYECTO.supabase.co/functions/v1/instagram-webhook`
4. Verify Token: el mismo que pusiste en `IG_WEBHOOK_VERIFY_TOKEN`
5. Suscribirse a: `messages`, `messaging_postbacks`

En la app, ir a **Auto-ventas → Credenciales Instagram Graph API** y completar:
- Page Access Token
- Instagram Account ID
- Webhook Verify Token

---

## 7. Configurar webhook de Mercado Pago

1. Ir a [mercadopago.com/developers/panel](https://mercadopago.com/developers/panel)
2. **Tu aplicación → Webhooks → Agregar**
3. URL: `https://TU_PROYECTO.supabase.co/functions/v1/mp-webhook?store_id=TU_STORE_ID`
4. Eventos: `payment`

El `store_id` se obtiene consultando tu tabla `stores` en Supabase Table Editor.

---

## 8. Activar el cron de carrito abandonado

En **Supabase → SQL Editor**, ejecutar:

```sql
-- Requiere habilitar pg_cron en Extensions primero
select cron.schedule(
  'carrito-cron-hourly',
  '0 * * * *',
  $$
    select net.http_post(
      url    := 'https://TU_PROYECTO.supabase.co/functions/v1/carrito-cron',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      )
    )
  $$
);
```

Para habilitar `pg_cron`: **Database → Extensions → pg_cron** → Enable

---

## 9. Configurar email (Resend — recomendado)

1. Crear cuenta gratis en [resend.com](https://resend.com) (3000 emails/mes gratis)
2. Obtener API Key
3. Ejecutar: `supabase secrets set RESEND_API_KEY=re_tu_api_key`
4. En la app: **Email Marketing → Proveedor → SMTP** (dejar en blanco, Resend se usa automáticamente en la Edge Function)

---

## 10. Abrir la app

Abrir `login.html` en el navegador (o servir con cualquier servidor estático):

```bash
# Opción simple con Python:
python -m http.server 8080
# Abrir http://localhost:8080/login.html
```

---

## Estructura de archivos Supabase

```
supabase/
├── migrations/
│   └── 001_initial_schema.sql    ← Ejecutar en SQL Editor
├── functions/
│   ├── instagram-webhook/
│   │   └── index.ts              ← Bot de Instagram
│   ├── mp-webhook/
│   │   └── index.ts              ← Pagos Mercado Pago
│   ├── send-email/
│   │   └── index.ts              ← Envío de emails
│   └── carrito-cron/
│       └── index.ts              ← Cron de abandono
├── client.js                     ← SDK + credenciales
├── auth.js                       ← Login/logout/guard
├── db.js                         ← CRUD sobre todas las tablas
├── realtime.js                   ← Feed en vivo
└── sync.js                       ← Sync localStorage ↔ Supabase
```

---

## Variables de entorno requeridas

| Variable | Dónde se usa | Cómo obtenerla |
|---|---|---|
| `SUPABASE_URL` | `supabase/client.js` | Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | `supabase/client.js` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions (auto) | Supabase → Settings → API |
| `IG_WEBHOOK_VERIFY_TOKEN` | Edge Function instagram-webhook | Inventarlo vos |
| `RESEND_API_KEY` | Edge Function send-email | resend.com |
| `APP_URL` | Edge Function carrito-cron | Tu dominio |

---

## Flujo completo de una venta

```
Cliente escribe DM en Instagram
         │
         ▼
instagram-webhook (Edge Function)
         │
         ├─ Lee productos de tabla `products`
         ├─ Responde con el bot
         ├─ Guarda en `bot_conversations`
         └─ Inserta evento en `events`
                   │
                   ▼
            Realtime channel
                   │
                   ▼
         Feed del dashboard (en vivo)

Cliente va al link de pago (Mercado Pago)
         │
         ▼
   Pago aprobado → mp-webhook
         │
         ├─ Crea/actualiza `orders`
         ├─ Marca carrito como `recovered`
         └─ Inserta evento `venta` → feed en vivo

Si no compra → carrito-cron (cada hora)
         │
         ├─ Detecta abandono
         ├─ Llama send-email (recordatorio 1, 2, 3)
         └─ Actualiza `reminder_num` en `carts`
```
