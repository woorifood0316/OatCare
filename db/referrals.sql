-- ---- Friend invitations (친구 초대): additive only ----
-- Each member gets a code for their personal share link (?ref=CODE).
alter table users add column if not exists referral_code text;
create unique index if not exists users_referral_code on users(referral_code) where referral_code is not null;

-- A new member who signed up through someone's link. Rewarded once the friend's first order is confirmed.
create table if not exists referrals (
    id           uuid primary key default gen_random_uuid(),
    referrer_id  uuid not null references users(id) on delete cascade,
    friend_id    uuid not null references users(id) on delete cascade,
    status       text not null default 'joined' check (status in ('joined', 'rewarded', 'rejected')),
    order_id     uuid references orders(id) on delete set null,
    note         text,                       -- why it was not rewarded (shown to both)
    created_at   timestamptz not null default now(),
    decided_at   timestamptz
);
create unique index if not exists referrals_one_per_friend on referrals(friend_id);
create index if not exists referrals_referrer_idx on referrals(referrer_id, created_at desc);
create index if not exists referrals_status_idx on referrals(status);
