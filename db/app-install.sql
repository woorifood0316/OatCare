-- ---- Home-screen app, sign-up coupon steps and login sessions (additive; the unused welcome_bonus_at column is dropped) ----
-- Sign-up coupon steps (each once per member):
--   sign up 1,000원 -> open the home-screen app: raised to 3,000원 (a separate 2,000원 coupon when it cannot be raised)
--   -> turn the event/benefit notifications on: a separate 3,000원 coupon.
alter table users add column if not exists app_installed_at timestamptz;
alter table users drop column if exists welcome_bonus_at;
create unique index if not exists coupons_one_consent_per_user on coupons(user_id) where source = 'consent';

-- "모든 기기에서 로그아웃": every login carries this number; raising it ends every session of the member.
alter table users add column if not exists session_version integer not null default 0;

-- One-time login hand-over from an app's built-in browser (KakaoTalk, Naver app) to Chrome/Safari, where the
-- site can be added to the home screen. Only the SHA-256 of the token is stored; it lasts 3 minutes and works once.
create table if not exists login_handoffs (
    token_hash  text primary key,
    user_id     uuid not null references users(id) on delete cascade,
    expires_at  timestamptz not null,
    used_at     timestamptz,
    created_at  timestamptz not null default now()
);
create index if not exists login_handoffs_expires on login_handoffs(expires_at);
