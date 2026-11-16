-- 내 정보: member phone, name check, email change by code, and why members leave.

-- The member's own phone (delivery addresses keep the receiver's phone separately).
alter table users add column if not exists phone text;
-- Set when the member saved a name themselves (until then it is the nickname the social login gave).
alter table users add column if not exists name_edited_at timestamptz;

-- The email each social login gave. users.email is the address the member chose for mail and can change;
-- this one stays, so a later sign-up with the same address can be pointed to the existing login.
alter table accounts add column if not exists email text;
update accounts a set email = u.email from users u where u.id = a.user_id and a.email is null and u.email is not null;
create index if not exists accounts_email_idx on accounts (lower(email));
create index if not exists users_email_idx on users (lower(email));

-- A pending email change: a 6-digit code sent to the new address (only its hash is kept), 10 minutes, 5 tries.
create table if not exists email_verifications (
    user_id uuid primary key references users(id) on delete cascade,
    email text not null,
    code_hash text not null,
    attempts int not null default 0,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

-- Why members left. Not linked to the person (no id, name or email): only the reasons, how they signed up and
-- how long they were a member.
create table if not exists withdrawal_reasons (
    id uuid primary key default gen_random_uuid(),
    reasons text[] not null default '{}',
    detail text,
    provider text,
    member_days int,
    created_at timestamptz not null default now()
);
