-- Contactos que piden "Enterarme de lo próximo" desde la web.
-- Se ejecuta una vez en Supabase: SQL Editor > New query > Run.
-- La web solo puede INSERTAR (no leer). Los contactos se ven desde Table Editor.

create table if not exists public.novedades (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null check (char_length(nombre) between 1 and 80),
  whatsapp text not null check (whatsapp ~ '^[0-9]{8,15}$'),
  origen text,
  interes text,
  estado text not null default 'nuevo',
  ultimo_contacto timestamptz
);

alter table public.novedades enable row level security;

drop policy if exists "web puede insertar novedades" on public.novedades;
create policy "web puede insertar novedades"
  on public.novedades for insert
  to anon, authenticated
  with check (true);
