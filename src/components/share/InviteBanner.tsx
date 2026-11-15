'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Gift } from 'lucide-react';
import { REFERRAL_REWARD } from '../../lib/catalog';
import { ShareButton } from './ShareButton';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** Home band between the flavours and the family story: invite friends (members share at once, visitors sign up first). */
export function InviteBanner() {
    const { status } = useSession();
    return (
        <section id="invite" className="inv-band" aria-label="친구 초대">
            <div className="inv-band__inner">
                <Gift size={30} className="inv-band__icon" aria-hidden="true" />
                <div className="inv-band__text">
                    <strong>
                        <span className="oc-chunk">친구 초대하면</span> <span className="oc-chunk">친구도 나도 {won(REFERRAL_REWARD)} 쿠폰</span>
                    </strong>
                    <p>
                        <span className="oc-chunk">내 초대 링크로 친구가 가입하고</span> <span className="oc-chunk">첫 구매가 확정되면 두 사람 모두 쿠폰을 1장씩 드려요.</span>
                    </p>
                </div>
                {status === 'authenticated' ? (
                    <ShareButton
                        title="참오트케어 친구 초대"
                        description={`이 링크로 가입하고 첫 구매가 확정되면 ${won(REFERRAL_REWARD)} 쿠폰을 드려요. 바쁜 아침, 한 포로 든든한 오트밀!`}
                        image="/assets/og-logo-512.png"
                        label="친구 초대하기 →"
                        className="inv-band__btn"
                    />
                ) : (
                    <Link href="/login?callbackUrl=%2F%23invite" className="inv-band__btn">
                        회원가입하고 친구 초대하기 →
                    </Link>
                )}
            </div>
        </section>
    );
}
