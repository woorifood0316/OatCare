'use client';

import React, { useState } from 'react';
import { Copy, MessageCircle, Share2 } from 'lucide-react';
import { REFERRAL_REWARD } from '../../lib/catalog';
import { shareToKakao } from '../../lib/kakao-sdk';

/** My invitation link with KakaoTalk / copy / other-app buttons. */
export function InviteBox({ link }: { link: string }) {
    const [msg, setMsg] = useState('');
    const title = '참오트케어 친구 초대';
    const description = `이 링크로 가입하고 첫 구매가 확정되면 ${REFERRAL_REWARD.toLocaleString('ko-KR')}원 쿠폰을 드려요. 바쁜 아침, 한 포로 든든한 오트밀!`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setMsg('링크를 복사했어요. 카카오톡·문자에 붙여 넣어 보내 주세요.');
        } catch {
            setMsg(link);
        }
    };
    const kakao = async () => {
        try {
            await shareToKakao({ title, description, imageUrl: new URL('/assets/og-logo-512.png', window.location.origin).toString(), url: link, button: '참오트케어 보러 가기' });
        } catch {
            await copy();
        }
    };
    const native = async () => {
        try {
            await navigator.share({ title, text: description, url: link });
        } catch {
            /* closed */
        }
    };
    const canNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

    return (
        <div className="inv-box">
            <div className="inv-link">
                <span>{link}</span>
            </div>
            <div className="shr__actions">
                <button type="button" className="shr__kakao" onClick={kakao}>
                    <MessageCircle size={18} /> 카카오톡으로 초대하기
                </button>
                <button type="button" className="shr__copy" onClick={copy}>
                    <Copy size={18} /> 링크 복사
                </button>
                {canNative ? (
                    <button type="button" className="shr__copy" onClick={native}>
                        <Share2 size={18} /> 다른 앱으로 공유
                    </button>
                ) : null}
            </div>
            {msg ? <p className="shr__msg">{msg}</p> : null}
        </div>
    );
}
