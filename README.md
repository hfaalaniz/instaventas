# InstaVentas — Máquina de Ventas Automáticas

Sistema profesional de ventas automáticas integrado con Instagram, Mercado Pago y Facebook Login. Gestión completa de productos, ventas, carrito abandonado y automatización de respuestas via DM.

## Funcionalidades

- **Bot de Instagram** — responde DMs automáticamente con catálogo y links de pago
- **Mercado Pago** — generación de links de pago y confirmación automática de ventas
- **Carrito abandonado** — detección y envío de emails de recuperación automáticos
- **Dashboard en tiempo real** — feed de eventos vía Supabase Realtime
- **Catálogo de productos** — gestión completa con imágenes, precios y stock
- **Auditoria** — registro de todas las acciones del sistema
- **Auth** — login con email/contraseña, Google y Facebook

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | HTML + CSS + JavaScript (vanilla) |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime) |
| Edge Functions | Deno (TypeScript) |
| Deploy | Cloudflare Pages |
| Email | Resend |
| Pagos | Mercado Pago |
| Mensajería | Instagram Graph API |

---

## Estructura del proyecto

```
instaventas/
├── index.html                    # Dashboard principal (requiere auth)
├── login.html                    # Página de inicio de sesión / registro
├── privacy.html                  # Política de privacidad
├── terms.html                    # Condiciones del servicio
├── delete.html                   # Instrucciones eliminación de datos
├── logo.svg                      # Logo del sistema
│
├── css/
│   ├── variables.css             # Variables de diseño (colores, radios, sombras)
│   ├── base.css                  # Estilos base
│   ├── layout.css                # Layout principal
│   ├── dashboard.css             # Estilos del dashboard
│   ├── ventas.css                # Módulo de ventas
│   ├── carrito.css               # Módulo de carrito
│   ├── pagos.css                 # Módulo de pagos
│   ├── pixel.css                 # Módulo de pixel/tracking
│   └── auditoria.css             # Módulo de auditoría
│
├── js/
│   ├── app.js                    # Inicialización de la app
│   ├── state.js                  # Estado global
│   ├── utils.js                  # Utilidades compartidas
│   ├── dashboard.js              # Lógica del dashboard
│   ├── ventas.js                 # Módulo de ventas
│   ├── carrito.js                # Módulo de carrito abandonado
│   ├── catalogo.js               # Gestión de productos
│   ├── pagos.js                  # Integración Mercado Pago
│   ├── email.js                  # Módulo de email marketing
│   ├── configuracion.js          # Configuración de la tienda
│   ├── pixel.js                  # Pixel de seguimiento
│   └── auditoria.js              # Registro de auditoría
│
└── supabase/
    ├── client.js                 # Instancia del SDK de Supabase
    ├── auth.js                   # Login, logout, guard de rutas
    ├── db.js                     # CRUD sobre todas las tablas
    ├── realtime.js               # Suscripciones en tiempo real
    ├── sync.js                   # Sincronización localStorage ↔ Supabase
    ├── migrations/
    │   └── 001_initial_schema.sql
    └── functions/
        ├── instagram-webhook/    # Bot de Instagram
        ├── mp-webhook/           # Webhook de Mercado Pago
        ├── send-email/           # Envío de emails transaccionales
        └── carrito-cron/         # Cron de recuperación de carritos
```

---

## Setup completo

### 1. Crear proyecto en Supabase

