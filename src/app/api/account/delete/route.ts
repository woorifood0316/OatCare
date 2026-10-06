import { auth, signOut } from '../../../../auth';
import { getSql } from '../../../../lib/db';
import { sameOrigin } from '../../../../lib/api';

export const runtime = 'edge';

/**
 * Withdraw the account.
 *  - Blocked while an order is still being fulfilled (paid / preparing / shipped).
 *  - Deleted right away: profile, linked logins, cart, addresses, saved cards, subscriptions.
 *  - Kept (legal retention, user_id is cleared): order and payment records.
 */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return new Response('Forbidden', { status: 403 });

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const sql = getSql();
    const open = await sql`
        select 1 from orders where user_id = ${userId} and status in ('paid', 'preparing', 'shipped') limit 1
    `;
    if (open.length > 0) {
        return new Response(null, { status: 303, headers: { Location: new URL('/mypage/profile?withdraw=blocked', request.url).toString() } });
    }

    // Stop recurring charges first, then remove the account (cascades to cards, addresses, cart, logins).
    await sql.transaction([
        sql`update subscriptions set status = 'canceled', canceled_at = now(), cancel_reason = '회원 탈퇴'
            where user_id = ${userId} and status <> 'canceled'`,
        sql`delete from users where id = ${userId}`,
    ]);

    await signOut({ redirectTo: '/?withdrawn=1' });
}
