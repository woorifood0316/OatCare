-- ---- Coupons that wait for the event/benefit notification consent (additive: new columns and an index only) ----
-- Review-event and friend-invitation coupons of members who have not turned the notifications on are kept as
-- "받을 준비 중" (pending) for 30 days; turning the notifications on issues them. Issued coupons are never taken back
-- when the member later turns the notifications off.
alter table coupons add column if not exists pending boolean not null default false;
alter table coupons add column if not exists pending_until timestamptz;

-- The sign-up coupon is 1,000원; with the notification consent it becomes 3,000원 - once per member.
alter table users add column if not exists welcome_bonus_at timestamptz;
create unique index if not exists coupons_one_welcome_bonus_per_user on coupons(user_id) where source = 'welcome_bonus';
