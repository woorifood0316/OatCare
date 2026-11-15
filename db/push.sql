-- ---- App notifications (web push) ----
-- One row per device that allowed notifications. Order / delivery notices go to every device of the member;
-- event / benefit pushes only when the member also has the marketing consent (users.marketing_agreed).
create table if not exists push_subscriptions (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references users(id) on delete cascade,
    endpoint    text not null unique,
    p256dh      text not null,
    auth        text not null,
    user_agent  text,
    created_at  timestamptz not null default now(),
    last_ok_at  timestamptz
);
create index if not exists push_subscriptions_user on push_subscriptions(user_id);

-- notifications.channel gains 'push'
alter table notifications drop constraint if exists notifications_channel_check;
alter table notifications add constraint notifications_channel_check check (channel in ('email', 'admin', 'push'));
