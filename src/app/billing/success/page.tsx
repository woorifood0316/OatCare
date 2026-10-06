import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../../lib/current-user';
import { getSql } from '../../../lib/db';
import { getOrCreateCustomerKey } from '../../../lib/orders';
import { issueBillingKey } from '../../../lib/toss';
import { encryptSecret } from '../../../lib/crypto';
import { safeCallbackPath } from '../../../lib/safe-redirect';

export const runtime = 'edge';

export const metadata: Metadata = {
    title: '카드 등록 | 참오트케어',
    robots: { index: false, follow: false },
};

export default async function BillingSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ authKey?: string; customerKey?: string; next?: string }>;
}) {
    const { authKey, customerKey, next } = await searchParams;
    const back = safeCallbackPath(next) === '/' ? '/mypage/payment' : safeCallbackPath(next);
    const user = await getCurrentUser(back);

    let error = '';
    if (!authKey || !customerKey) {
        error = '잘못된 카드 등록 요청이에요';
    } else if (customerKey !== (await getOrCreateCustomerKey(user.id))) {
        error = '카드 등록 정보가 올바르지 않아요';
    } else {
        const res = await issueBillingKey(authKey, customerKey);
        if (!res.ok) {
            error = res.message;
        } else {
            const sql = getSql();
            const existing = await sql`select 1 from payment_methods where user_id = ${user.id} limit 1`;
            await sql`
                insert into payment_methods (user_id, billing_key_enc, card_company, card_number, card_type, is_default)
                values (${user.id}, ${await encryptSecret(res.data.billingKey)}, ${res.data.cardCompany ?? null},
                    ${res.data.cardNumber ?? res.data.card?.number ?? null}, ${res.data.card?.cardType ?? null}, ${existing.length === 0})
            `;
        }
    }

    // redirect() must not run inside try/catch, so it is decided after the work above.
    if (!error) redirect(back);

    return (
        <main className="cart-page co-page">
            <div className="co-result">
                <div className="co-result__icon is-fail">!</div>
                <h1>카드를 등록하지 못했어요</h1>
                <p>{error}</p>
                <div className="co-result__actions">
                    <Link href={back} className="my-btn my-btn--primary">
                        돌아가기
                    </Link>
                </div>
            </div>
        </main>
    );
}
