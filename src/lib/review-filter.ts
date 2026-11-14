// Automatic screening of review text. A review that matches is not posted (the visitor is told why and can rewrite it);
// reviews the filter misses can still be deleted by the operator with a reason, which counts as a violation.

export type ViolationCategory = 'profanity' | 'privacy' | 'ad';

export const VIOLATION_LABEL: Record<ViolationCategory | 'other', string> = {
    profanity: '욕설·비방',
    privacy: '개인정보 노출',
    ad: '광고·홍보',
    other: '기타',
};

// Common Korean/English swear words and their spaced / jamo spellings. Kept short on purpose: false positives on
// ordinary food reviews ("시발점" etc.) are avoided by matching whole tokens where it matters.
const PROFANITY = [
    /씨\s*발|시\s*발(?!점)|ㅅ\s*ㅂ|ㅆ\s*ㅂ|씨\s*빨|쉬\s*발/,
    /병\s*신|ㅂ\s*ㅅ(?![ㄱ-ㅎ])|븅\s*신/,
    /개\s*새\s*끼|개\s*색\s*기|개\s*섀|새\s*끼(?=\s|$|[!.?])/,
    /좆|존\s*나|졸\s*라|ㅈ\s*ㄴ/,
    /지\s*랄|ㅈ\s*ㄹ(?![ㄱ-ㅎ])|미\s*친\s*(놈|년|새)|닥\s*쳐|꺼\s*져/,
    /\b(fuck|shit|bitch|asshole)\b/i,
];

const PRIVACY = [
    /01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}/, // mobile phone
    /0\d{1,2}[\s.-]\d{3,4}[\s.-]\d{4}/, // landline
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, // email
    /\d{6}\s?-\s?[1-4]\d{6}/, // resident registration number
    /\d{3,6}-\d{2,6}-\d{4,8}(-\d{1,4})?/, // bank account style numbers (dates like 2026-11-14 do not match)
    /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\S*\s+\S+(시|군|구)\s+\S+(로|길|동)\s*\d+/, // street address
];

const AD = [
    /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|kr|co\.kr|io|me|ly)\b/i,
    /오픈\s*채팅|오픈톡|카톡\s*(아이디|id|ID)|카카오톡\s*(아이디|ID)|텔레그램|텔레\s*@|라인\s*아이디/,
    /부업|재택\s*알바|수익\s*보장|고수익|대출|투자\s*문의|코인\s*리딩|도박|카지노|토토/,
    /(문의|연락)\s*(주세요|바랍니다|하세요)|DM\s*주세요|구매\s*대행|공동\s*구매/,
];

/** First rule the text breaks, or null when it looks fine. */
export function screenReview(text: string): ViolationCategory | null {
    const t = text.normalize('NFC');
    if (PROFANITY.some((r) => r.test(t))) return 'profanity';
    if (PRIVACY.some((r) => r.test(t))) return 'privacy';
    if (AD.some((r) => r.test(t))) return 'ad';
    return null;
}

/** "김민수" → "김*수", "민수" → "민*", "A" → "*". Reviews only ever store the masked name. */
export function maskName(name: string | null | undefined): string {
    const n = (name ?? '').trim();
    if (!n) return '회원';
    const chars = [...n];
    if (chars.length === 1) return '*';
    if (chars.length === 2) return `${chars[0]}*`;
    return `${chars[0]}${'*'.repeat(chars.length - 2)}${chars[chars.length - 1]}`;
}
