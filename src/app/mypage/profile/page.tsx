import Link from 'next/link';
import { getCurrentUser } from '../../../lib/current-user';
import { PageHead } from '../../../components/mypage/ComingSoon';
import { MarketingToggle } from '../../../components/mypage/MarketingToggle';
import { PushToggle } from '../../../components/app/PushOptIn';
import { WithdrawButton } from '../../../components/WithdrawButton';
import { LogoutButton } from '../../../components/LogoutButton';
import { LogoutAllButton } from '../../../components/LogoutAllButton';
import { ProfileInfo } from '../../../components/mypage/ProfileInfo';
import { withdrawWord } from '../../../lib/profile-rules';

export const runtime = 'edge';

const PROVIDER_KO: Record<string, string> = { kakao: '카카오', naver: '네이버', google: '구글' };

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
            <PageHead title="내 정보" desc="회원 정보와 알림 설정을 관리해요." />

            <section className="my-card">
                <h2 className="my-card__title">회원 정보</h2>
                <ProfileInfo
                    name={user.name}
                    nameEdited={user.nameEdited}
                    phone={user.phone}
                    email={user.email}
                    joined={joined}
                    fresh={user.fresh}
                    provider={user.providers[0] ?? null}
                />
            </section>

            <section className="my-card">
                <h2 className="my-card__title">가입 경로</h2>
                <p className="pf-via">
                    {user.providers.length > 0 ? user.providers.map((p) => PROVIDER_KO[p] ?? p).join(' · ') : '-'}로 가입했어요
                    <small>다음에도 같은 방법으로 로그인해 주세요.</small>
                </p>
            </section>

            <section className="my-card">
                <h2 className="my-card__title">알림 설정</h2>
                <PushToggle />
                <MarketingToggle initial={user.marketingAgreed} updatedAt={user.marketingUpdatedAt} />
            </section>

            <section className="my-card">
                <h2 className="my-card__title">이용 안내</h2>
                <ul className="my-list">
                    <li className="my-row">
                        <Link href="/terms">이용약관</Link>
                    </li>
                    <li className="my-row">
                        <Link href="/privacy">개인정보처리방침</Link>
                    </li>
                    <li className="my-row">
                        <a href="tel:031-998-7234">고객센터 031-998-7234</a>
                    </li>
                </ul>
            </section>

            <section className="my-card">
                <h2 className="my-card__title">로그인</h2>
                <div className="my-profile-logout">
                    <LogoutButton className="my-btn addr-btn addr-btn--ghost" />
                </div>
                <div className="my-profile-logoutall">
                    <LogoutAllButton className="my-btn addr-btn addr-btn--ghost" />
                </div>
                <p className="my-profile-logoutall__note">휴대폰을 잃어버렸거나 다른 기기에서 로그인했다면 모든 로그인을 끊을 수 있어요.</p>
            </section>

            <div className="pf-leave" id="withdraw">
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
                <WithdrawButton word={withdrawWord(user.name)} wrongWord={withdraw === 'confirm'} />
            </div>
        </>
    );
}
