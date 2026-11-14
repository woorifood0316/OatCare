'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WELCOME_COUPON_AMOUNT } from '../../lib/catalog';

/** 'here' = the page the visitor is on when they press a button (some buttons move on to /cart right after adding). */
const resolve = (back: string) => (back === 'here' ? window.location.pathname + window.location.search : back);

/**
 * "회원가입이 필요해요" shown when a visitor who isn't signed in tries something that saves to our database
 * (장바구니 담기, 바로 구매 …). One question: go to the login page? Sign-up itself happens there.
 */
export function SignupPrompt({ back, onClose }: { back: string; onClose: () => void }) {
    const router = useRouter();
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const go = () => {
        const to = `/login?callbackUrl=${encodeURIComponent(resolve(back))}`;
        onClose();
        router.push(to);
    };

    return (
        <div className="sup" role="dialog" aria-modal="true" aria-labelledby="sup-title" onClick={onClose}>
            <section className="sup__card" onClick={(e) => e.stopPropagation()}>
                <h2 id="sup-title">회원가입이 필요해요</h2>
                <p>
                    장바구니와 주문은 회원만 이용할 수 있어요.
                    <br />
                    고른 상품은 그대로 기억해 둘게요. 가입하면 <b>{WELCOME_COUPON_AMOUNT.toLocaleString('ko-KR')}원 쿠폰</b>도 드려요.
                </p>
                <p className="sup__member">카카오·네이버·구글 계정으로 3초면 가입돼요. 이미 회원이면 로그인돼요.</p>
                <button type="button" className="sup__go" onClick={go}>
                    로그인 페이지로 이동하기
                </button>
                <button type="button" className="sup__later" onClick={onClose}>
                    나중에 할게요
                </button>
            </section>
        </div>
    );
}