1. Ir a [app.supabase.com](https://app.supabase.com) → **New project**
2. Elegir nombre, contraseña fuerte, región más cercana (ej: South America)
3. Esperar que el proyecto se inicialice (~2 min)

### 2. Ejecutar el esquema SQL

1. **SQL Editor → New query**
2. Pegar el contenido de `supabase/migrations/001_initial_schema.sql`
3. Ejecutar y verificar que no haya errores

### 3. Configurar credenciales

En `supabase/client.js` reemplazar:

```js
const SUPABASE_URL      = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY';
```

Valores en: **Supabase → Settings → API**

### 4. Habilitar Auth providers

**Email/Password**
- Authentication → Providers → Email → Enable

**Google OAuth**
1. Authentication → Providers → Google → Enable
2. Crear credenciales en [console.cloud.google.com](https://console.cloud.google.com)
3. Authorized redirect URI: `https://TU_PROYECTO.supabase.co/auth/v1/callback`
4. Pegar Client ID y Secret en Supabase

**Facebook Login**
1. Crear app en [developers.facebook.com](https://developers.facebook.com)
2. Caso de uso: **Autenticar con inicio de sesión con Facebook**
3. Authorized redirect URI: `https://TU_PROYECTO.supabase.co/auth/v1/callback`
4. Authentication → Providers → Facebook → Enable → pegar App ID y Secret

**URL Configuration (Supabase)**
- Site URL: `https://tu-dominio.pages.dev`
- Redirect URLs: `https://tu-dominio.pages.dev/login.html`

### 5. Deploy de Edge Functions

```bash
npm install -g supabase
supabase login
supabase link --project-ref TU_PROJECT_REF
```

Configurar variables de entorno:

```bash
supabase secrets set IG_WEBHOOK_VERIFY_TOKEN=mi_token_secreto
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set APP_URL=https://tu-dominio.pages.dev
```

Deployar funciones:

```bash
supabase functions deploy instagram-webhook
supabase functions deploy mp-webhook
supabase functions deploy send-email
supabase functions deploy carrito-cron
```

### 6. Configurar webhook de Instagram

1. [developers.facebook.com](https://developers.facebook.com) → Tu App → Webhooks → Instagram
2. Callback URL: `https://TU_PROYECTO.supabase.co/functions/v1/instagram-webhook`
3. Verify Token: el mismo que `IG_WEBHOOK_VERIFY_TOKEN`
4. Suscribirse a: `messages`, `messaging_postbacks`
5. En la app → **Configuración → Instagram** → completar Page Access Token e Instagram Account ID

### 7. Configurar webhook de Mercado Pago

1. [mercadopago.com/developers/panel](https://mercadopago.com/developers/panel) → Tu app → Webhooks
2. URL: `https://TU_PROYECTO.supabase.co/functions/v1/mp-webhook?store_id=TU_STORE_ID`
3. Eventos: `payment`

El `store_id` se obtiene en la tabla `stores` de Supabase Table Editor.

### 8. Activar cron de carrito abandonado

En **Supabase → Database → Extensions** habilitar `pg_cron`, luego en SQL Editor:

```sql
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

### 9. Deploy en Cloudflare Pages

1. [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create → Pages
2. Conectar repositorio de GitHub
3. Framework preset: **None** — Build command: vacío — Output: vacío
4. Deploy

---

## Variables de entorno

| Variable | Descripción | Dónde obtenerla |
|---|---|---|
| `SUPABASE_URL` | URL del proyecto | Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | Clave pública | Supabase → Settings → API |
| `IG_WEBHOOK_VERIFY_TOKEN` | Token de verificación Instagram | Generarlo manualmente |
| `RESEND_API_KEY` | API key para envío de emails | [resend.com](https://resend.com) |
| `APP_URL` | URL de la app en producción | Tu dominio de Cloudflare Pages |

---

## Flujo de una venta

```
Cliente escribe DM en Instagram
        │
        ▼
instagram-webhook (Edge Function)
        ├─ Lee productos de tabla `products`
        ├─ Responde con el bot
        └─ Inserta evento en `events` → feed en vivo

Cliente va al link de pago (Mercado Pago)
        │
        ▼
Pago aprobado → mp-webhook
        ├─ Crea/actualiza `orders`
        ├─ Marca carrito como `recovered`
        └─ Inserta evento `venta` → feed en vivo

Si no compra → carrito-cron (cada hora)
        ├─ Detecta abandono
        ├─ Envía email de recuperación (hasta 3)
        └─ Actualiza `reminder_num` en `carts`
```

---

## Demo

**Producción:** [https://instaventas.pages.dev](https://instaventas.pages.dev)

---

## Licencia

Uso privado — todos los derechos reservados.
