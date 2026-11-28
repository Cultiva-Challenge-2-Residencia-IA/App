alter table public.messages
  add column in_reply_to uuid unique,
  add unique (owner, id),
  add constraint reply_uses_assistant_role check (in_reply_to is null or role = 'assistant'),
  add constraint reply_owned_by_same_account
    foreign key (owner, in_reply_to) references public.messages (owner, id) on delete cascade;
