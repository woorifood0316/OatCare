// Friend invitation (친구 초대):
//  1. Every member has a personal code; their share links carry ?ref=CODE.
//  2. A visitor who arrives through such a link and signs up as a NEW member is recorded as that member's friend.
//  3. When the friend's first order is confirmed (received + REFERRAL_CONFIRM_DAYS with no cancel/return), both get
//     a REFERRAL_REWARD coupon - unless two or more of name, phone, address and email are the same as one existing
//     member's (the referrer included). No limit on how many friends one member invites.
import { getSql } from './db';
import { COUPON_VALID_DAYS, REFERRAL_CONFIRM_DAYS, REFERRAL_COUPON_NAME, REFERRAL_REWARD, WELCOME_COUPON_MIN_COUNT } from './catalog';

export const REF_PARAM = 'ref';
export const REF_COOKIE = 'oc_ref';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(7)), (b) => ALPHABET[b % ALPHABET.length]).join('');
export const isCode = (v: unknown): v is string => typeof v === 'string' && /^[A-Z2-9]{7}$/.test(v);

/** The member's invitation code (made on first use). */
export async function getReferralCode(userId: string): Promise<string> {
    const sql = getSql();
    const rows = await sql`select referral_code from users where id = ${userId}`;
    const existing = rows[0]?.referral_code as string | null | undefined;
    if (existing) return existing;
    for (let i = 0; i < 5; i++) {
        try {
            const code = newCode();
            const set = await sql`update users set referral_code = ${code} where id = ${userId} and referral_code is null returning referral_code`;
            if (set.length > 0) return code;
            const again = await sql`select referral_code from users where id = ${userId}`;
            if (again[0]?.referral_code) return again[0].referral_code as string;
        } catch {
            /* code taken: try another */
        }
    }
    throw new Error('referral code');
}

/** Called right after a NEW member was created: link them to whoever's invitation link they came through. */
export async function recordReferral(friendId: string, code: string | undefined): Promise<void> {
    if (!isCode(code)) return;
    try {
        const sql = getSql();
        const ref = await sql`select id from users where referral_code = ${code}`;
        const referrerId = ref[0]?.id as string | undefined;
        if (!referrerId || referrerId === friendId) return;
        await sql`insert into referrals (referrer_id, friend_id) values (${referrerId}, ${friendId}) on conflict do nothing`;
    } catch (e) {
        console.error('[referral] record failed', e);
    }
}

async function giveCoupon(userId: string) {
    await getSql()`
        insert into coupons (user_id, source, name, amount, min_order, expires_at)
        values (${userId}, 'referral', ${REFERRAL_COUPON_NAME}, ${REFERRAL_REWARD}, ${WELCOME_COUPON_MIN_COUNT}, now() + (${COUPON_VALID_DAYS} || ' days')::interval)
    `;
}

const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '');
const nm = (v: unknown) => String(v ?? '').replace(/\s/g, '');
const addr = (a: unknown, b: unknown) => `${a ?? ''}${b ?? ''}`.replace(/\s/g, '').toLowerCase();

/**
 * Daily job: decide the invitations whose friend's first order is now confirmed.
 * First order = the friend's earliest order that was paid and not canceled.
 */
