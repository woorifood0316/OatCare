// 내 정보 rules shared by the screen and the server: name, phone, the identity check, and leaving.

/** Name and phone changes need a login this recent (the member signs in again with their own social login). */
export const PROFILE_FRESH_MS = 10 * 60 * 1000;

export const NAME_MIN = 2;
export const NAME_MAX = 20;

/** A name to save, or an error message. */
export function checkName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
    const name = raw.replace(/\s+/g, ' ').trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) return { ok: false, error: `이름은 ${NAME_MIN}~${NAME_MAX}자로 적어 주세요.` };
    if (!/[\p{L}]/u.test(name)) return { ok: false, error: '이름에 글자가 하나 이상 있어야 해요.' };
    if (/[<>{}\\]/.test(name)) return { ok: false, error: '이름에 쓸 수 없는 기호가 있어요.' };
    return { ok: true, name };
}

/** Digits typed so far shown with hyphens: 010-1234-5678, 02-123-4567, 031-123-4567. */
export function formatPhone(raw: string): string {
    const d = raw.replace(/\D/g, '').slice(0, 11);
    if (d.startsWith('02')) {
        if (d.length <= 2) return d;
        if (d.length <= 5) return `02-${d.slice(2)}`;
        if (d.length <= 9) return `02-${d.slice(2, 5)}-${d.slice(5)}`;
        return `02-${d.slice(2, 6)}-${d.slice(6, 10)}`;
    }
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
    if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** A phone to save (with hyphens), or an error message. */
export function checkPhone(raw: string): { ok: true; phone: string } | { ok: false; error: string } {
    const d = raw.replace(/\D/g, '');
    if (!/^0\d{8,10}$/.test(d)) return { ok: false, error: '전화번호를 다시 확인해 주세요. 예: 010-1234-5678' };
    if (/^01/.test(d) && !/^01[016789]\d{7,8}$/.test(d)) return { ok: false, error: '휴대폰 번호를 다시 확인해 주세요. 예: 010-1234-5678' };
    return { ok: true, phone: formatPhone(d) };
}

export function checkEmail(raw: string): { ok: true; email: string } | { ok: false; error: string } {
    const email = raw.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: '이메일 주소를 다시 확인해 주세요.' };
    return { ok: true, email };
}

/** Reasons offered when leaving (several can be picked; "기타" opens a text box). */
export const WITHDRAW_REASONS = ['맛이 입에 맞지 않아요', '가격이 부담돼요', '배송이 불편했어요', '자주 먹지 않게 됐어요', '혜택이 부족해요', '다른 계정으로 이용할게요', '기타'] as const;
export const WITHDRAW_DETAIL_MAX = 500;

/**
 * What the member types to confirm leaving: their name as saved; a name that is hard to type exactly (emoji,
 * symbols, or none) is replaced by a fixed phrase.
 */
export function withdrawWord(name: string | null): string {
    const n = (name ?? '').trim();
    return n && /^[\p{Script=Hangul}A-Za-z0-9 .·\-]+$/u.test(n) ? n : '탈퇴합니다';
}
