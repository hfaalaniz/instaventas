-- ============================================================
-- INSTAVENTAS — Esquema inicial de base de datos
-- Ejecutar en: Supabase SQL Editor (en orden)
-- ============================================================

-- Habilitar extensiones necesarias
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";

-- ============================================================
-- TABLA: stores
-- Una fila por usuario/tienda. Vinculada a auth.users.
-- ============================================================
create table if not exists stores (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  store_name  text not null default '',
  category    text default '',
  url         text default '',
  ig_handle   text default '',
  email       text default '',
  whatsapp    text default '',
  country     text default 'AR',
  timezone    text default 'America/Argentina/Buenos_Aires',
  dark_mode   boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- TABLA: config
-- Configuración modular por tienda (pagos, bot, pixel, etc.)
-- Guardada como JSONB para mantener la misma estructura de state.js
-- ============================================================
create table if not exists config (
  id         uuid primary key default uuid_generate_v4(),
  store_id   uuid references stores(id) on delete cascade not null unique,
  pagos      jsonb default '{}',
  carrito    jsonb default '{}',
  bot        jsonb default '{}',
  pixel      jsonb default '{}',
  email      jsonb default '{}',
  notifs     jsonb default '{}',
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLA: products
-- Catálogo de productos de la tienda
-- ============================================================
create table if not exists products (
  id          uuid primary key default uuid_generate_v4(),
  store_id    uuid references stores(id) on delete cascade not null,
  name        text not null,
  category    text default '',
  price       numeric(12,2) not null default 0,
  price_old   numeric(12,2) default 0,
  stock       integer default 0,
  sku         text default '',
  description text default '',
  image_url   text default '',
  link        text default '',
  active      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- TABLA: subscribers
-- Lista de suscriptores de email marketing
-- ============================================================
create table if not exists subscribers (
  id          uuid primary key default uuid_generate_v4(),
  store_id    uuid references stores(id) on delete cascade not null,
  email       text not null,
  name        text default '',
  source      text default 'manual',  -- manual, instagram, checkout, import
  active      boolean default true,
  created_at  timestamptz default now(),
  unique(store_id, email)
);

-- ============================================================
-- TABLA: email_campaigns
-- Historial de campañas enviadas
-- ============================================================
create table if not exists email_campaigns (
  id          uuid primary key default uuid_generate_v4(),
  store_id    uuid references stores(id) on delete cascade not null,
  subject     text not null,
  body        text default '',
  segment     text default 'all',
  sent_count  integer default 0,
  opened      integer default 0,
  clicked     integer default 0,
  status      text default 'sent',   -- draft, sent, failed
  sent_at     timestamptz default now()
);

-- ============================================================
-- TABLA: carts
-- Carritos abandonados detectados
-- ============================================================
create table if not exists carts (
  id           uuid primary key default uuid_generate_v4(),
  store_id     uuid references stores(id) on delete cascade not null,
  customer_name text default '',
  customer_email text default '',
  customer_phone text default '',
  product_name text default '',
  amount       numeric(12,2) default 0,
  status       text default 'pending',  -- pending, recovered, expired
  reminder_num integer default 0,
  source       text default 'web',      -- web, instagram, whatsapp
  coupon_code  text default '',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ============================================================
-- TABLA: orders
-- Órdenes confirmadas (desde webhook de Mercado Pago u otros)
-- ============================================================
create table if not exists orders (
  id              uuid primary key default uuid_generate_v4(),
  store_id        uuid references stores(id) on delete cascade not null,
  external_id     text default '',     -- ID de MP, PayPal, Stripe
  gateway         text default 'mp',   -- mp, paypal, stripe, crypto, transfer
  customer_name   text default '',
  customer_email  text default '',
  amount          numeric(12,2) default 0,
  currency        text default 'ARS',
  status          text default 'pending', -- pending, approved, rejected, refunded
  items           jsonb default '[]',
  raw_payload     jsonb default '{}',     -- payload original del gateway
  cart_id         uuid references carts(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- TABLA: bot_conversations
-- Historial de conversaciones del bot
-- ============================================================
create table if not exists bot_conversations (
  id            uuid primary key default uuid_generate_v4(),
  store_id      uuid references stores(id) on delete cascade not null,
  channel       text not null,          -- instagram, whatsapp, facebook, telegram
  external_id   text default '',        -- ID del usuario en la plataforma
  user_handle   text default '',        -- @handle o número
  message       text default '',
  response      text default '',
  converted     boolean default false,
  created_at    timestamptz default now()
);

-- ============================================================
-- TABLA: events
-- Eventos del activity feed en tiempo real
-- ============================================================
create table if not exists events (
  id         uuid primary key default uuid_generate_v4(),
  store_id   uuid references stores(id) on delete cascade not null,
  type       text not null,   -- venta, carrito, recuperado, pixel, bot
  message    text default '',
  metadata   jsonb default '{}',
  created_at timestamptz default now()
);

-- ============================================================
-- TABLA: pixel_events
-- Eventos del Pixel de Facebook/Instagram registrados
-- ============================================================
create table if not exists pixel_events (
  id         uuid primary key default uuid_generate_v4(),
  store_id   uuid references stores(id) on delete cascade not null,
  event_name text not null,   -- PageView, AddToCart, Purchase, etc.
  source     text default 'facebook',
  value      numeric(12,2) default 0,
  currency   text default 'ARS',
  metadata   jsonb default '{}',
  created_at timestamptz default now()
);

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger stores_updated_at   before update on stores   for each row execute function set_updated_at();
create trigger config_updated_at   before update on config   for each row execute function set_updated_at();
create trigger products_updated_at before update on products for each row execute function set_updated_at();
create trigger carts_updated_at    before update on carts    for each row execute function set_updated_at();
create trigger orders_updated_at   before update on orders   for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Cada usuario solo accede a los datos de su tienda
-- ============================================================
alter table stores             enable row level security;
alter table config             enable row level security;
alter table products           enable row level security;
alter table subscribers        enable row level security;
alter table email_campaigns    enable row level security;
alter table carts              enable row level security;
alter table orders             enable row level security;
alter table bot_conversations  enable row level security;
alter table events             enable row level security;
alter table pixel_events       enable row level security;

-- Helper: obtener store_id del usuario autenticado
create or replace function my_store_id()
returns uuid language sql security definer stable as $$
  select id from stores where user_id = auth.uid() limit 1;
$$;

-- Políticas para stores
create policy "users_own_store"    on stores for all using (user_id = auth.uid());

-- Políticas genéricas para todas las tablas hijas
create policy "store_select" on config            for select using (store_id = my_store_id());
create policy "store_insert" on config            for insert with check (store_id = my_store_id());
create policy "store_update" on config            for update using (store_id = my_store_id());

create policy "store_all"    on products          for all using (store_id = my_store_id());
create policy "store_all"    on subscribers       for all using (store_id = my_store_id());
create policy "store_all"    on email_campaigns   for all using (store_id = my_store_id());
create policy "store_all"    on carts             for all using (store_id = my_store_id());
create policy "store_all"    on orders            for all using (store_id = my_store_id());
create policy "store_all"    on bot_conversations for all using (store_id = my_store_id());
create policy "store_all"    on events            for all using (store_id = my_store_id());
create policy "store_all"    on pixel_events      for all using (store_id = my_store_id());

-- Edge Functions pueden insertar sin auth (service_role key)
create policy "service_insert_carts"  on carts            for insert with check (true);
create policy "service_insert_orders" on orders           for insert with check (true);
create policy "service_insert_convs"  on bot_conversations for insert with check (true);
create policy "service_insert_events" on events           for insert with check (true);
create policy "service_insert_pixel"  on pixel_events     for insert with check (true);

-- ============================================================
-- REALTIME: habilitar publicación en tablas clave
-- ============================================================
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table carts;

-- ============================================================
-- ÍNDICES para queries frecuentes
-- ============================================================
create index if not exists idx_products_store      on products(store_id);
create index if not exists idx_carts_store_status  on carts(store_id, status);
create index if not exists idx_orders_store        on orders(store_id, created_at desc);
create index if not exists idx_events_store        on events(store_id, created_at desc);
create index if not exists idx_convs_store         on bot_conversations(store_id, created_at desc);
create index if not exists idx_subscribers_store   on subscribers(store_id, active);
create index if not exists idx_pixel_store         on pixel_events(store_id, event_name, created_at desc);
