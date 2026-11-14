import { getSql } from './db';
import { maskName, screenReview } from './review-filter';
import { ESCALATION_NOTE, buildPrompt, clearMatch, escalationFor, parseChoice, rankFaqs, type FaqLite } from './inquiry-match';
import { runChat, workersAiReady } from './workers-ai';
import { enqueue } from './notify';

export const INQUIRY_MIN_LENGTH = 5;
export const INQUIRY_MAX_LENGTH = 500;
export const INQUIRY_DAILY_LIMIT = 10;

export interface PublicInquiry {
    id: string;
    sku: string;
    body: string | null; // null when it's someone else's secret question
    secret: boolean;
    mine: boolean;
    authorName: string;
    status: 'pending' | 'answered';
    answer: string | null;
    answeredBy: 'ai' | 'admin' | null;
    answeredAt: string | null;
    createdAt: string;
}

export interface Faq extends FaqLite {
    active: boolean;
    hits: number;
    updatedAt: string;
}

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

function mapFaq(r: Record<string, unknown>): Faq {
    return {
        id: r.id as string,
        question: r.question as string,
        keywords: (r.keywords as string) ?? '',
        answer: r.answer as string,
        sku: (r.sku as string | null) ?? null,
        active: Boolean(r.active),
        hits: (r.hits as number) ?? 0,
        updatedAt: iso(r.updated_at) as string,
    };
}

export async function listFaqs(onlyActive = false): Promise<Faq[]> {
    const sql = getSql();
    const rows = onlyActive
        ? await sql`select * from faqs where active order by hits desc, created_at asc`
        : await sql`select * from faqs order by active desc, hits desc, created_at asc`;
    return rows.map(mapFaq);
}

export async function listProductInquiries(sku: string, viewerId: string | null): Promise<PublicInquiry[]> {
    const rows = await getSql()`
        select * from inquiries where sku = ${sku} and status <> 'hidden' order by created_at desc limit 100
    `;
    return rows.map((r) => {
        const mine = Boolean(viewerId) && r.user_id === viewerId;
        const visible = !r.secret || mine;
        return {
            id: r.id as string,
            sku: r.sku as string,
            body: visible ? (r.body as string) : null,
            secret: Boolean(r.secret),
            mine,
            authorName: r.author_name as string,
            status: r.status as 'pending' | 'answered',
            answer: visible ? ((r.answer as string | null) ?? null) : null,
            answeredBy: (r.answered_by as 'ai' | 'admin' | null) ?? null,
            answeredAt: iso(r.answered_at),
            createdAt: iso(r.created_at) as string,
        };
    });
}

export async function listMyInquiries(userId: string) {
    const rows = await getSql()`select * from inquiries where user_id = ${userId} and status <> 'hidden' order by created_at desc limit 100`;
    return rows.map((r) => ({
        id: r.id as string,
        sku: r.sku as string,
        body: r.body as string,
        secret: Boolean(r.secret),
        status: r.status as 'pending' | 'answered',
        answer: (r.answer as string | null) ?? null,
        answeredBy: (r.answered_by as 'ai' | 'admin' | null) ?? null,
        createdAt: iso(r.created_at) as string,
    }));
}

/** The automatic answer: an FAQ the shop wrote, chosen by the AI (or by a clear text match), or null for a person. */
export async function pickAnswer(question: string, sku: string): Promise<{ faq: FaqLite | null; note: string }> {
    const escalation = escalationFor(question);
    if (escalation) return { faq: null, note: ESCALATION_NOTE[escalation] };

    const faqs = await listFaqs(true);
    const ranked = rankFaqs(question, faqs, sku, 10);
    if (ranked.length === 0) return { faq: null, note: '등록된 FAQ 없음' };

    if (workersAiReady()) {
        const candidates = ranked.map((r) => r.faq);
        const { system, user } = buildPrompt(question, candidates);
        const text = await runChat(system, user);
        if (text !== null) {
            const n = parseChoice(text, candidates.length);
            if (n === null) {
                const fallback = clearMatch(ranked);
                return { faq: fallback, note: fallback ? 'AI 응답 해석 실패 → 글자 일치로 답변' : `AI 응답 해석 실패 (${text.slice(0, 60)})` };
            }
            if (n === 0) return { faq: null, note: 'AI: 맞는 FAQ 없음' };
            return { faq: candidates[n - 1], note: `AI 선택 (#${n})` };
        }
    }
    const match = clearMatch(ranked);
    return { faq: match, note: match ? '글자 일치로 답변 (AI 미연결)' : 'AI 미연결 · 확실한 FAQ 없음' };
}

