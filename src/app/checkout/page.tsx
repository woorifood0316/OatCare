import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '../../lib/current-user';
import { getSql } from '../../lib/db';
import { listAddresses } from '../../lib/addresses';
import { priceCart, sanitizeLines } from '../../lib/catalog';
import { getOrCreateCustomerKey } from '../../lib/orders';
import { CheckoutOnce } from '../../components/checkout/CheckoutOnce';
import { CheckoutSubscribe } from '../../components/checkout/CheckoutSubscribe';
import { listPaymentMethods } from '../../lib/payment-methods';
import { listCoupons } from '../../lib/coupons';

export const runtime = 'edge';

export const metadata: Metadata = {
    title: '주문·결제 | 참오트케어',
    robots: { index: false, follow: false },
};

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
    const { type } = await searchParams;
    const mode = type === 'subscribe' ? 'subscribe' : 'once';
    const user = await getCurrentUser(`/checkout?type=${mode}`);

    const sql = getSql();
    const cart = await sql`select lines from carts where user_id = ${user.id}`;
    const priced = priceCart(sanitizeLines(cart[0]?.lines ?? []), mode);

    if (priced.items.length === 0 || priced.error) {
        return (
            <main className="cart-page">
                <div className="cart-empty">
                    <p>{priced.items.length === 0 ? '결제할 상품이 없어요' : priced.error}</p>
                    <Link href="/cart" className="my-btn my-btn--primary">
                        장바구니로 돌아가기
                    </Link>
                </div>
            </main>
        );
    }

    const addresses = await listAddresses(user.id);
    const customerKey = await getOrCreateCustomerKey(user.id);
    const coupons = (await listCoupons(user.id)).filter((c) => c.available);

    if (mode === 'subscribe') {
        const methods = await listPaymentMethods(user.id);
        const gifted = await sql`select shaker_gifted_at from users where id = ${user.id}`;
        return (
            <CheckoutSubscribe
                priced={priced}
                addresses={addresses}
                methods={methods}
                coupons={coupons}
                giftEligible={!gifted[0]?.shaker_gifted_at}
                customerKey={customerKey}
                user={{ name: user.name, email: user.email }}
            />
        );
    }

    return (
        <CheckoutOnce
            priced={priced}
            addresses={addresses}
            coupons={coupons}
            customerKey={customerKey}
            user={{ name: user.name, email: user.email }}
        />
    );
}
