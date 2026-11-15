'use client';

import React from 'react';
import { Gift } from 'lucide-react';
import { REFERRAL_REWARD } from '../../lib/catalog';
import { ShareButton } from './ShareButton';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

const SHARE = {
    title: '참오트케어 친구 초대',
    description: `이 링크로 가입하고 첫 구매가 확정되면 ${won(REFERRAL_REWARD)} 쿠폰을 드려요. 바쁜 아침, 한 포로 든든한 오트밀!`,
    image: '/assets/og-logo-512.png',
};

/** "친구에게도 알려 주세요" card: opens the share sheet with my link. The reward is one coupon each, once. */
export function InviteNudge({ heading }: { heading: string }) {
    return (
        <section className="my-inv inv-nudge" aria-label="친구 초대">
            <Gift size={26} className="my-inv__icon" aria-hidden="true" />
            <div className="my-inv__text">
                <strong>{heading}</strong>
                <span>
                    내 초대 링크로 가입한 친구의 첫 구매가 확정되면 <b>나와 친구 모두 {won(REFERRAL_REWARD)} 쿠폰</b>을 1장씩 드려요.
                </span>
            </div>
            <ShareButton {...SHARE} label="친구 초대하기 →" className="my-inv__btn" />
        </section>
    );
}

/** One-line invitation for task screens (결제수단·배송지, no subscription yet): present but out of the way. */
export function InviteLine({ text }: { text?: string } = {}) {
    return (
        <div className="inv-line">
            <Gift size={15} aria-hidden="true" />
            <span>
                {text ?? '친구 초대하고 쿠폰 받기'}
                <small className="inv-line__sub">친구 첫 구매 확정 시 둘 다 {won(REFERRAL_REWARD)}</small>
            </span>
            <ShareButton {...SHARE} label="초대하기 →" className="inv-line__btn" />
        </div>
    );
}
