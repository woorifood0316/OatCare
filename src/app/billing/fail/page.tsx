import type { Metadata } from 'next';
import Link from 'next/link';
import { safeCallbackPath } from '../../../lib/safe-redirect';

export const runtime = 'edge';

export const metadata: Metadata = {
    title: '카드 등록 실패 | 참오트케어',
    robots: { index: false, follow: false },
};

export default async function BillingFailPage({
    searchParams,
}: {
    searchParams: Promise<{ code?: string; message?: string; next?: string }>;
}) {
    const { message, next } = await searchParams;
    const back = safeCallbackPath(next) === '/' ? '/mypage/payment' : safeCallbackPath(next);

    return (
        <main className="cart-page co-page">
            <div className="co-result">
                <div className="co-result__icon is-fail">!</div>
                <h1>카드 등록이 완료되지 않았어요</h1>
                <p>{(message ?? '카드 등록이 취소되었거나 실패했어요').slice(0, 200)}</p>
                <div className="co-result__actions">
                    <Link href={back} className="my-btn my-btn--primary">
                        돌아가기
                    </Link>
                </div>
            </div>
        </main>
    );
}
