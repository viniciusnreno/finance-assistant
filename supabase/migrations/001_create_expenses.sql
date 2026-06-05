create extension if not exists pgcrypto;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  expense_date date not null default current_date,
  value numeric(12,2) not null check (value > 0),
  currency text not null default 'BRL',

  category text not null check (
    category in (
      'alimentacao',
      'mercado',
      'transporte',
      'combustivel',
      'saude',
      'educacao',
      'lazer',
      'casa',
      'assinaturas',
      'contas',
      'familia',
      'viagem',
      'outros'
    )
  ),

  description text not null,
  merchant text,
  payment_method text,

  original_text text,
  transcription_text text,

  source text not null default 'telegram',
  telegram_chat_id bigint,
  telegram_user_id bigint,
  telegram_message_id bigint,
  telegram_file_id text,

  confidence numeric(3,2),
  raw_update jsonb,

  deleted_at timestamptz
);

create index if not exists idx_expenses_expense_date on public.expenses (expense_date desc);
create index if not exists idx_expenses_category on public.expenses (category);
create index if not exists idx_expenses_created_at on public.expenses (created_at desc);
create index if not exists idx_expenses_not_deleted on public.expenses (deleted_at) where deleted_at is null;

create unique index if not exists idx_expenses_telegram_unique_message
on public.expenses (telegram_chat_id, telegram_message_id, description, value)
where telegram_chat_id is not null and telegram_message_id is not null and deleted_at is null;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_expenses_updated_at on public.expenses;

create trigger trg_expenses_updated_at
before update on public.expenses
for each row
execute function public.set_updated_at();

alter table public.expenses enable row level security;
