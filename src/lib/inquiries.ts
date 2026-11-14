import { getSql } from './db';
import { maskName, screenReview } from './review-filter';
import { ESCALATION_NOTE, buildAnswerPrompt, checkGenerated, clearMatch, escalationFor, rankFaqs, type FaqLite, type InfoEntry } from './inquiry-match';
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
    /** Set on answers written from the package label (lib/product-facts). */
    autoKey: string | null;
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
        autoKey: (r.auto_key as string | null) ?? null,
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
export interface AutoAnswer {
    answer: string | null;
    /** Set when the answer is an FAQ entry used word for word (no AI). */
    faqId: string | null;
    note: string;
    /** Topics of the information the answer was written from. */
    sources: string[];
}

/**
 * The automatic answer to a question asked on the page of product `sku`:
 * the AI reads the most relevant pieces of the shop's information (FAQ table: label facts, rules, notes) and writes
 * a short answer from them only. Checks reject made-up numbers and health claims. Without the AI, only an entry that
 * clearly matches the question is used as it is. null answer = a person answers.
 */
export async function makeAnswer(question: string, sku: string): Promise<AutoAnswer> {
    const escalation = escalationFor(question);
    if (escalation) return { answer: null, faqId: null, note: ESCALATION_NOTE[escalation], sources: [] };

    const faqs = await listFaqs(true);
    if (faqs.length === 0) return { answer: null, faqId: null, note: '참고 정보 없음', sources: [] };
    const ranked = rankFaqs(question, faqs, sku, 8);
    // The product's own label facts always come along, so "이 상품 …" questions have the numbers at hand.
    const own = faqs.filter((f) => f.sku === sku && /:(nutrition|ingredients|allergy)$/.test(f.autoKey ?? ''));
    const picked: FaqLite[] = [];
    for (const f of [...ranked.filter((r) => r.score > 0).map((r) => r.faq), ...own]) {
        if (!picked.some((p) => p.id === f.id)) picked.push(f);
    }

    if (workersAiReady() && picked.length > 0) {
        const infos: InfoEntry[] = picked.map((f) => ({ question: f.question, answer: f.answer }));
        const { system, user } = buildAnswerPrompt(question, infos, getItem(sku)?.name ?? null);
        const text = await runChat(system, user, 350);
        if (text !== null) {
            const checked = checkGenerated(text, infos, question);
            const sources = picked.map((f) => f.question);
            if ('answer' in checked) return { answer: checked.answer, faqId: null, note: `AI 작성 (참고 정보 ${picked.length}개)`, sources };
            return { answer: null, faqId: null, note: checked.reject, sources };
        }
    }
    const match = clearMatch(ranked);
    return match
        ? { answer: match.answer, faqId: match.id, note: workersAiReady() ? 'AI 응답 없음 → 일치하는 정보 그대로' : '일치하는 정보 그대로 (AI 미연결)', sources: [match.question] }
        : { answer: null, faqId: null, note: workersAiReady() ? 'AI 응답 없음' : 'AI 미연결 · 일치하는 정보 없음', sources: [] };
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
    const { answer, faqId, note, sources } = await makeAnswer(q.body as string, q.sku as string);
    if (answer) {
        const fullNote = sources.length ? `${note} · 참고: ${sources.slice(0, 5).join(' / ')}`.slice(0, 500) : note;
        const done = await sql`
            update inquiries set status = 'answered', answer = ${answer}, answered_by = 'ai', faq_id = ${faqId}, ai_note = ${fullNote}, answered_at = now()
            where id = ${id} and status = 'pending' and answered_by is null returning id
        `;
        if (done.length > 0 && faqId) await sql`update faqs set hits = hits + 1 where id = ${faqId}`;
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
