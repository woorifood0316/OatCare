-- ---- Product Q&A with FAQ-based automatic answers (additive: new tables only) ----
create table if not exists faqs (
    id          uuid primary key default gen_random_uuid(),
    question    text not null,                 -- a typical way the question is asked
    keywords    text not null default '',      -- other words customers use (space separated)
    answer      text not null,
    sku         text,                          -- null = applies to every product
    active      boolean not null default true,
    hits        int not null default 0,        -- times used for an automatic answer
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);
create index if not exists faqs_active_idx on faqs(active);

create table if not exists inquiries (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid references users(id) on delete set null,
    sku          text not null,
    body         text not null,
    secret       boolean not null default false,
    author_name  text not null,
    status       text not null default 'pending' check (status in ('pending', 'answered', 'hidden')),
    answer       text,
    answered_by  text check (answered_by in ('ai', 'admin')),
    faq_id       uuid references faqs(id) on delete set null,
    ai_note      text,                          -- why the automatic answer was or wasn't given (admin only)
    hidden_reason text,
    answered_at  timestamptz,
    created_at   timestamptz not null default now()
);
create index if not exists inquiries_sku_idx on inquiries(sku, created_at desc);
create index if not exists inquiries_user_idx on inquiries(user_id, created_at desc);
create index if not exists inquiries_status_idx on inquiries(status, created_at);

-- Label-based answers (lib/product-facts) are written by code: auto_key identifies them so a re-sync updates them.
alter table faqs add column if not exists auto_key text;
create unique index if not exists faqs_auto_key on faqs(auto_key);