export async function runReferralRewards(limit = 50): Promise<{ rewarded: number; rejected: number }> {
    const sql = getSql();
    const tally = { rewarded: 0, rejected: 0 };
    let open: Record<string, unknown>[] = [];
    try {
        open = await sql`select id, referrer_id, friend_id from referrals where status = 'joined' order by created_at asc limit ${limit}`;
    } catch {
        return tally; // table not created yet
    }
    for (const r of open) {
        const orders = await sql`
            select id, status, ship_name, ship_phone, ship_address1, ship_address2, shipped_at, delivered_at
            from orders where user_id = ${r.friend_id} and status in ('paid', 'preparing', 'shipped', 'delivered')
            order by paid_at asc nulls last, created_at asc limit 1
        `;
        const o = orders[0];
        if (!o || (o.status !== 'shipped' && o.status !== 'delivered')) continue;
        const received = o.delivered_at ? new Date(o.delivered_at as string) : o.shipped_at ? new Date(new Date(o.shipped_at as string).getTime() + 2 * 86400000) : null;
        if (!received || Date.now() < received.getTime() + REFERRAL_CONFIRM_DAYS * 86400000) continue;

        const returns = await sql`select 1 from return_requests where order_id = ${o.id} and status in ('requested', 'approved', 'completed') limit 1`.catch(() => []);
        let reason: string | null = returns.length > 0 ? '첫 주문에 교환·반품 신청이 있어요' : null;

        if (!reason) {
            // Same person under another account? Compare name, phone, address and email with each other member
            // (the referrer included): two or more of them the same as one member = not a new friend.
            const friend = await sql`select name, email from users where id = ${r.friend_id}`;
            const names = [o.ship_name, friend[0]?.name].map(nm).filter(Boolean);
            const phone = digits(o.ship_phone);
            const address = addr(o.ship_address1, o.ship_address2);
            const email = String(friend[0]?.email ?? '').trim().toLowerCase();
            const fid = r.friend_id as string;
            const same = await sql`
                select uid from (
                    select id as uid, 'email' as kind from users where id <> ${fid} and ${email} <> '' and lower(email) = ${email}
                    union select user_id, 'phone' from addresses where user_id <> ${fid} and ${phone} <> '' and regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = ${phone}
                    union select user_id, 'phone' from orders where user_id <> ${fid} and status <> 'pending' and ${phone} <> '' and regexp_replace(coalesce(ship_phone, ''), '\\D', '', 'g') = ${phone}
                    union select user_id, 'address' from addresses where user_id <> ${fid} and ${address} <> '' and lower(regexp_replace(coalesce(address1, '') || coalesce(address2, ''), '\\s', '', 'g')) = ${address}
                    union select user_id, 'address' from orders where user_id <> ${fid} and status <> 'pending' and ${address} <> '' and lower(regexp_replace(coalesce(ship_address1, '') || coalesce(ship_address2, ''), '\\s', '', 'g')) = ${address}
                    union select id, 'name' from users where id <> ${fid} and regexp_replace(coalesce(name, ''), '\\s', '', 'g') = any(${names})
                    union select user_id, 'name' from addresses where user_id <> ${fid} and regexp_replace(coalesce(recipient, ''), '\\s', '', 'g') = any(${names})
                    union select user_id, 'name' from orders where user_id <> ${fid} and status <> 'pending' and regexp_replace(coalesce(ship_name, ''), '\\s', '', 'g') = any(${names})
                ) x
                where uid is not null
                group by uid having count(distinct kind) >= 2
                limit 1
            `;
            if (same.length > 0) reason = '이름·전화번호·주소·이메일 중 2가지 이상이 기존 회원과 같아요';
        }

        if (reason) {
            await sql`update referrals set status = 'rejected', order_id = ${o.id}, note = ${reason}, decided_at = now() where id = ${r.id} and status = 'joined'`;
            tally.rejected++;
            continue;
        }
        const done = await sql`update referrals set status = 'rewarded', order_id = ${o.id}, decided_at = now() where id = ${r.id} and status = 'joined' returning id`;
        if (done.length === 0) continue;
        await giveCoupon(r.referrer_id as string);
        await giveCoupon(r.friend_id as string);
        tally.rewarded++;
    }
    return tally;
}

export interface MyReferral {
    friendName: string;
    status: 'joined' | 'rewarded' | 'rejected';
    note: string | null;
    joinedAt: string;
    decidedAt: string | null;
}

/** People this member invited (names masked) + whether this member was invited by someone. */
export async function myReferrals(userId: string): Promise<{ invited: MyReferral[]; invitedBy: MyReferral | null }> {
    const sql = getSql();
    const mask = (n: unknown) => {
        const s = [...String(n ?? '').trim()];
        if (s.length === 0) return '회원';
        if (s.length <= 2) return `${s[0]}*`;
        return `${s[0]}${'*'.repeat(s.length - 2)}${s[s.length - 1]}`;
    };
    const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
    const rows = await sql`
        select r.status, r.note, r.created_at, r.decided_at, u.name from referrals r join users u on u.id = r.friend_id
        where r.referrer_id = ${userId} order by r.created_at desc limit 200
    `;
    const mine = await sql`
        select r.status, r.note, r.created_at, r.decided_at, u.name from referrals r join users u on u.id = r.referrer_id
        where r.friend_id = ${userId}
    `;
    const map = (r: Record<string, unknown>): MyReferral => ({
        friendName: mask(r.name),
        status: r.status as MyReferral['status'],
        note: (r.note as string | null) ?? null,
        joinedAt: iso(r.created_at) as string,
        decidedAt: iso(r.decided_at),
    });
    return { invited: rows.map(map), invitedBy: mine[0] ? map(mine[0]) : null };
}
