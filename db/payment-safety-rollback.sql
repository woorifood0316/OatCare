-- Undo db/payment-safety.sql. Run only together with reverting the code that uses it.
-- Orders still in 'checking' must be resolved first (the check below refuses otherwise).

do $$
begin
    if exists (select 1 from orders where status = 'checking') then
        raise exception 'orders in checking status exist: resolve them before rolling back';
    end if;
end $$;

drop index if exists orders_checking_idx;
drop index if exists orders_sub_round_paid;
drop index if exists orders_sub_round_open;
alter table orders drop column if exists charge_no;

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
    check (status in ('pending', 'paid', 'preparing', 'shipped', 'delivered', 'canceled', 'failed'));
