-- Commerce tables (cart, addresses, cards, subscriptions, orders, notifications).
-- Additive and idempotent. Run after schema.sql.

alter table users add column if not exists toss_customer_key text unique;

-- Logged-in customers' carts (guests keep theirs in the browser).
create table if not exists carts (
    user_id    uuid primary key references users(id) on delete cascade,
    lines      jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now()
);

create table if not exists addresses (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references users(id) on delete cascade,
    label      text,
    recipient  text not null,
    phone      text not null,
    zipcode    text,
    address1   text not null,
    address2   text,
    is_default boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists addresses_user_idx on addresses(user_id);

-- Card billing keys are stored encrypted (AES-GCM); card numbers are never stored.
create table if not exists payment_methods (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references users(id) on delete cascade,
    billing_key_enc text not null,
    card_company    text,
    card_number     text,
    card_type       text,
    is_default      boolean not null default false,
    created_at      timestamptz not null default now()
);
create index if not exists payment_methods_user_idx on payment_methods(user_id);

create table if not exists subscriptions (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null references users(id) on delete cascade,
    status            text not null default 'active' check (status in ('active', 'paused', 'past_due', 'canceled')),
    items             jsonb not null,
    cycle_days        int not null,
    next_billing_date date not null,
    skip_next         boolean not null default false,
    fail_count        int not null default 0,
    payment_method_id uuid references payment_methods(id) on delete set null,
    ship_name         text,
    ship_phone        text,
    ship_zip          text,
    ship_address1     text,
    ship_address2     text,
    last_billed_at    timestamptz,
    canceled_at       timestamptz,
    cancel_reason     text,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on subscriptions(user_id);
create index if not exists subscriptions_due_idx on subscriptions(status, next_billing_date);

-- Orders outlive a withdrawn account (legal retention): user_id is set to null on delete.
create table if not exists orders (
    id              uuid primary key default gen_random_uuid(),
    order_no        text not null unique,
    user_id         uuid references users(id) on delete set null,
    kind            text not null check (kind in ('once', 'subscription')),
    subscription_id uuid references subscriptions(id) on delete set null,
    status          text not null default 'pending'
                    check (status in ('pending', 'paid', 'preparing', 'shipped', 'delivered', 'canceled', 'failed')),
    items           jsonb not null,
    subtotal        int not null,
    shipping_fee    int not null default 0,
    amount          int not null,
    ship_name       text,
    ship_phone      text,
    ship_zip        text,
    ship_address1   text,
    ship_address2   text,
    ship_memo       text,
    payment_key     text,
    key_type        text check (key_type in ('widget', 'api')),
    payment_label   text,
    paid_at         timestamptz,
    carrier         text,
    tracking_no     text,
    shipped_at      timestamptz,
    delivered_at    timestamptz,
    canceled_at     timestamptz,
    cancel_reason   text,
    fail_reason     text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create index if not exists orders_user_idx on orders(user_id, created_at desc);
create index if not exists orders_status_idx on orders(status, created_at desc);

create table if not exists billing_attempts (
    id              uuid primary key default gen_random_uuid(),
    subscription_id uuid references subscriptions(id) on delete cascade,
    order_id        uuid references orders(id) on delete set null,
    ok              boolean not null,
    error_code      text,
    error_message   text,
    attempted_at    timestamptz not null default now()
);
create index if not exists billing_attempts_sub_idx on billing_attempts(subscription_id, attempted_at desc);

-- Outbox: events are queued here and sent by channel-specific senders.
create table if not exists notifications (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid references users(id) on delete set null,
    channel    text not null check (channel in ('email', 'admin')),
    event      text not null,
    payload    jsonb not null default '{}'::jsonb,
    status     text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
    attempts   int not null default 0,
    error      text,
    created_at timestamptz not null default now(),
    sent_at    timestamptz
);
create index if not exists notifications_status_idx on notifications(status, created_at);

alter table subscriptions add column if not exists processing_at timestamptz;

alter table subscriptions add column if not exists reminded_for date;
