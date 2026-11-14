import { isUuid, jsonError, requireAdmin, sameOrigin } from '../../../../lib/api';
import { TEST_KINDS, resendNotifications, sendTestEmails } from '../../../../lib/admin-notifications';
import type { NotifyEvent } from '../../../../lib/notify';

export const runtime = 'edge';

/** resend { ids } - send chosen notifications again; test { to, kinds } - send sample customer emails to one address. */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    if (!(await requireAdmin())) return jsonError('Forbidden', 403);
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    if (body.action === 'resend') {
        const ids = (Array.isArray(body.ids) ? body.ids : []).filter(isUuid).slice(0, 200);
        if (ids.length === 0) return jsonError('다시 보낼 알림을 선택해 주세요');
        return Response.json(await resendNotifications(ids));
    }
    if (body.action === 'test') {
        const to = typeof body.to === 'string' ? body.to.trim() : '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return jsonError('받을 이메일 주소를 확인해 주세요');
        const kinds = (Array.isArray(body.kinds) ? body.kinds : TEST_KINDS).filter((k): k is NotifyEvent => TEST_KINDS.includes(k as NotifyEvent));
        if (kinds.length === 0) return jsonError('보낼 메일 종류를 골라 주세요');
        return Response.json(await sendTestEmails(to, kinds));
    }
    return jsonError('알 수 없는 요청이에요');
}
