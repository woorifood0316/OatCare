import { getSql } from './db';
import { maskName, screenReview } from './review-filter';
import { ESCALATION_NOTE, buildPrompt, clearMatch, escalationFor, parseChoice, rankFaqs, type FaqLite } from './inquiry-match';
import { runChat, workersAiReady } from './workers-ai';
import { enqueue } from './notify';
import { getItem } from './catalog';
import { factFaqs } from './product-facts';

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
    /** Not answered yet: 'auto' = the automatic answer is still being looked for, 'staff' = a person will answer. */
    waiting: 'auto' | 'staff' | null;
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
            waiting: r.status === 'pending' ? (r.ai_note === AUTO_PENDING ? 'auto' : 'staff') : null,
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
        waiting: (r.status === 'pending' ? (r.ai_note === AUTO_PENDING ? 'auto' : 'staff') : null) as 'auto' | 'staff' | null,
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
        const { system, user } = buildPrompt(question, candidates, getItem(sku)?.name ?? null);
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
    | { ok: true; id: string; auto: boolean }
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

    // The question is saved at once; the automatic answer is looked for afterwards (answerInquiry, in the background),
    // so the visitor never waits for the AI. Personal information never goes to the AI: those (secret) questions and
    // the ones a person must answer are handed to the shop right away.
    const escalation = violation === 'privacy' ? ESCALATION_NOTE.privacy : (() => {
        const e = escalationFor(body);
        return e ? ESCALATION_NOTE[e] : null;
    })();
    const rows = await getSql()`
        insert into inquiries (user_id, sku, body, secret, author_name, status, ai_note)
        values (${input.userId}, ${input.sku}, ${body}, ${input.secret}, ${maskName(input.userName)}, 'pending', ${escalation ?? AUTO_PENDING})
        returning id
    `;
    const id = rows[0].id as string;
    if (escalation) await enqueue('inquiry_pending', { inquiryId: id, sku: input.sku, note: escalation }, { userId: input.userId, customer: false });
    return { ok: true, id, auto: !escalation };
}

/** ai_note of a question still waiting for its automatic answer. */
export const AUTO_PENDING = '자동 답변 준비 중';

/**
 * Look for the automatic answer of one waiting question (background job after it was posted, or the scheduler's retry).
 * Never overwrites an answer the shop already wrote.
 */
export async function answerInquiry(id: string): Promise<void> {
    const sql = getSql();
    const rows = await sql`select id, user_id, sku, body from inquiries where id = ${id} and status = 'pending' and answered_by is null and ai_note = ${AUTO_PENDING}`;
    const q = rows[0];
    if (!q) return;
    const { faq, note } = await pickAnswer(q.body as string, q.sku as string);
    if (faq) {
        const done = await sql`
            update inquiries set status = 'answered', answer = ${faq.answer}, answered_by = 'ai', faq_id = ${faq.id}, ai_note = ${note}, answered_at = now()
            where id = ${id} and status = 'pending' and answered_by is null returning id
        `;
        if (done.length > 0) await sql`update faqs set hits = hits + 1 where id = ${faq.id}`;
        return;
    }
    const moved = await sql`update inquiries set ai_note = ${note} where id = ${id} and ai_note = ${AUTO_PENDING} returning id`;
    if (moved.length > 0) await enqueue('inquiry_pending', { inquiryId: id, sku: q.sku, note }, { userId: (q.user_id as string | null) ?? null, customer: false });
}

/** Scheduler: questions whose background answer never ran (or failed) get another try. */
export async function runInquiryAnswers(limit = 10): Promise<{ tried: number }> {
    try {
        const rows = await getSql()`
            select id from inquiries where status = 'pending' and answered_by is null and ai_note = ${AUTO_PENDING}
            and created_at < now() - interval '1 minute' order by created_at asc limit ${limit}
        `;
        for (const r of rows) await answerInquiry(r.id as string);
        return { tried: rows.length };
    } catch {
        return { tried: 0 };
    }
}

/**
 * Write the label-based answers (lib/product-facts) into the FAQ table: added when missing, updated when the label
 * data changed. Rows the shop added by hand are never touched (they have no auto_key).
 */
export async function syncFactFaqs(): Promise<number> {
    const sql = getSql();
    const items = factFaqs();
    for (const f of items) {
        await sql`
            insert into faqs (question, keywords, answer, sku, auto_key) values (${f.question}, ${f.keywords}, ${f.answer}, ${f.sku}, ${f.key})
            on conflict (auto_key) do update set question = excluded.question, keywords = excluded.keywords, answer = excluded.answer,
                sku = excluded.sku, updated_at = now()
        `;
    }
    return items.length;
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
