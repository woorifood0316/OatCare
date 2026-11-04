import { getSql } from '../../../../lib/db';
import { addDays, jsonError, requireAdmin, sameOrigin, todayKst } from '../../../../lib/api';
import { listShipOverrides } from '../../../../lib/ship-calendar';

export const runtime = 'edge';

const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

export async function GET() {
    if (!(await requireAdmin())) return jsonError('Forbidden', 403);
    return Response.json({ rows: await listShipOverrides(addDays(todayKst(), -62), addDays(todayKst(), 730)) });
}

/** Set a day as closed (no shipping) or open (ship despite an automatic holiday). */
export async function PUT(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const admin = await requireAdmin();
    if (!admin) return jsonError('Forbidden', 403);
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    const { day, kind } = body;
    if (!isDay(day)) return jsonError('날짜를 확인해 주세요');
    if (day < addDays(todayKst(), -31) || day > addDays(todayKst(), 730)) return jsonError('지난달부터 2년 이내의 날짜만 지정할 수 있어요');
    if (kind !== 'closed' && kind !== 'open') return jsonError('휴무 또는 발송을 선택해 주세요');
    const memo = typeof body.memo === 'string' ? body.memo.trim().slice(0, 60) : '';
    await getSql()`
        insert into ship_calendar (day, kind, memo, created_by) values (${day}, ${kind}, ${memo}, ${admin.id})
        on conflict (day) do update set kind = excluded.kind, memo = excluded.memo, created_by = excluded.created_by, created_at = now()`;
    return Response.json({ ok: true });
}

/** Remove an override: the day goes back to the automatic rule. */
export async function DELETE(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    if (!(await requireAdmin())) return jsonError('Forbidden', 403);
    const day = new URL(request.url).searchParams.get('day');
    if (!isDay(day)) return jsonError('날짜를 확인해 주세요');
    await getSql()`delete from ship_calendar where day = ${day}`;
    return Response.json({ ok: true });
}
