import { cookies } from 'next/headers';
import { auth } from '../../../../auth';
import { getSql } from '../../../../lib/db';
import { jsonError, sameOrigin } from '../../../../lib/api';
import { ADMIN_SEEN_COOKIE, adminActive, adminSeenCookieOptions, sealAdminSeen } from '../../../../lib/admin-idle';

export const runtime = 'edge';

/** The admin shell calls this on every admin page view: renews the 12-hour activity cookie (only while still active). */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const session = await auth();
    const uid = session?.user?.id;
    if (!uid) return jsonError('Unauthorized', 401);
    const rows = await getSql()`select role from users where id = ${uid}`;
    if (rows[0]?.role !== 'admin') return jsonError('Forbidden', 403);
    const jar = await cookies();
    if (!(await adminActive(uid, session.authAt, jar.get(ADMIN_SEEN_COOKIE)?.value))) return jsonError('다시 로그인해 주세요', 401);
    jar.set(ADMIN_SEEN_COOKIE, await sealAdminSeen(uid), adminSeenCookieOptions);
    return Response.json({ ok: true });
}
