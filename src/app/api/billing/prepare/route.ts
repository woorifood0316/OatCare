import { getSql } from '../../../../lib/db';
import { jsonError, sameOrigin, sessionUserId } from '../../../../lib/api';
import { getOrCreateCustomerKey } from '../../../../lib/orders';

export const runtime = 'edge';

/** Gives the browser the (non-guessable) customerKey it needs to open the card registration window. */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('Unauthorized', 401);

    const rows = await getSql()`select name, email from users where id = ${userId}`;
    return Response.json({
        customerKey: await getOrCreateCustomerKey(userId),
        customerName: (rows[0]?.name as string | null) ?? null,
        customerEmail: (rows[0]?.email as string | null) ?? null,
    });
}
