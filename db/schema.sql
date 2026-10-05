-- OatCare 회원 DB 스키마 (Neon Postgres)
-- Neon 콘솔 > SQL Editor 에서 한 번 실행하세요.

create table if not exists users (
    id                uuid primary key default gen_random_uuid(),
    name              text,
    email             text,                       -- 선택 수집. 계정 식별에는 사용하지 않음
    terms_agreed_at   timestamptz not null,
    privacy_agreed_at timestamptz not null,
    marketing_agreed  boolean not null default false,
    marketing_updated_at timestamptz,
    role              text not null default 'user' check (role in ('user', 'admin')),
    created_at        timestamptz not null default now(),
    last_login_at     timestamptz not null default now()
);

create table if not exists accounts (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null references users(id) on delete cascade,
    provider            text not null check (provider in ('google', 'kakao', 'naver')),
    provider_account_id text not null,
    created_at          timestamptz not null default now(),
    unique (provider, provider_account_id)
);

create index if not exists accounts_user_id_idx on accounts(user_id);
