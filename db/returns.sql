-- ---- Exchange / return requests made from 마이페이지 (additive: new table and column only) ----
create table if not exists return_requests (
    id              uuid primary key default gen_random_uuid(),
    order_id        uuid not null references orders(id) on delete cascade,
    user_id         uuid references users(id) on delete set null,
    type            text not null check (type in ('refund', 'exchange')),
    reason          text not null check (reason in ('change_of_mind', 'defect', 'wrong_item')),
    detail          text not null default '',
    items           jsonb not null default '[]'::jsonb,   -- [{ index, name, qty }]
    photos          jsonb not null default '[]'::jsonb,
    return_fee      int not null default 0,               -- deducted from the refund (단순 변심)
    refund_estimate int not null default 0,
    refund_amount   int,                                  -- actually refunded
    status          text not null default 'requested'
                    check (status in ('requested', 'approved', 'completed', 'rejected', 'withdrawn')),
    admin_note      text,
    reject_reason   text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    completed_at    timestamptz
);
create index if not exists return_requests_order_idx on return_requests(order_id);
create index if not exists return_requests_status_idx on return_requests(status, created_at desc);
-- one open request per order at a time
create unique index if not exists return_requests_one_open on return_requests(order_id) where status in ('requested', 'approved');
