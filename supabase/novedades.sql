-- Contactos que piden novedades desde la web (WhatsApp desde las historias, correo desde el newsletter).
-- Se ejecuta una vez en Supabase: SQL Editor > New query > Run. Se puede volver a correr sin problema.
-- La web solo puede INSERTAR (no leer). Los contactos se ven desde Table Editor.

create table if not exists public.novedades (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text,
  whatsapp text,
  email text,
  origen text,
  interes text,
  estado text not null default 'nuevo',
  ultimo_contacto timestamptz
);

-- Si la tabla ya existía con la versión anterior, la ajusta
alter table public.novedades add column if not exists email text;
alter table public.novedades alter column nombre drop not null;
alter table public.novedades alter column whatsapp drop not null;
alter table public.novedades drop constraint if exists novedades_nombre_check;
alter table public.novedades drop constraint if exists novedades_whatsapp_check;
alter table public.novedades drop constraint if exists novedades_email_check;
alter table public.novedades drop constraint if exists novedades_contacto_check;

alter table public.novedades add constraint novedades_nombre_check
  check (nombre is null or char_length(nombre) between 1 and 80);
alter table public.novedades add constraint novedades_whatsapp_check
  check (whatsapp is null or whatsapp ~ '^[0-9]{8,15}$');
alter table public.novedades add constraint novedades_email_check
  check (email is null or (char_length(email) <= 120 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'));
alter table public.novedades add constraint novedades_contacto_check
  check (whatsapp is not null or email is not null);

alter table public.novedades enable row level security;

drop policy if exists "web puede insertar novedades" on public.novedades;
create policy "web puede insertar novedades"
  on public.novedades for insert
  to anon, authenticated
  with check (true);
