-- ========================================================
-- 0. AUXILIARY FUNCTIONS TO PREVENT RECURSION IN RLS
-- ========================================================

create or replace function public.is_active_user(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select account_state = 'active' from public.profiles where id = user_id), false);
$$;

create or replace function public.get_user_role(user_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = user_id), 'membro');
$$;

create or replace function public.get_user_dept(user_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce((select department from public.profiles where id = user_id), 'Geral');
$$;


-- ========================================================
-- 1. TABELA DE TAREFAS (tasks)
-- ========================================================

create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  completed boolean default false not null,
  department text,
  user_id uuid default auth.uid(),
  assigned_to uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Garantir colunas se a tabela já existia antes
alter table public.tasks add column if not exists department text;
alter table public.tasks add column if not exists user_id uuid default auth.uid();
alter table public.tasks add column if not exists assigned_to uuid;
alter table public.tasks alter column user_id set default auth.uid();

-- Ativar RLS
alter table public.tasks enable row level security;

-- Políticas de RLS para 'tasks'
drop policy if exists "Qualquer pessoa pode ler tarefas" on public.tasks;
drop policy if exists "Qualquer pessoa pode criar tarefas" on public.tasks;
drop policy if exists "Qualquer pessoa pode atualizar tarefas" on public.tasks;
drop policy if exists "Qualquer pessoa pode apagar tarefas" on public.tasks;

drop policy if exists "Leitura de tarefas" on public.tasks;
create policy "Leitura de tarefas" on public.tasks for select using (
  public.is_active_user(auth.uid()) and (
    public.get_user_role(auth.uid()) = 'admin' or
    (public.get_user_dept(auth.uid()) = 'Mesa' and (department is not null or user_id = auth.uid() or assigned_to = auth.uid())) or
    (department = public.get_user_dept(auth.uid()) or user_id = auth.uid() or assigned_to = auth.uid())
  )
);

drop policy if exists "Inserção de tarefas" on public.tasks;
create policy "Inserção de tarefas" on public.tasks for insert with check (
  public.is_active_user(auth.uid()) and (
    public.get_user_role(auth.uid()) = 'admin' or
    (public.get_user_dept(auth.uid()) = 'Mesa' or public.get_user_role(auth.uid()) in ('diretor', 'co-diretor')) or
    (user_id = auth.uid() and (department is null or department = public.get_user_dept(auth.uid())))
  )
);

drop policy if exists "Atualização de tarefas" on public.tasks;
create policy "Atualização de tarefas" on public.tasks for update using (
  public.is_active_user(auth.uid()) and (
    public.get_user_role(auth.uid()) = 'admin' or
    (public.get_user_dept(auth.uid()) = 'Mesa' and (department is not null or user_id = auth.uid() or assigned_to = auth.uid())) or
    (public.get_user_role(auth.uid()) in ('diretor', 'co-diretor') and (department = public.get_user_dept(auth.uid()) or user_id = auth.uid() or assigned_to = auth.uid())) or
    (user_id = auth.uid())
  )
);

drop policy if exists "Eliminação de tarefas" on public.tasks;
create policy "Eliminação de tarefas" on public.tasks for delete using (
  public.is_active_user(auth.uid()) and (
    public.get_user_role(auth.uid()) = 'admin' or
    (public.get_user_dept(auth.uid()) = 'Mesa' and (department is not null or user_id = auth.uid() or assigned_to = auth.uid())) or
    (public.get_user_role(auth.uid()) in ('diretor', 'co-diretor') and (department = public.get_user_dept(auth.uid()) or user_id = auth.uid() or assigned_to = auth.uid())) or
    (user_id = auth.uid())
  )
);


-- ========================================================
-- 2. TABELA DE EVENTOS (events)
-- ========================================================

create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  location text,
  department text,
  user_id uuid default auth.uid(),
  assigned_to uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Garantir colunas se a tabela já existia antes
alter table public.events add column if not exists description text;
alter table public.events add column if not exists location text;
alter table public.events add column if not exists department text;
alter table public.events add column if not exists user_id uuid default auth.uid();
alter table public.events add column if not exists assigned_to uuid;
alter table public.events alter column user_id set default auth.uid();

-- Ativar RLS
alter table public.events enable row level security;

-- Políticas de RLS para 'events'
drop policy if exists "Leitura de eventos" on public.events;
create policy "Leitura de eventos" on public.events for select using (
  public.is_active_user(auth.uid()) and (
    public.get_user_role(auth.uid()) = 'admin' or
    (public.get_user_dept(auth.uid()) = 'Mesa' and (department is not null or user_id = auth.uid() or assigned_to = auth.uid())) or
    (department = public.get_user_dept(auth.uid()) or user_id = auth.uid() or assigned_to = auth.uid())
  )
);

drop policy if exists "Inserção de eventos" on public.events;
create policy "Inserção de eventos" on public.events for insert with check (
  public.is_active_user(auth.uid()) and (
    public.get_user_role(auth.uid()) = 'admin' or
    (public.get_user_dept(auth.uid()) = 'Mesa' or public.get_user_role(auth.uid()) in ('diretor', 'co-diretor')) or
    (user_id = auth.uid() and (department is null or department = public.get_user_dept(auth.uid())))
  )
);

drop policy if exists "Atualização de eventos" on public.events;
create policy "Atualização de eventos" on public.events for update using (
  public.is_active_user(auth.uid()) and (
    public.get_user_role(auth.uid()) = 'admin' or
    (public.get_user_dept(auth.uid()) = 'Mesa' and (department is not null or user_id = auth.uid() or assigned_to = auth.uid())) or
    (public.get_user_role(auth.uid()) in ('diretor', 'co-diretor') and (department = public.get_user_dept(auth.uid()) or user_id = auth.uid() or assigned_to = auth.uid())) or
    (user_id = auth.uid())
  )
);

drop policy if exists "Eliminação de eventos" on public.events;
create policy "Eliminação de eventos" on public.events for delete using (
  public.is_active_user(auth.uid()) and (
    public.get_user_role(auth.uid()) = 'admin' or
    (public.get_user_dept(auth.uid()) = 'Mesa' and (department is not null or user_id = auth.uid() or assigned_to = auth.uid())) or
    (public.get_user_role(auth.uid()) in ('diretor', 'co-diretor') and (department = public.get_user_dept(auth.uid()) or user_id = auth.uid() or assigned_to = auth.uid())) or
    (user_id = auth.uid())
  )
);


-- ========================================================
-- 3. TABELA DE CONTACTOS (contact_entities & contacts)
-- ========================================================

create table if not exists public.contact_entities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.contacts (
  id uuid default gen_random_uuid() primary key,
  entity_id uuid references public.contact_entities on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.contact_entities enable row level security;
alter table public.contacts enable row level security;

-- Políticas de RLS para 'contact_entities'
drop policy if exists "Leitura pública de entidades" on public.contact_entities;
create policy "Leitura de entidades" on public.contact_entities for select using (
  public.is_active_user(auth.uid())
);

drop policy if exists "Inserção pública de entidades" on public.contact_entities;
create policy "Inserção de entidades" on public.contact_entities for insert with check (
  public.is_active_user(auth.uid())
);

drop policy if exists "Atualização pública de entidades" on public.contact_entities;
create policy "Atualização de entidades" on public.contact_entities for update using (
  public.is_active_user(auth.uid())
);

drop policy if exists "Eliminação pública de entidades" on public.contact_entities;
create policy "Eliminação de entidades" on public.contact_entities for delete using (
  public.is_active_user(auth.uid())
);

-- Políticas de RLS para 'contacts'
drop policy if exists "Leitura pública de contactos" on public.contacts;
create policy "Leitura de contactos" on public.contacts for select using (
  public.is_active_user(auth.uid())
);

drop policy if exists "Inserção pública de contactos" on public.contacts;
create policy "Inserção de contactos" on public.contacts for insert with check (
  public.is_active_user(auth.uid())
);

drop policy if exists "Atualização pública de contactos" on public.contacts;
create policy "Atualização de contactos" on public.contacts for update using (
  public.is_active_user(auth.uid())
);

drop policy if exists "Eliminação pública de contactos" on public.contacts;
create policy "Eliminação de contactos" on public.contacts for delete using (
  public.is_active_user(auth.uid())
);


-- ========================================================
-- 4. TABELA DE PERFIS (profiles)
-- ========================================================

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text,
  login_email text,
  role text default 'membro' not null,
  department text default 'Geral' not null,
  avatar_color text default 'bg-indigo-500' not null,
  account_state text default 'active' not null constraint valid_account_state check (account_state in ('active', 'pending', 'inactive')),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Garantir colunas se a tabela já existia antes
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists login_email text;

-- Migração segura de dados para account_state
alter table public.profiles add column if not exists account_state text default 'active';
alter table public.profiles drop constraint if exists valid_account_state;
alter table public.profiles add constraint valid_account_state check (account_state in ('active', 'pending', 'inactive'));
alter table public.profiles alter column account_state set not null;

-- Script de UPDATE seguro (apenas corre se as colunas antigas existirem)
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_active') then
    update public.profiles 
    set account_state = case 
      when is_pending = true then 'pending'
      when is_active = false then 'inactive'
      else 'active'
    end;
  end if;
end $$;

-- Drop de colunas antigas após a migração concluída com sucesso
alter table public.profiles drop column if exists is_active;
alter table public.profiles drop column if exists is_pending;

-- Ativar RLS
alter table public.profiles enable row level security;

-- Políticas de RLS para 'profiles'
drop policy if exists "Leitura pública de perfis" on public.profiles;
create policy "Leitura de perfis" on public.profiles for select using (
  public.is_active_user(auth.uid())
);

drop policy if exists "Utilizadores inserem o próprio perfil" on public.profiles;
create policy "Utilizadores inserem o próprio perfil" on public.profiles for insert with check (
  auth.uid() = id
);

drop policy if exists "Utilizadores atualizam o próprio perfil" on public.profiles;
create policy "Atualização de perfis" on public.profiles for update using (
  public.get_user_role(auth.uid()) = 'admin' or (auth.uid() = id and public.is_active_user(auth.uid()))
);


-- ========================================================
-- 5. BUCKET DE ARMAZENAMENTO (storage.buckets & objects)
-- ========================================================

-- Criar o bucket "documents" se não existir
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- RLS para storage.objects
drop policy if exists "Leitura pública de documentos" on storage.objects;
create policy "Acesso a documentos" on storage.objects for select using (
  bucket_id = 'documents' and public.is_active_user(auth.uid()) and (
    public.get_user_role(auth.uid()) = 'admin' or
    ((storage.foldername(name))[1] = 'Privado' and owner = auth.uid()) or
    ((storage.foldername(name))[1] != 'Privado' and (
      public.get_user_dept(auth.uid()) = 'Mesa' or
      (storage.foldername(name))[1] = public.get_user_dept(auth.uid())
    ))
  )
);

drop policy if exists "Qualquer pessoa insere documentos" on storage.objects;
create policy "Inserção de documentos" on storage.objects for insert with check (
  bucket_id = 'documents' and public.is_active_user(auth.uid()) and (
    public.get_user_role(auth.uid()) = 'admin' or
    ((storage.foldername(name))[1] = 'Privado' and owner = auth.uid()) or
    ((storage.foldername(name))[1] != 'Privado' and (
      public.get_user_dept(auth.uid()) = 'Mesa' or
      (storage.foldername(name))[1] = public.get_user_dept(auth.uid())
    ))
  )
);

drop policy if exists "Qualquer pessoa elimina documentos" on storage.objects;
create policy "Eliminação de documentos" on storage.objects for delete using (
  bucket_id = 'documents' and public.is_active_user(auth.uid()) and (
    public.get_user_role(auth.uid()) = 'admin' or
    ((storage.foldername(name))[1] = 'Privado' and owner = auth.uid()) or
    ((storage.foldername(name))[1] != 'Privado' and (
      public.get_user_dept(auth.uid()) = 'Mesa' or
      (public.get_user_role(auth.uid()) in ('diretor', 'co-diretor') and (storage.foldername(name))[1] = public.get_user_dept(auth.uid())) or
      (owner = auth.uid())
    ))
  )
);
