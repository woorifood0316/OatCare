import { auth, signOut } from '../../../../auth';
import { getSql } from '../../../../lib/db';
import { sameOrigin } from '../../../../lib/api';
import { MIN_SUBSCRIPTION_CHARGES } from '../../../../lib/catalog';
import { WITHDRAW_DETAIL_MAX, WITHDRAW_REASONS, withdrawWord } from '../../../../lib/profile-rules';

export const runtime = 'edge';

/**
 * Withdraw the account.
 *  - Blocked while an order is still being fulfilled (paid / preparing / shipped).
 *  - Deleted right away: profile, linked logins, cart, addresses, saved cards, subscriptions.
 *  - Kept (legal retention, user_id is cleared): order and payment records.
 *  - The member types their name (or "탈퇴합니다") to confirm; the reasons they picked are kept without who they were.
 */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return new Response('Forbidden', { status: 403 });

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const back = (code: string) => new Response(null, { status: 303, headers: { Location: new URL(`/mypage/profile?withdraw=${code}#withdraw`, request.url).toString() } });
    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return back('confirm');
    }
    const sql = getSql();
    const me = await sql`
        select u.name, u.created_at, (select provider from accounts a where a.user_id = u.id order by a.created_at limit 1) as provider
        from users u where u.id = ${userId}
    `;
    if (!me[0]) return back('confirm');
    const typed = String(form.get('confirm') ?? '').replace(/s+/g, ' ').trim();
    if (typed !== withdrawWord(me[0].name as string | null)) return back('confirm');
    const reasons = form.getAll('reason').map(String).filter((r) => (WITHDRAW_REASONS as readonly string[]).includes(r));
    const detail = String(form.get('detail') ?? '').trim().slice(0, WITHDRAW_DETAIL_MAX) || null;
    const memberDays = Math.floor((Date.now() - new Date(me[0].created_at as string).getTime()) / 86_400_000);

    const open = await sql`
        select 1 from orders where user_id = ${userId} and status in ('paid', 'preparing', 'shipped') limit 1
    `;
    if (open.length > 0) {
        return back('blocked');
    }

    // Withdrawing must not be a way around the minimum subscription period.
    const minimum = await sql`
        select 1 from subscriptions where user_id = ${userId} and status <> 'canceled' and paid_count < ${MIN_SUBSCRIPTION_CHARGES} limit 1
    `;
    if (minimum.length > 0) {
        return back('min_period');
    }

    // Stop recurring charges first, then remove the account (cascades to cards, addresses, cart, logins).
    await sql.transaction([
        sql`update subscriptions set status = 'canceled', canceled_at = now(), cancel_reason = '회원 탈퇴'
            where user_id = ${userId} and status <> 'canceled'`,
        sql`insert into withdrawal_reasons (reasons, detail, provider, member_days) values (${reasons}, ${detail}, ${(me[0].provider as string | null) ?? null}, ${memberDays})`,
        sql`delete from users where id = ${userId}`,
    ]);

    await signOut({ redirectTo: '/?withdrawn=1' });
}
