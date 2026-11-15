-- ---- Admin access log (additive: one new table) ----
-- 개인정보의 안전성 확보조치 기준: keep a record of who accessed personal data, when and what (at least 1 year;
-- this site keeps 2 years), and check it regularly. Every request to /admin and /api/admin is written here by
-- src/middleware.ts, including refused ones (not logged in, not an admin, idle for 12 hours).
create table if not exists admin_access_log (
    id          bigserial primary key,
    at          timestamptz not null default now(),
    user_id     uuid references users(id) on delete set null,
    -- 'allowed' | 'anonymous' (not logged in) | 'not_admin' | 'idle' (12 hours without use)
    outcome     text not null,
    method      text not null,
    path        text not null,
    ip          text,
    country     text,
    user_agent  text
);
create index if not exists admin_access_log_at on admin_access_log(at desc);
create index if not exists admin_access_log_refused on admin_access_log(at desc) where outcome <> 'allowed';
