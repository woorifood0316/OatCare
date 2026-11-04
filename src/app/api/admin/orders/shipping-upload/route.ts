import { getSql } from '../../../../../lib/db';
import { jsonError, requireAdmin, sameOrigin } from '../../../../../lib/api';
import { enqueue } from '../../../../../lib/notify';
import {
    MAX_UPLOAD_BYTES,
    buildErrorWorkbook,
    checkRows,
    parseWaybillUpload,
    parseUpload,
    type CheckedRow,
    type OrderLite,
} from '../../../../../lib/shipping-excel';

export const runtime = 'edge';

/**
 * Bulk tracking-number upload (form B), multipart/form-data:
 *   file       .xls / .xlsx
 *   mode       preview (default) | commit | errors
 *   overwrite  "1" to also update orders that already have a tracking number (commit only)
 *   format     naver (default: 상품주문번호/배송방법/택배사/송장번호 form) | togle (TOGLE waybill file) | lotte (롯데택배 출고 내역)
 * The file is parsed and re-validated on every call, so the browser never has to be trusted with the result.
 */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const admin = await requireAdmin();
    if (!admin) return jsonError('Forbidden', 403);

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return jsonError('파일을 받지 못했어요');
    }
    const file = form.get('file');
    if (!(file instanceof File)) return jsonError('엑셀 파일을 선택해 주세요');
    if (file.size > MAX_UPLOAD_BYTES) return jsonError('파일이 너무 커요 (최대 5MB)');
    const mode = String(form.get('mode') ?? 'preview');
    const overwrite = form.get('overwrite') === '1';

    const format = String(form.get('format') ?? 'naver');
    let parsed;
    if (format === 'togle' || format === 'lotte') {
        parsed = parseWaybillUpload(new Uint8Array(await file.arrayBuffer()), format);
    } else {
        parsed = parseUpload(new Uint8Array(await file.arrayBuffer()));
    }
    if (!parsed.ok) return jsonError(parsed.error);

    const sql = getSql();
    const found = (await sql`select order_no, status, carrier, tracking_no from orders where order_no = any(${parsed.rows.map((r) => r.orderNo)})`) as {
        order_no: string;
        status: string;
        carrier: string | null;
        tracking_no: string | null;
    }[];
    const orders = new Map<string, OrderLite>(
        found.map((o) => [o.order_no, { orderNo: o.order_no, status: o.status, carrier: o.carrier, trackingNo: o.tracking_no }]),
    );
    const checked = checkRows(parsed.rows, orders);
    const summary = {
        total: checked.length,
        ok: checked.filter((r) => r.state === 'ok').length,
        already: checked.filter((r) => r.state === 'already').length,
        error: checked.filter((r) => r.state === 'error').length,
        skip: checked.filter((r) => r.state === 'skip').length,
    };

    if (mode === 'errors') {
        if (summary.error === 0) return jsonError('오류 행이 없어요', 404);
        return new Response(buildErrorWorkbook(checked), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="tracking_upload_errors.xlsx"; filename*=UTF-8''${encodeURIComponent('송장번호_업로드_오류목록.xlsx')}`,
                'Cache-Control': 'no-store',
            },
        });
    }

    if (mode !== 'commit') return Response.json({ summary, rows: checked });

    // ---- commit: apply every ok row (and the already-shipped ones when overwrite is on) in one transaction ----
    const targets: CheckedRow[] = checked.filter((r) => r.state === 'ok' || (overwrite && r.state === 'already'));
    if (targets.length === 0) return jsonError('등록할 수 있는 행이 없어요', 409);
    await sql.transaction(
        targets.map(
            (r) => sql`update orders set status = 'shipped', carrier = ${r.carrierName}, tracking_no = ${r.tracking},
                       shipped_at = coalesce(shipped_at, now()), updated_at = now()
                       where order_no = ${r.orderNo} and status in ('paid','preparing','shipped')`,
        ),
    );
    // Customers are told once, when the order first becomes "shipped".
    const owners = (await sql`select order_no, user_id from orders where order_no = any(${targets.map((r) => r.orderNo)})`) as {
        order_no: string;
        user_id: string | null;
    }[];
    const userOf = new Map(owners.map((o) => [o.order_no, o.user_id]));
    for (const r of targets) {
        if (r.state !== 'ok') continue;
        await enqueue('order_shipped', { orderNo: r.orderNo, carrier: r.carrierName, trackingNo: r.tracking ?? '' }, { userId: userOf.get(r.orderNo) ?? null });
    }
    console.info('[admin-tracking-upload]', JSON.stringify({ admin: admin.id, applied: targets.length, overwrite }));
    return Response.json({ summary, applied: targets.length, skipped: checked.length - targets.length - summary.skip, others: summary.skip });
}
