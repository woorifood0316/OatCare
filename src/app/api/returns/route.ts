import { jsonError, sameOrigin, sessionUserId } from '../../../lib/api';
import { getOrderByNo } from '../../../lib/orders';
import { r2Config } from '../../../lib/r2';
import { RETURN_MAX_PHOTOS } from '../../../lib/catalog';
import { enqueue } from '../../../lib/notify';
import {
    RETURN_REASON_LABEL,
    RETURN_TYPE_LABEL,
    estimateRefund,
    insertReturn,
    listReturnsForOrder,
    refundedSoFar,
    returnWindow,
    returnableLines,
    type ReturnKind,
    type ReturnLine,
    type ReturnReason,
} from '../../../lib/returns';

export const runtime = 'edge';

const REASONS: ReturnReason[] = ['change_of_mind', 'defect', 'wrong_item'];

/** A customer asks to return or exchange (part of) a delivered order. */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('로그인이 필요해요', 401);

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }

    const order = await getOrderByNo(String(body.orderNo ?? ''), userId);
    if (!order) return jsonError('주문을 찾을 수 없어요', 404);

    const reason = String(body.reason) as ReturnReason;
    if (!REASONS.includes(reason)) return jsonError('신청 사유를 선택해 주세요');
    const type: ReturnKind = body.type === 'exchange' ? 'exchange' : 'refund';
    if (reason === 'change_of_mind' && type === 'exchange') return jsonError('단순 변심은 반품(환불)으로만 신청할 수 있어요');

    const win = returnWindow(order);
    if (!win.open) return jsonError('교환·반품을 신청할 수 있는 주문이 아니에요', 409);
    if (reason === 'change_of_mind') {
        if (!win.changeOfMind) return jsonError('단순 변심 반품은 상품을 받은 날부터 7일 이내에만 신청할 수 있어요', 409);
        if (body.unopened !== true) return jsonError('개봉하지 않은 상품인지 확인해 주세요');
    } else if (!win.defect) {
        return jsonError('신청 기간이 지났어요. 고객센터(031-998-7234)로 문의해 주세요.', 409);
    }

    const existing = await listReturnsForOrder(order.id);
    if (existing.some((r) => r.status === 'requested' || r.status === 'approved')) {
        return jsonError('이 주문은 이미 진행 중인 교환·반품 신청이 있어요', 409);
    }
    const allowed = returnableLines(order, existing);
    const raw = Array.isArray(body.items) ? body.items : [];
    const items: ReturnLine[] = [];
    for (const x of raw as Record<string, unknown>[]) {
        const line = allowed.find((l) => l.index === Number(x?.index));
        const qty = Math.floor(Number(x?.qty));
        if (!line || !(qty >= 1 && qty <= line.qty)) return jsonError('신청할 상품과 수량을 다시 확인해 주세요');
        if (items.some((i) => i.index === line.index)) return jsonError('신청할 상품과 수량을 다시 확인해 주세요');
        items.push({ index: line.index, name: line.name, qty });
    }
    if (items.length === 0) return jsonError('신청할 상품을 선택해 주세요');

    const detail = typeof body.detail === 'string' ? body.detail.trim().slice(0, 1000) : '';
    const cfg = r2Config();
    const photos = (Array.isArray(body.photos) ? body.photos : [])
        .filter((u): u is string => typeof u === 'string' && Boolean(cfg) && u.startsWith(`${cfg!.publicUrl}/returns/`))
        .slice(0, RETURN_MAX_PHOTOS);
    if (reason !== 'change_of_mind') {
        if (detail.length < 10) return jsonError('어떤 문제가 있는지 10자 이상 적어 주세요');
        if (photos.length === 0) return jsonError('상품 사진과 찍은 날짜를 확인할 수 있는 사진을 올려 주세요');
        if (body.agreedWarning !== true) return jsonError('사진 제출 안내를 확인해 주세요');
    }

    const { fee, refund } = estimateRefund(order, type, reason, items, await refundedSoFar(order.id));
    try {
        const created = await insertReturn({ order, userId, type, reason, detail, items, photos, fee, refund });
        await enqueue(
            'return_requested',
            { orderNo: order.orderNo, typeLabel: RETURN_TYPE_LABEL[type].split(' ')[0], reasonLabel: RETURN_REASON_LABEL[reason] },
            { userId },
        );
        return Response.json({ request: created });
    } catch {
        return jsonError('이 주문은 이미 진행 중인 교환·반품 신청이 있어요', 409);
    }
}
