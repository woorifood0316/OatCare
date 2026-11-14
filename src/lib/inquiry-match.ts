// Picking the FAQ answer for a customer question. Pure functions (no database, no network) so they can be tested.
//
// 1. Questions that must reach a person (complaints, health/medical, personal information) are never auto-answered.
// 2. FAQs are ranked by character-bigram overlap, which copes with Korean particles ("찬물에" / "찬물로") and spacing.
// 3. The AI only chooses one of the top candidates by number (or none); the customer always gets the FAQ text exactly
//    as the shop wrote it, so a small free model cannot invent facts or write odd Korean.
// 4. Without the AI (not set up / failed), only a clear bigram match is used.

export interface FaqLite {
    id: string;
    question: string;
    keywords: string;
    answer: string;
    sku: string | null;
}

export type Escalation = 'complaint' | 'health' | 'privacy' | null;

const COMPLAINT = /불량|파손|터져|터졌|찢어|이물|벌레|곰팡|상했|변질|썩|냄새가\s*이상|맛이\s*이상|환불\s*해|사기|신고|소비자\s*원|화가\s*나|어이없|최악|교환\s*해\s*주|못\s*받았|안\s*왔|오배송|잘못\s*왔|다른\s*게\s*왔/;
const HEALTH = /당뇨|혈당|혈압|고지혈|콜레스테롤|임신|임산부|수유|모유|질병|환자|투병|복용|(?<![예계절요])약\s*(을|이랑|과|하고|먹)|처방|수술|항암|암\s*환자|신장|간\s*수치|통풍|위염|역류|과민성|소아|영유아|돌\s*아기|개월\s*아기|알레르기\s*반응|아나필락시스|두드러기|부작용/;

/** Questions a person must answer, whatever the FAQ says. */
export function escalationFor(text: string): Escalation {
    if (COMPLAINT.test(text)) return 'complaint';
    if (HEALTH.test(text)) return 'health';
    return null;
}

export const ESCALATION_NOTE: Record<Exclude<Escalation, null>, string> = {
    complaint: '불만·하자 관련 문의 (담당자 확인 필요)',
    health: '건강·질병 관련 문의 (자동 답변 안 함)',
    privacy: '개인정보 포함 (AI에 보내지 않음)',
};

function norm(s: string): string {
    return s.normalize('NFC').toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
}

// Question endings and filler that every question shares; they would make unrelated questions look alike.
const STOP = new Set(['되나', '나요', '어요', '돼요', '해요', '에요', '예요', '있나', '는데', '어도', '도되', '도돼', '먹어', '먹으', '으면', '하나', '할수', '수있', '있어', '궁금', '금해', '얼마', '마나', '마예', '마에', '어떻', '떻게', '게되', '하고', '싶어', '인가', '가요', '건가', '나여', '니까', '까요', '을까', '를까', '은데', '데요']);

function bigrams(s: string): Set<string> {
    const t = norm(s);
    const out = new Set<string>();
    if (t.length === 1) out.add(t);
    for (let i = 0; i < t.length - 1; i++) {
        const g = t.slice(i, i + 2);
        if (!STOP.has(g)) out.add(g);
    }
    return out;
}

/** Share of the question's bigrams found in the FAQ's question + keywords (0..1). */
export function overlap(question: string, faq: FaqLite): number {
    const q = bigrams(question);
    if (q.size === 0) return 0;
    const f = bigrams(`${faq.question} ${faq.keywords}`);
    let hit = 0;
    for (const g of q) if (f.has(g)) hit++;
    return hit / q.size;
}

/** FAQs for this product (and the general ones), best first. */
export function rankFaqs(question: string, faqs: FaqLite[], sku: string, limit = 10): { faq: FaqLite; score: number }[] {
    return faqs
        .filter((f) => !f.sku || f.sku === sku)
        .map((faq) => ({ faq, score: overlap(question, faq) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

/** Without the AI: answer only when one FAQ clearly stands out. */
export function clearMatch(ranked: { faq: FaqLite; score: number }[]): FaqLite | null {
    const [top, second] = ranked;
    if (!top) return null;
    if (top.score >= 0.6 && top.score - (second?.score ?? 0) >= 0.2) return top.faq;
    return null;
}

/** The instruction for the AI: choose a number, nothing else. */
export function buildPrompt(question: string, candidates: FaqLite[]): { system: string; user: string } {
    const system = [
        '당신은 오트밀 쇼핑몰 "참오트케어"의 상품 문의 분류기입니다.',
        '고객 질문과 FAQ 목록을 보고, 고객 질문에 그대로 답이 되는 FAQ 번호 하나만 고르세요.',
        '- 질문의 핵심에 정확히 답하는 FAQ가 있을 때만 그 번호를 고르세요.',
        '- 비슷해 보여도 질문에 대한 답이 아니면, 또는 여러 가지를 동시에 묻는데 일부만 답이 되면 0을 고르세요.',
        '- 특정 주문·배송 상황, 불만, 건강·질병에 관한 질문은 0을 고르세요.',
        '출력은 숫자 하나만 쓰세요. 설명하지 마세요.',
    ].join('\n');
    const list = candidates.map((c, i) => `${i + 1}. 질문: ${c.question}\n   답변: ${c.answer}`).join('\n');
    const user = `FAQ 목록:\n${list}\n\n고객 질문: ${question}\n\n답이 되는 FAQ 번호 (없으면 0):`;
    return { system, user };
}

/** Reads the chosen number from the model's text (reasoning tags and extra words ignored). */
export function parseChoice(text: string, count: number): number | null {
    const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const m = cleaned.match(/-?\d+/);
    if (!m) return null;
    const n = Number(m[0]);
    if (!Number.isInteger(n) || n < 0 || n > count) return null;
    return n;
}
