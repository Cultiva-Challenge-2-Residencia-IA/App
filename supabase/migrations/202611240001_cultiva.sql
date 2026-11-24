create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  activity text not null check (length(activity) <= 120),
  food text not null check (length(food) <= 120),
  water integer not null check (water between 0 and 10),
  mood integer not null check (mood between 1 and 5),
  energy integer not null check (energy between 1 and 5),
  stress integer not null check (stress between 1 and 5),
  priority text not null check (length(btrim(priority)) between 1 and 200),
  note text not null check (length(note) <= 4000)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  label text not null check (length(btrim(label)) between 1 and 200),
  due_date date not null,
  due_time time,
  category text not null check (length(btrim(category)) between 1 and 80),
  done boolean not null default false
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  agent text not null check (agent in ('nutrition','physical','mental','study')),
  title text not null check (length(btrim(title)) between 1 and 200),
  body text not null check (length(body) <= 8000)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  agent text not null check (agent in ('nutrition','physical','mental','study')),
  role text not null check (role in ('user','assistant')),
  content text not null check (length(btrim(content)) between 1 and 10000),
  model text
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  type text not null check (length(btrim(type)) between 1 and 80),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 20000)
);

create table public.preferences (
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null check (length(key) between 1 and 80),
  value jsonb not null check (octet_length(value::text) <= 20000),
  primary key (owner, key)
);

do $$
declare table_name text;
begin
  foreach table_name in array array['checkins','tasks','notes','messages','events','preferences'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('create policy own_rows on public.%I for all to authenticated using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner)', table_name);
    if table_name <> 'preferences' then
      execute format('create index on public.%I (owner, created_at desc)', table_name);
    end if;
  end loop;
end $$;

create function public.record_checkin(
  entry_id uuid, day date, body_activity text, body_food text, cups integer,
  mood_score integer, energy_score integer, stress_score integer,
  main_task text, main_time time, extra_task text, personal_note text
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.checkins (id, activity, food, water, mood, energy, stress, priority, note)
  values (entry_id, body_activity, body_food, cups, mood_score, energy_score, stress_score, main_task, personal_note)
  on conflict (id) do nothing;
  if not found then return; end if;
  insert into public.tasks (label, due_date, due_time, category)
  values (main_task, day, main_time, 'Pessoal');
  if length(btrim(extra_task)) > 0 then
    insert into public.tasks (label, due_date, category) values (extra_task, day, 'Pessoal');
  end if;
end $$;
revoke all on function public.record_checkin from public, anon;
grant execute on function public.record_checkin to authenticated;

create function public.delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_my_account from public, anon;
grant execute on function public.delete_my_account to authenticated;

create function public.record_task_event() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.events (owner, type, payload)
    values (new.owner, 'task.created', jsonb_build_object('label', new.label, 'taskId', new.id));
  elsif new.done is distinct from old.done then
    insert into public.events (owner, type, payload)
    values (new.owner, case when new.done then 'task.completed' else 'task.reopened' end,
      jsonb_build_object('label', new.label, 'taskId', new.id));
  end if;
  return new;
end $$;
create trigger tasks_record_events after insert or update of done on public.tasks
for each row execute function public.record_task_event();

create schema if not exists cultiva_private;
create table cultiva_private.chat_limits (
  owner uuid primary key references auth.users on delete cascade,
  minute timestamptz not null,
  requests integer not null check (requests between 1 and 6)
);

create function public.reserve_chat_request() returns boolean
language sql security definer set search_path = '' as $$
  with reserved as (
    insert into cultiva_private.chat_limits as rate (owner, minute, requests)
    values (auth.uid(), date_trunc('minute', statement_timestamp()), 1)
    on conflict (owner) do update set
      minute = excluded.minute,
      requests = case when rate.minute = excluded.minute then rate.requests + 1 else 1 end
    where rate.minute <> excluded.minute or rate.requests < 6
    returning 1
  )
  select exists (select 1 from reserved);
$$;
revoke all on function public.reserve_chat_request from public, anon;
grant execute on function public.reserve_chat_request to authenticated;
