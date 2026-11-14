import { getSql } from '../../../../../lib/db';
import { isUuid, jsonError, requireAdmin, sameOrigin } from '../../../../../lib/api';
import { enqueue } from '../../../../../lib/notify';

export const runtime = 'edge';

type Ctx = { params: Promise<{ id: string }> };

/** answer (write or correct the answer, optionally saving it as an FAQ) / hide (with a reason) / unhide. */
export async function PATCH(request: Request, ctx: Ctx) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    if (!(await requireAdmin())) return jsonError('Forbidden', 403);
    const { id } = await ctx.params;
    if (!isUuid(id)) return jsonError('Not Found', 404);

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    const sql = getSql();
    const rows = await sql`select * from inquiries where id = ${id}`;
    const q = rows[0];
    if (!q) return jsonError('Not Found', 404);

    switch (body.action) {
        case 'answer': {
            const answer = typeof body.answer === 'string' ? body.answer.trim().slice(0, 1000) : '';
            if (answer.length < 2) return jsonError('답변을 적어 주세요');
            await sql`update inquiries set status = 'answered', answer = ${answer}, answered_by = 'admin', answered_at = now() where id = ${id}`;
            if (body.saveFaq === true) {
                const question = typeof body.faqQuestion === 'string' && body.faqQuestion.trim() ? body.faqQuestion.trim() : (q.body as string);
                await sql`insert into faqs (question, keywords, answer) values (${question.slice(0, 200)}, ${String(body.faqKeywords ?? '').slice(0, 200)}, ${answer})`;
            }
            if (q.user_id) {
                await enqueue('inquiry_answered', { question: String(q.body).slice(0, 200), answer }, { userId: q.user_id as string, admin: false });
            }
            break;
        }
        case 'hide': {
            const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 200) : '';
            if (reason.length < 2) return jsonError('숨김 사유를 적어 주세요');
            await sql`update inquiries set status = 'hidden', hidden_reason = ${reason} where id = ${id}`;
            break;
        }
        case 'unhide': {
            await sql`update inquiries set status = case when answer is null then 'pending' else 'answered' end, hidden_reason = null where id = ${id}`;
            break;
        }
        default:
            return jsonError('알 수 없는 요청이에요');
    }
    return Response.json({ ok: true });
}
