// Input validation shared by API routes (server) and forms (client).

export interface AddressInput {
    label: string | null;
    recipient: string;
    phone: string;
    zipcode: string | null;
    address1: string;
    address2: string | null;
    isDefault: boolean;
}

export interface Address extends AddressInput {
    id: string;
    createdAt: string;
}

/** Korean phone numbers (mobile/landline), returned as 010-1234-5678 style. */
export function normalizePhone(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const digits = value.replace(/\D/g, '');
    if (!/^0\d{8,10}$/.test(digits)) return null;
    if (digits.startsWith('02')) {
        // Seoul: 02-XXX(X)-XXXX
        const rest = digits.slice(2);
        return `02-${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
    }
    if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return null;
}

function str(value: unknown, max: number): string | null {
    if (typeof value !== 'string') return null;
    const v = value.trim();
    return v.length > 0 && v.length <= max ? v : null;
}

export function parseAddressInput(body: unknown): { ok: true; data: AddressInput } | { ok: false; error: string } {
    if (!body || typeof body !== 'object') return { ok: false, error: '잘못된 요청이에요' };
    const b = body as Record<string, unknown>;

    const recipient = str(b.recipient, 30);
    if (!recipient) return { ok: false, error: '받는 분 이름을 입력해 주세요' };
    const phone = normalizePhone(b.phone);
    if (!phone) return { ok: false, error: '연락처를 정확히 입력해 주세요' };
    const address1 = str(b.address1, 200);
    if (!address1) return { ok: false, error: '주소를 검색해 주세요' };

    const optional = (v: unknown, max: number) => {
        if (v === undefined || v === null || v === '') return null;
        return str(v, max);
    };
    const address2 = optional(b.address2, 100);
    if (b.address2 && !address2) return { ok: false, error: '상세 주소가 너무 길어요' };
    const label = optional(b.label, 20);
    if (b.label && !label) return { ok: false, error: '배송지 이름이 너무 길어요' };
    const zipcode = optional(b.zipcode, 10);

    return {
        ok: true,
        data: { label, recipient, phone, zipcode, address1, address2, isDefault: Boolean(b.isDefault) },
    };
}
