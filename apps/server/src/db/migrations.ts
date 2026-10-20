/** Idempotent DDL. Kept explicit so deployments can review every change. */
export const MIGRATIONS: string[] = [
  `create table if not exists mir_users (
    id text primary key,
    device_id text not null unique,
    name text,
    token_hash text not null,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists mir_saves (
    user_id text primary key references mir_users(id) on delete cascade,
    version integer not null default 0,
    state jsonb not null,
    actions jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists mir_learning_events (
    id text primary key,
    user_id text not null references mir_users(id) on delete cascade,
    vocab text not null,
    skill text not null,
    outcome real not null,
    at timestamptz not null,
    source text,
    support jsonb not null
  )`,
  `create index if not exists mir_learning_user_idx on mir_learning_events(user_id, at desc)`,
  `create table if not exists mir_dialogue_events (
    id text primary key,
    user_id text not null references mir_users(id) on delete cascade,
    dialogue_id text not null,
    node_id text not null,
    option_id text,
    accepted boolean not null,
    at timestamptz not null
  )`,
  `create index if not exists mir_dialogue_user_idx on mir_dialogue_events(user_id, at desc)`,
];
