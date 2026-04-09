create extension if not exists pgcrypto;

create table if not exists parent_users (
    id uuid primary key default gen_random_uuid(),
    email varchar(320) not null unique,
    password_hash varchar(255) not null,
    is_email_verified boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_parent_users_email on parent_users (email);

create table if not exists auth_sessions (
    id uuid primary key default gen_random_uuid(),
    parent_user_id uuid not null references parent_users(id) on delete cascade,
    token_hash varchar(64) not null unique,
    remember_me boolean not null default false,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_auth_sessions_parent_user on auth_sessions (parent_user_id);
create index if not exists idx_auth_sessions_expires_at on auth_sessions (expires_at);

create table if not exists email_verification_tokens (
    id uuid primary key default gen_random_uuid(),
    parent_user_id uuid not null references parent_users(id) on delete cascade,
    token_hash varchar(64) not null unique,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_email_verification_tokens_parent_user on email_verification_tokens (parent_user_id);
create index if not exists idx_email_verification_tokens_expires_at on email_verification_tokens (expires_at);

create table if not exists password_reset_tokens (
    id uuid primary key default gen_random_uuid(),
    parent_user_id uuid not null references parent_users(id) on delete cascade,
    token_hash varchar(64) not null unique,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_tokens_parent_user on password_reset_tokens (parent_user_id);
create index if not exists idx_password_reset_tokens_expires_at on password_reset_tokens (expires_at);