import { getSql } from '../../../../lib/db';
import { isUuid, jsonError, requireAdmin, sameOrigin } from '../../../../lib/api';
import { getItem } from '../../../../lib/catalog';
import { FAQ_SEED } from '../../../../lib/faq-seed';
import { makeAnswer, syncFactFaqs } from '../../../../lib/inquiries';
import { workersAiReady } from '../../../../lib/workers-ai';

export const runtime = 'edge';

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * FAQ management:
 *  create / update / toggle / delete one FAQ, seed (starter list, only into an empty table),
 *  test (what the automatic answer would be for a question, nothing saved).
 */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    if (!(await requireAdmin())) return jsonError('Forbidden', 403);
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    const sql = getSql();
    const sku = text(body.sku, 40) || null;
    if (sku && !getItem(sku)) return jsonError('상품을 찾을 수 없어요');

    switch (body.action) {
        case 'create':
        case 'update': {
            const question = text(body.question, 200);
            const answer = text(body.answer, 1000);
            const keywords = text(body.keywords, 300);
            if (question.length < 2 || answer.length < 2) return jsonError('질문과 답변을 모두 적어 주세요');
            if (body.action === 'create') {
                await sql`insert into faqs (question, keywords, answer, sku) values (${question}, ${keywords}, ${answer}, ${sku})`;
            } else {
                if (!isUuid(body.id)) return jsonError('Not Found', 404);
                await sql`update faqs set question = ${question}, keywords = ${keywords}, answer = ${answer}, sku = ${sku}, updated_at = now() where id = ${body.id}`;
            }
            break;
        }
        case 'toggle': {
            if (!isUuid(body.id)) return jsonError('Not Found', 404);
            await sql`update faqs set active = not active, updated_at = now() where id = ${body.id}`;
            break;
        }
        case 'delete': {
            if (!isUuid(body.id)) return jsonError('Not Found', 404);
            await sql`delete from faqs where id = ${body.id}`;
            break;
        }
        case 'seed': {
            const n = await sql`select count(*)::int as n from faqs`;
            if ((n[0]?.n as number) > 0) return jsonError('이미 FAQ가 있어요. 기본 FAQ는 비어 있을 때만 넣을 수 있어요.', 409);
            for (const f of FAQ_SEED) await sql`insert into faqs (question, keywords, answer) values (${f.question}, ${f.keywords}, ${f.answer})`;
            await syncFactFaqs();
            break;
        }
        case 'sync_facts': {
            // Label-based answers (영양정보·알레르기·보관 …): add the missing ones, refresh the rest.
            return Response.json({ ok: true, count: await syncFactFaqs() });
        }
        case 'test': {
            const question = text(body.question, 500);
            if (question.length < 2) return jsonError('시험할 질문을 적어 주세요');
            const { answer, note, sources } = await makeAnswer(question, sku ?? 'single:그레인');
            return Response.json({ answer, sources, note, aiReady: workersAiReady() });
        }
        default:
            return jsonError('알 수 없는 요청이에요');
    }
    return Response.json({ ok: true });
}
