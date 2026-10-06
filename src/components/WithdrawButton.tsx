'use client';

import React, { useState } from 'react';

export function WithdrawButton() {
    const [confirming, setConfirming] = useState(false);

    if (!confirming) {
        return (
            <button type="button" className="oc-my__withdraw" onClick={() => setConfirming(true)}>
                회원 탈퇴
            </button>
        );
    }

    return (
        <form method="post" action="/api/account/delete" className="oc-my__confirm">
            <p>탈퇴하면 회원 정보, 배송지, 등록한 카드, 정기구독이 즉시 삭제·해지되며 복구할 수 없어요. 법에 따라 보관해야 하는 주문·결제 기록은 별도로 보관한 뒤 기간이 지나면 파기해요. 정말 탈퇴하시겠어요?</p>
            <div className="oc-my__confirm-actions">
                <button type="button" className="oc-auth__btn oc-auth__btn--plain" onClick={() => setConfirming(false)}>
                    취소
                </button>
                <button type="submit" className="oc-auth__btn oc-auth__btn--danger">
                    탈퇴하기
                </button>
            </div>
        </form>
    );
}
