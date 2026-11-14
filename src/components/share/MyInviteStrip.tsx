'use client';

import React from 'react';
import Link from 'next/link';
import { Gift } from 'lucide-react';
import { REFERRAL_REWARD } from '../../lib/catalog';
import { ShareButton } from './ShareButton';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 마이페이지 home: invite friends, with how many were invited and rewarded so far. */
export function MyInviteStrip({ invited, rewarded }: { invited: number; rewarded: number }) {
    return (
        <section className="my-inv" aria-label="친구 초대">
            <Gift size={26} className="my-inv__icon" aria-hidden="true" />
            <div className="my-inv__text">
                <strong>
                    <span className="oc-chunk">친구 초대하면</span> <span className="oc-chunk">친구도 나도 {won(REFERRAL_REWARD)} 쿠폰</span>
                </strong>
                <span>
                    초대한 친구 <b>{invited}명</b> · 쿠폰 받은 초대 <b>{rewarded}건</b> ·{' '}
                    <Link href="/mypage/invite" className="my-inv__more">
                        자세히
                    </Link>
                </span>
            </div>
            <ShareButton
                title="참오트케어 친구 초대"
                description={`이 링크로 가입하고 첫 구매가 확정되면 ${won(REFERRAL_REWARD)} 쿠폰을 드려요. 바쁜 아침, 한 포로 든든한 오트밀!`}
                image="/assets/og-logo-512.png"
                label="친구 초대하기 →"
                className="my-inv__btn"
            />
        </section>
    );
}
