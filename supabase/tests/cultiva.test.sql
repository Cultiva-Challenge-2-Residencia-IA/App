begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(16);

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'cultiva-a@example.test'),
  ('10000000-0000-4000-8000-000000000002', 'cultiva-b@example.test');

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';

select lives_ok($q$select public.record_checkin('20000000-0000-4000-8000-000000000001',
  '2026-11-24','Caminhada','Almoço',3,4,3,2,'Revisar','09:00','Ler','')$q$, 'check-in e tarefas persistem');
select lives_ok($q$select public.record_checkin('20000000-0000-4000-8000-000000000001',
  '2026-11-24','Caminhada','Almoço',3,4,3,2,'Revisar','09:00','Ler','')$q$, 'retry é idempotente');
select is((select count(*) from public.tasks), 2::bigint, 'apenas duas tarefas derivadas');
select throws_ok($q$select public.record_checkin('20000000-0000-4000-8000-000000000002',
  '2026-11-24','Caminhada','Almoço',11,4,3,2,'Inválida',null,'','')$q$,'23514',null,'valida quantidade de água');
select is((select count(*) from public.checkins), 1::bigint, 'somente o check-in válido persistiu');
update public.tasks set done = true where label = 'Revisar';
select is((select count(*) from public.events where type = 'task.completed'), 1::bigint, 'conclusão grava um evento');
select is((select count(*) from
  (select public.reserve_chat_request() as reserved from generate_series(1, 7)) as attempts
  where reserved), 6::bigint, 'a sétima solicitação de IA é bloqueada no mesmo minuto');

select lives_ok($q$select public.record_daily_checkin('20000000-0000-4000-8000-000000000003',
  '2026-11-24','Caminhada','Almoço',2,4,3,2,' revisar ','09:00','Ler','')$q$, 'novo check-in usa a data da atividade');
select lives_ok($q$select public.record_daily_checkin('20000000-0000-4000-8000-000000000003',
  '2026-11-24','Caminhada','Almoço',2,4,3,2,' revisar ','09:00','Ler','')$q$, 'retry do novo check-in é idempotente');
select is((select count(*) from public.checkins where water_mode = 'additional' and activity_date = '2026-11-24'),
  1::bigint, 'hidratação adicional persistida uma vez');
select is((select count(*) from public.checkins where water_mode = 'total' and activity_date is null),
  1::bigint, 'check-in legado continua disponível');
select is((select count(*) from public.tasks), 2::bigint, 'check-in reutiliza prioridades já registradas');

set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000002';
select is((select count(*) from public.tasks), 0::bigint, 'outra conta não lê as tarefas');
select is((select count(*) from public.checkins), 0::bigint, 'outra conta não lê o check-in e a hidratação');
select throws_ok($q$insert into public.tasks (owner,label,due_date,category)
  values ('10000000-0000-4000-8000-000000000001','Tentativa','2026-11-24','Pessoal')$q$,
  '42501',null,'outra conta não escreve no nome da primeira');

set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
select public.delete_my_account();
select is((select count(*) from public.checkins), 0::bigint, 'exclusão remove registros');
select * from finish();
rollback;
