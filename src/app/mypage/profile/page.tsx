import Link from 'next/link';
import { getCurrentUser } from '../../../lib/current-user';
import { PageHead } from '../../../components/mypage/ComingSoon';
import { MarketingToggle } from '../../../components/mypage/MarketingToggle';
import { WithdrawButton } from '../../../components/WithdrawButton';

export const runtime = 'edge';

const PROVIDERS = [
    { id: 'kakao', label: '카카오' },
    { id: 'naver', label: '네이버' },
    { id: 'google', label: '구글' },
] as const;

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ withdraw?: string }> }) {
    const { withdraw } = await searchParams;
    const user = await getCurrentUser();
    const joined = new Date(user.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <>
            <PageHead title="내 정보" desc="가입 정보와 알림 설정을 관리해요." />

            <section className="my-card">
                <h2 className="my-card__title">기본 정보</h2>
                <dl className="my-dl">
                    <div>
                        <dt>이름</dt>
                        <dd>{user.name || '-'}</dd>
                    </div>
                    <div>
                        <dt>이메일</dt>
                        <dd>{user.email || '등록된 이메일 없음'}</dd>
                    </div>
                    <div>
                        <dt>가입일</dt>
                        <dd>{joined}</dd>
                    </div>
                </dl>
            </section>

            <section className="my-card">
                <h2 className="my-card__title">로그인 연결</h2>
                <ul className="my-list">
                    {PROVIDERS.map((p) => {
                        const linked = user.providers.includes(p.id);
                        return (
                            <li key={p.id} className="my-row">
                                <div className="my-row__text">
                                    <strong>{p.label}</strong>
                                </div>
                                <span className={`my-pill${linked ? ' is-on' : ''}`}>{linked ? '연결됨' : '미연결'}</span>
                            </li>
                        );
                    })}
                </ul>
            </section>

            <section className="my-card">
                <h2 className="my-card__title">알림 설정</h2>
                <MarketingToggle initial={user.marketingAgreed} updatedAt={user.marketingUpdatedAt} />
            </section>

            <section className="my-card">
                <h2 className="my-card__title">이용 안내</h2>
                <ul className="my-list">
                    <li className="my-row">
                        <Link href="/terms" target="_blank">
                            이용약관
                        </Link>
                    </li>
                    <li className="my-row">
                        <Link href="/privacy" target="_blank">
                            개인정보처리방침
                        </Link>
                    </li>
                </ul>
            </section>

            <section className="my-card my-card--danger">
                <h2 className="my-card__title">계정 관리</h2>
                {withdraw === 'blocked' ? (
                    <p className="my-error">
                        배송이 끝나지 않은 주문이 있어 지금은 탈퇴할 수 없어요. 배송 완료 후 다시 시도하거나 고객센터(031-998-7234)로 문의해 주세요.
                    </p>
                ) : null}
                {withdraw === 'min_period' ? (
                    <p className="my-error">
                        최소 이용기간(2회 결제)이 끝나지 않은 정기구독이 있어 탈퇴할 수 없어요. 구독 해지를 예약하면 2회차 결제 후 자동으로 해지되고, 그 뒤에 탈퇴할 수 있어요.
                    </p>
                ) : null}
                <WithdrawButton />
            </section>
        </>
    );
}
