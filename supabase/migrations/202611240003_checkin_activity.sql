alter table public.checkins
  add column activity_date date,
  add column water_mode text not null default 'total'
    check (water_mode in ('total', 'additional'));

-- Keep the original RPC for clients that still report a daily total.
create function public.record_daily_checkin(
  entry_id uuid, day date, body_activity text, body_food text, cups integer,
  mood_score integer, energy_score integer, stress_score integer,
  main_task text, main_time time, extra_task text, personal_note text
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  current_owner uuid := auth.uid();
begin
  if day is null then
    raise exception 'Informe a data do check-in.' using errcode = '22004';
  end if;
  insert into public.checkins (id, owner, activity_date, water_mode, activity, food, water, mood, energy, stress, priority, note)
  values (entry_id, current_owner, day, 'additional', body_activity, body_food, cups, mood_score, energy_score, stress_score, main_task, personal_note)
  on conflict (id) do nothing;
  if not found then return; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_owner::text || ':' || day::text, 0));
  insert into public.tasks (owner, label, due_date, due_time, category)
  select current_owner, btrim(main_task), day, main_time, 'Pessoal'
  where not exists (
    select 1 from public.tasks t where t.owner = current_owner and t.due_date = day
      and lower(btrim(t.label)) = lower(btrim(main_task))
      and (main_time is null or t.due_time = main_time)
  );
  insert into public.tasks (owner, label, due_date, category)
  select current_owner, btrim(extra_task), day, 'Pessoal'
  where length(btrim(extra_task)) > 0 and not exists (
    select 1 from public.tasks t where t.owner = current_owner and t.due_date = day
      and lower(btrim(t.label)) = lower(btrim(extra_task))
  );
end $$;

revoke all on function public.record_daily_checkin from public, anon;
grant execute on function public.record_daily_checkin to authenticated;
