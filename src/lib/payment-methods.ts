import { getSql } from './db';
import { decryptSecret } from './crypto';

export interface PaymentMethod {
    id: string;
    cardCompany: string | null;
    cardNumber: string | null;
    cardType: string | null;
    isDefault: boolean;
    createdAt: string;
}

export async function listPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    const rows = await getSql()`
        select id, card_company, card_number, card_type, is_default, created_at
        from payment_methods where user_id = ${userId}
        order by is_default desc, created_at desc
    `;
    return rows.map((r) => ({
        id: r.id as string,
        cardCompany: (r.card_company as string | null) ?? null,
        cardNumber: (r.card_number as string | null) ?? null,
        cardType: (r.card_type as string | null) ?? null,
        isDefault: Boolean(r.is_default),
        createdAt: new Date(r.created_at as string).toISOString(),
    }));
}

/** The decrypted billing key — only ever used server-side to charge. */
export async function getBillingKey(userId: string, methodId: string): Promise<string | null> {
    const rows = await getSql()`select billing_key_enc from payment_methods where id = ${methodId} and user_id = ${userId}`;
    if (!rows[0]) return null;
    return decryptSecret(rows[0].billing_key_enc as string);
}
