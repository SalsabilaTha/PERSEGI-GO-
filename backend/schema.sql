-- Skema database PERSEGI GO! untuk Supabase (PostgreSQL).
-- Catatan: Flask juga membuat tabel ini otomatis saat pertama kali berjalan
-- (backend/db.py -> init_db). File ini disediakan bila ingin membuatnya manual
-- lewat SQL Editor Supabase.

create table if not exists users (
  id            bigserial primary key,
  supabase_uid  varchar(64) unique not null,
  email         varchar(320) not null,
  name          varchar(80),
  provider      varchar(20),
  created_at    timestamptz not null default now(),
  last_login    timestamptz not null default now()
);

create table if not exists activities (
  id          bigserial primary key,
  user_id     bigint not null references users(id) on delete cascade,
  client_id   varchar(64) not null,
  type        varchar(30) not null,
  payload     json not null,
  xp          integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint uq_activity_client unique (user_id, client_id)
);
create index if not exists ix_activities_user_id on activities(user_id);

create table if not exists module_progress (
  user_id      bigint not null references users(id) on delete cascade,
  module_id    varchar(20) not null,
  step_reached integer not null default 0,
  done_at      timestamptz,
  primary key (user_id, module_id)
);

create table if not exists quiz_results (
  id          bigserial primary key,
  user_id     bigint not null references users(id) on delete cascade,
  quiz_id     varchar(30) not null,
  score       integer not null,
  total       integer not null,
  created_at  timestamptz not null default now()
);
create index if not exists ix_quiz_results_user_id on quiz_results(user_id);

create table if not exists practice_attempts (
  id          bigserial primary key,
  user_id     bigint not null references users(id) on delete cascade,
  problem_id  varchar(30) not null,
  tries       integer not null,
  hints_used  integer not null,
  errors      json not null,
  correct     boolean not null,
  effort      smallint,
  created_at  timestamptz not null default now()
);
create index if not exists ix_practice_attempts_user_id on practice_attempts(user_id);

create table if not exists tutor_messages (
  id          bigserial primary key,
  user_id     bigint not null references users(id) on delete cascade,
  problem_id  varchar(30),
  mode        varchar(10) not null,
  stage       smallint,
  phase       varchar(12),
  role        varchar(10) not null,
  content     varchar(1000) not null,
  source      varchar(10),
  created_at  timestamptz not null default now()
);
create index if not exists ix_tutor_messages_user_id on tutor_messages(user_id);

-- RLS aktif tanpa policy: tabel tidak bisa dibaca/ditulis dari browser
-- (kunci anon/authenticated). Hanya Flask yang mengakses lewat koneksi database.
alter table users             enable row level security;
alter table activities        enable row level security;
alter table module_progress   enable row level security;
alter table quiz_results      enable row level security;
alter table practice_attempts enable row level security;
alter table tutor_messages    enable row level security;
