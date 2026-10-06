import Link from 'next/link';
import { Ticket } from 'lucide-react';
import { getCurrentUser } from '../../../lib/current-user';
import { listCoupons } from '../../../lib/coupons';
import { PageHead } from '../../../components/mypage/ComingSoon';

export const runtime = 'edge';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const day = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

export default async function CouponsPage() {
    const user = await getCurrentUser();
    const coupons = await listCoupons(user.id);
    const usable = coupons.filter((c) => c.available);
    const done = coupons.filter((c) => !c.available);

    return (
        <>
            <PageHead title="쿠폰" desc="결제할 때 쿠폰을 골라 쓸 수 있어요." />

            {coupons.length === 0 ? (
                <section className="my-card my-placeholder">
                    <Ticket size={24} />
                    <p>받은 쿠폰이 없어요</p>
                </section>
            ) : null}

            {usable.length > 0 ? (
                <ul className="cpn-list">
                    {usable.map((c) => (
                        <li key={c.id} className="cpn">
                            <div className="cpn__amount">
                                <strong>{won(c.amount)}</strong>
                                <span>할인</span>
                            </div>
                            <div className="cpn__body">
                                <b>{c.name}</b>
                                <span>{won(c.minOrder)} 이상 주문 시 사용 · {day(c.expiresAt)}까지</span>
                            </div>
                            <Link href="/#product-lineup" className="cpn__cta">
                                쓰러 가기
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : null}

            {done.length > 0 ? (
                <>
                    <h2 className="my-card__title" style={{ marginTop: '1.4rem' }}>
                        사용했거나 기간이 지난 쿠폰
                    </h2>
                    <ul className="cpn-list">
                        {done.map((c) => (
                            <li key={c.id} className="cpn is-done">
                                <div className="cpn__amount">
                                    <strong>{won(c.amount)}</strong>
                                    <span>{c.usedAt ? '사용 완료' : '기간 만료'}</span>
                                </div>
                                <div className="cpn__body">
                                    <b>{c.name}</b>
                                    <span>{c.usedAt ? `${day(c.usedAt)} 사용` : `${day(c.expiresAt)} 만료`}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            ) : null}

            <p className="cart-note" style={{ textAlign: 'left' }}>
                쿠폰은 주문 1건에 1장만 쓸 수 있고, 정기구독은 첫 결제에만 적용돼요. 주문을 취소하면 기간이 남은 쿠폰은 다시 돌려드려요.
            </p>
        </>
    );
}
