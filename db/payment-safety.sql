-- Payment safety: no double charge on a subscription round, and a "결과 확인 중" state when the payment result is unknown.
-- Rollback: db/payment-safety-rollback.sql

-- 1) A new order status: the payment company did not give a clear answer (timeout / 5xx) and the status lookup
--    did not either. The order keeps its coupon and is looked up again by the job until it is paid or failed.
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
    check (status in ('pending', 'checking', 'paid', 'preparing', 'shipped', 'delivered', 'canceled', 'failed'));

-- 2) Which round of its subscription a subscription order pays (1 = first charge, 2 = second, ...).
--    Every try for one round is its own order row (a declined card and the later successful retry both stay),
--    but the database allows only ONE unresolved try and only ONE approved payment per round.
alter table orders add column if not exists charge_no int;

-- existing subscription orders: number the approved ones in order, per subscription
update orders o set charge_no = x.n
from (
    select id, row_number() over (partition by subscription_id order by created_at) as n
    from orders
    where kind = 'subscription' and subscription_id is not null and status in ('paid', 'preparing', 'shipped', 'delivered')
) x
where o.id = x.id and o.charge_no is null;

create unique index if not exists orders_sub_round_open
    on orders (subscription_id, charge_no) where charge_no is not null and status in ('pending', 'checking');
create unique index if not exists orders_sub_round_paid
    on orders (subscription_id, charge_no) where charge_no is not null and status in ('paid', 'preparing', 'shipped', 'delivered');

-- 3) The job finds orders waiting for a result quickly.
create index if not exists orders_checking_idx on orders (updated_at) where status = 'checking';
