import { jsonError, sameOrigin, sessionUserId } from '../../../../lib/api';
import { confirmEmailChange, startEmailChange } from '../../../../lib/profile';

export const runtime = 'edge';

/** 내 정보: change the email. { action: 'send', email } mails a code; { action: 'verify', code } saves the address. */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const uid = await sessionUserId();
    if (!uid) return jsonError('로그인이 필요해요', 401);

    let body: { action?: unknown; email?: unknown; code?: unknown };
    try {
        body = await request.json();
    } catch {
        return jsonError('Bad Request');
    }
    const r =
        body.action === 'send' && typeof body.email === 'string'
            ? await startEmailChange(uid, body.email)
            : body.action === 'verify' && typeof body.code === 'string'
              ? await confirmEmailChange(uid, body.code)
              : null;
    if (!r) return jsonError('Bad Request');
    if (!r.ok) return jsonError(r.error);
    return Response.json(r);
}
