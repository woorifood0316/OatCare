'use client';

import React from 'react';
import { Gift } from 'lucide-react';
import { REFERRAL_REWARD } from '../../lib/catalog';
import { ShareButton } from './ShareButton';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** "친구에게도 알려 주세요" card for happy moments (order placed, review written): opens the share sheet with my link. */
export function InviteNudge({ heading }: { heading: string }) {
    return (
        <section className="my-inv inv-nudge" aria-label="친구 초대">
            <Gift size={26} className="my-inv__icon" aria-hidden="true" />
            <div className="my-inv__text">
                <strong>{heading}</strong>
                <span>
                    내 초대 링크로 친구가 가입하고 첫 구매가 확정되면 <b>나와 친구 모두 {won(REFERRAL_REWARD)} 쿠폰</b>을 드려요.
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
