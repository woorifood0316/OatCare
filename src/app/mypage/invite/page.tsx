import { Gift } from 'lucide-react';
import { getCurrentUser } from '../../../lib/current-user';
import { getReferralCode, myReferrals } from '../../../lib/referrals';
import { REFERRAL_REWARD } from '../../../lib/catalog';
import { PageHead } from '../../../components/mypage/ComingSoon';
import { InviteBox } from '../../../components/share/InviteBox';
import { InviteRules } from '../../../components/share/InviteRules';

export const runtime = 'edge';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) : '');
const STATUS: Record<string, string> = { joined: '가입 완료 · 첫 구매 확정 대기', rewarded: '쿠폰 지급 완료', rejected: '지급 안 됨' };

export default async function InvitePage() {
    const user = await getCurrentUser('/mypage/invite');
    const site = (process.env.SITE_URL || 'https://chamoatcare.com').replace(/\/$/, '');
    let link = '';
    let data: Awaited<ReturnType<typeof myReferrals>> = { invited: [], invitedBy: null };
    let ready = true;
    try {
        link = `${site}/?ref=${await getReferralCode(user.id)}`;
        data = await myReferrals(user.id);
    } catch {
        ready = false; // tables not created yet
    }
    const rewarded = data.invited.filter((r) => r.status === 'rewarded').length;

    return (
        <>
            <PageHead title="친구 초대" desc={`내 초대 링크로 친구가 가입하고 첫 구매가 확정되면 나와 친구 모두 ${won(REFERRAL_REWARD)} 쿠폰을 1장씩 받아요.`} />
            {!ready ? (
                <section className="my-card my-placeholder">
                    <Gift size={24} />
                    <p>친구 초대를 준비하고 있어요</p>
                </section>
            ) : (
                <>
                    <section className="my-card">
                        <h2 className="my-card__title">나만의 초대 링크</h2>
                        <InviteBox link={link} />
                        <p className="inv-stat">
                            초대한 친구 <b>{data.invited.length}명</b> · 쿠폰 받은 초대 <b>{rewarded}건</b>
                        </p>
                    </section>

                    <section className="my-card">
                        <h2 className="my-card__title">친구 초대 쿠폰 기준</h2>
                        <InviteRules />
                    </section>

                    <section className="my-card">
                        <h2 className="my-card__title">내가 초대한 친구</h2>
                        {data.invited.length === 0 ? (
                            <p className="adm-muted" style={{ margin: 0 }}>
                                아직 초대한 친구가 없어요. 위 링크를 친구에게 보내 보세요.
                            </p>
                        ) : (
                            <ul className="inv-list">
                                {data.invited.map((r, i) => (
                                    <li key={i}>
                                        <span>
                                            <b>{r.friendName}</b> · {day(r.joinedAt)} 가입
                                        </span>
                                        <span className={`inv-st inv-st--${r.status}`}>
                                            {STATUS[r.status]}
                                            {r.status === 'rejected' && r.note ? ` (${r.note})` : ''}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {data.invitedBy ? (
                            <p className="inv-stat">
                                나를 초대한 회원: <b>{data.invitedBy.friendName}</b> · {STATUS[data.invitedBy.status]}
                                {data.invitedBy.status === 'joined' ? ' (첫 주문이 구매 확정되면 나도 쿠폰을 받아요)' : ''}
                            </p>
                        ) : null}
                    </section>
                </>
            )}
        </>
    );
}
