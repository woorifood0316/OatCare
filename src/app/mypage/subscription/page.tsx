import { getCurrentUser } from '../../../lib/current-user';
import { getSql } from '../../../lib/db';
import { listAddresses } from '../../../lib/addresses';
import { listPaymentMethods } from '../../../lib/payment-methods';
import { listSubscriptions } from '../../../lib/subscriptions';
import { PageHead } from '../../../components/mypage/ComingSoon';
import { SubscriptionManager, type HistoryItem } from '../../../components/mypage/SubscriptionManager';

export const runtime = 'edge';

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ started?: string }> }) {
    const { started } = await searchParams;
    const user = await getCurrentUser();
    const [subs, addresses, methods] = await Promise.all([
        listSubscriptions(user.id),
        listAddresses(user.id),
        listPaymentMethods(user.id),
    ]);

    const history: Record<string, HistoryItem[]> = {};
    if (subs.length > 0) {
        const rows = await getSql()`
            select subscription_id, order_no, amount, status, created_at, paid_at
            from orders where user_id = ${user.id} and subscription_id is not null
            order by created_at desc limit 60
        `;
        for (const r of rows) {
            const key = r.subscription_id as string;
            (history[key] ??= []).push({
                orderNo: r.order_no as string,
                amount: r.amount as number,
                status: r.status as string,
                date: new Date((r.paid_at ?? r.created_at) as string).toISOString(),
            });
        }
    }

    return (
        <>
            <PageHead title="정기구독" desc="구독 주기와 다음 결제일을 직접 관리해요." />
            <SubscriptionManager initial={subs} addresses={addresses} methods={methods} history={history} justStarted={started === '1'} />
        </>
    );
}
