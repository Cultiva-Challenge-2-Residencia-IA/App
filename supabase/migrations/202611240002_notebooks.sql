alter table public.notes
  add column category text not null default 'Geral' check (length(btrim(category)) between 1 and 80),
  add column tags text[] not null default '{}' check (cardinality(tags) <= 12),
  add column checklist jsonb not null default '[]' check (jsonb_typeof(checklist) = 'array' and jsonb_array_length(checklist) <= 30),
  add column favorite boolean not null default false,
  add column source_message_id uuid;

create unique index notes_unique_chat_source
  on public.notes (owner, source_message_id) where source_message_id is not null;

create table public.note_files (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  name text not null check (length(name) between 1 and 180),
  mime text not null check (mime in ('application/pdf', 'image/png', 'image/jpeg', 'text/plain')),
  content text not null check (length(content) between 4 and 1398104),
  created_at timestamptz not null default now()
);

create index note_files_note_id_idx on public.note_files (note_id);
alter table public.note_files enable row level security;
create policy note_files_owner_select on public.note_files for select to authenticated
  using (exists (select 1 from public.notes n where n.id = note_files.note_id and n.owner = (select auth.uid())));
create policy note_files_owner_insert on public.note_files for insert to authenticated
  with check (exists (select 1 from public.notes n where n.id = note_files.note_id and n.owner = (select auth.uid())));
create policy note_files_owner_delete on public.note_files for delete to authenticated
  using (exists (select 1 from public.notes n where n.id = note_files.note_id and n.owner = (select auth.uid())));
grant select, insert, delete on public.note_files to authenticated;
