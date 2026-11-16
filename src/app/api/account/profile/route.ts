import { auth } from '../../../../auth';
import { jsonError, sameOrigin } from '../../../../lib/api';
import { freshLogin, saveName, savePhone } from '../../../../lib/profile';

export const runtime = 'edge';

/** 내 정보: change the name or the phone. Needs a login from the last 10 minutes (the member signs in again). */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const session = await auth();
    const uid = session?.user?.id;
    if (!uid) return jsonError('로그인이 필요해요', 401);
    if (!freshLogin(session.authAt)) return jsonError('본인 확인을 위해 다시 로그인해 주세요.', 403, { reauth: true });

    let body: { field?: unknown; value?: unknown };
    try {
        body = await request.json();
    } catch {
        return jsonError('Bad Request');
    }
    const value = typeof body.value === 'string' ? body.value : '';
    const r = body.field === 'name' ? await saveName(uid, value) : body.field === 'phone' ? await savePhone(uid, value) : null;
    if (!r) return jsonError('Bad Request');
    if (!r.ok) return jsonError(r.error);
    return Response.json(r);
}
