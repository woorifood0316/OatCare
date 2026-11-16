'use client';

import React, { useEffect, useState } from 'react';
import { WITHDRAW_DETAIL_MAX, WITHDRAW_REASONS } from '../lib/profile-rules';

/**
 * 회원 탈퇴 in three steps, so it is never one tap by mistake: what is deleted → why (pick, or write) → type the
 * member's name (`word`) to confirm. Only then does the button send it.
 */
export function WithdrawButton({ word, wrongWord = false }: { word: string; wrongWord?: boolean }) {
    const [step, setStep] = useState<0 | 1 | 2>(wrongWord ? 2 : 0);
    const [reasons, setReasons] = useState<string[]>([]);
    const [detail, setDetail] = useState('');
    const [typed, setTyped] = useState('');

    useEffect(() => {
        if (wrongWord) document.getElementById('withdraw')?.scrollIntoView({ block: 'center' });
    }, [wrongWord]);

    if (step === 0) {
        return (
            <button type="button" className="oc-my__withdraw" onClick={() => setStep(1)}>
                회원 탈퇴
            </button>
        );
    }

    const toggle = (r: string) => setReasons((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]));
    const matches = typed.replace(/\s+/g, ' ').trim() === word;

    return (
        <form method="post" action="/api/account/delete" className="oc-my__confirm wd">
            <p>
                탈퇴하면 회원 정보, 배송지, 등록한 카드, 쿠폰, 정기구독이 즉시 삭제·해지되며 복구할 수 없어요. 법에 따라 보관해야 하는 주문·결제 기록은 별도로 보관한 뒤 기간이 지나면 파기해요.
            </p>

            <fieldset className="wd__reasons">
                <legend>떠나시는 이유를 알려 주세요 (여러 개 선택 가능)</legend>
                {WITHDRAW_REASONS.map((r) => (
                    <label key={r} className={`wd__reason${reasons.includes(r) ? ' is-on' : ''}`}>
                        <input type="checkbox" name="reason" value={r} checked={reasons.includes(r)} onChange={() => toggle(r)} />
                        <span>{r}</span>
                    </label>
                ))}
                <textarea
                    name="detail"
                    rows={3}
                    maxLength={WITHDRAW_DETAIL_MAX}
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder={reasons.includes('기타') ? '어떤 점이 아쉬웠는지 적어 주세요' : '더 하고 싶은 말씀이 있으면 적어 주세요 (선택)'}
                />
            </fieldset>

            {step === 1 ? (
                <div className="oc-my__confirm-actions">
                    <button type="button" className="oc-auth__btn oc-auth__btn--plain" onClick={() => setStep(0)}>
                        취소
                    </button>
                    <button type="button" className="oc-auth__btn oc-auth__btn--danger" onClick={() => setStep(2)}>
                        다음
                    </button>
                </div>
            ) : (
                <>
                    <label className="wd__confirm">
                        <span>
                            정말 탈퇴하려면 아래 칸에 <b>{word}</b>
                            {word === '탈퇴합니다' ? '' : '(회원 이름)'}을 똑같이 입력해 주세요.
                        </span>
                        <input name="confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
                    </label>
                    {wrongWord && !typed ? <p className="my-error">입력한 내용이 맞지 않아 탈퇴하지 않았어요. 다시 입력해 주세요.</p> : null}
                    <div className="oc-my__confirm-actions">
                        <button type="button" className="oc-auth__btn oc-auth__btn--plain" onClick={() => setStep(0)}>
                            취소
                        </button>
                        <button type="submit" className="oc-auth__btn oc-auth__btn--danger" disabled={!matches}>
                            탈퇴하기
                        </button>
                    </div>
                </>
            )}
        </form>
    );
}
