-- ---- Reviews, review event coupons, violations (additive: new tables and columns only) ----
create table if not exists reviews (
    id               uuid primary key default gen_random_uuid(),
    user_id          uuid references users(id) on delete set null,
    order_id         uuid references orders(id) on delete set null,
    subscription_id  uuid references subscriptions(id) on delete set null,
    sku              text not null,
    rating           int not null check (rating between 1 and 5),
    body             text not null,
    photos           jsonb not null default '[]'::jsonb,
    author_name      text not null,
    event_joined     boolean not null default false,
    reward_amount    int not null default 0,
    reward_coupon_id uuid references coupons(id) on delete set null,
    status           text not null default 'visible' check (status in ('visible', 'deleted')),
    deleted_category text check (deleted_category in ('profanity', 'privacy', 'ad', 'other')),
    deleted_reason   text,
    deleted_at       timestamptz,
    created_at       timestamptz not null default now()
);
create index if not exists reviews_sku_idx on reviews(sku, status, created_at desc);
create index if not exists reviews_user_idx on reviews(user_id);
create unique index if not exists reviews_one_per_order_item on reviews(order_id, sku) where subscription_id is null and order_id is not null;
create unique index if not exists reviews_one_per_subscription on reviews(subscription_id) where subscription_id is not null;

alter table users add column if not exists review_strikes int not null default 0;
alter table users add column if not exists review_banned_at timestamptz;

create table if not exists banned_accounts (
    provider            text not null,
    provider_account_id text not null,
    reason              text,
    created_at          timestamptz not null default now(),
    primary key (provider, provider_account_id)
);