export async function todaysCount(userId: string): Promise<number> {
    const rows = await getSql()`select count(*)::int as n from inquiries where user_id = ${userId} and created_at > now() - interval '1 day'`;
    return (rows[0]?.n as number) ?? 0;
}

export type CreateResult =
    | { ok: true; answered: boolean }
    | { ok: false; message: string };

export async function createInquiry(input: { userId: string; userName: string | null; sku: string; body: string; secret: boolean }): Promise<CreateResult> {
    const body = input.body.trim().slice(0, INQUIRY_MAX_LENGTH);
    if (body.length < INQUIRY_MIN_LENGTH) return { ok: false, message: `문의 내용을 ${INQUIRY_MIN_LENGTH}자 이상 적어 주세요` };
    if ((await todaysCount(input.userId)) >= INQUIRY_DAILY_LIMIT) {
        return { ok: false, message: `문의는 하루 ${INQUIRY_DAILY_LIMIT}건까지 남길 수 있어요` };
    }

    const violation = screenReview(body);
    if (violation === 'profanity' || violation === 'ad') {
        return { ok: false, message: violation === 'profanity' ? '욕설·비방이 포함된 글은 등록할 수 없어요' : '광고·홍보 글은 등록할 수 없어요' };
    }
    if (violation === 'privacy' && !input.secret) {
        return { ok: false, message: '전화번호·주소 같은 개인정보는 공개글에 쓸 수 없어요. 꼭 필요하면 비밀글로 남겨 주세요.' };
    }

    // Personal information never goes to the AI: those (secret) questions go straight to a person.
    const { faq, note } = violation === 'privacy' ? { faq: null, note: ESCALATION_NOTE.privacy } : await pickAnswer(body, input.sku);
    const sql = getSql();
    const rows = await sql`
        insert into inquiries (user_id, sku, body, secret, author_name, status, answer, answered_by, faq_id, ai_note, answered_at)
        values (${input.userId}, ${input.sku}, ${body}, ${input.secret}, ${maskName(input.userName)},
                ${faq ? 'answered' : 'pending'}, ${faq?.answer ?? null}, ${faq ? 'ai' : null}, ${faq?.id ?? null}, ${note},
                ${faq ? new Date().toISOString() : null})
        returning id
    `;
    if (faq) await sql`update faqs set hits = hits + 1 where id = ${faq.id}`;
    else await enqueue('inquiry_pending', { inquiryId: rows[0].id, sku: input.sku, note }, { userId: input.userId, customer: false });
    return { ok: true, answered: Boolean(faq) };
}

export async function adminListInquiries(status: 'pending' | 'answered' | 'hidden' | 'all') {
    const sql = getSql();
    const rows =
        status === 'all'
            ? await sql`select i.*, u.email from inquiries i left join users u on u.id = i.user_id order by i.created_at desc limit 200`
            : status === 'pending'
              ? await sql`select i.*, u.email from inquiries i left join users u on u.id = i.user_id where i.status = 'pending'
                          order by i.created_at asc limit 200`
              : await sql`select i.*, u.email from inquiries i left join users u on u.id = i.user_id where i.status = ${status}
                          order by i.created_at desc limit 200`;
    return rows.map((r) => ({
        id: r.id as string,
        sku: r.sku as string,
        body: r.body as string,
        secret: Boolean(r.secret),
        authorName: r.author_name as string,
        email: (r.email as string | null) ?? null,
        status: r.status as 'pending' | 'answered' | 'hidden',
        answer: (r.answer as string | null) ?? null,
        answeredBy: (r.answered_by as 'ai' | 'admin' | null) ?? null,
        aiNote: (r.ai_note as string | null) ?? null,
        hiddenReason: (r.hidden_reason as string | null) ?? null,
        createdAt: iso(r.created_at) as string,
    }));
}

export async function countPendingInquiries(): Promise<number> {
    try {
        const rows = await getSql()`select count(*)::int as n from inquiries where status = 'pending'`;
        return (rows[0]?.n as number) ?? 0;
    } catch {
        return 0;
    }
}
