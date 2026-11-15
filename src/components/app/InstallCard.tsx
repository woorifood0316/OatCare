'use client';

import React from 'react';
import { openInstallSheet } from '../../lib/app-install';
import { offerText, useAppInstall } from './useAppInstall';

/**
 * The app invitation card (마이페이지 홈, 쿠폰함, 주문 완료). A step stronger than the friend invitation, never shown
 * to anyone who already uses the app.
 */
export function InstallCard() {
    const ins = useAppInstall();
    if (ins.hidden) return null;
    const offer = offerText(ins.info);
    return (
        <section className="app-card">
            <img src="/icon-192.png" alt="" className="app-card__icon" />
            <div className="app-card__text">
                <strong>{offer.headline}</strong>
                <span>홈 화면에 추가하면 아이콘 한 번으로 들어오고, 로그인도 계속 유지돼요</span>
            </div>
            <button type="button" className="app-card__btn" onClick={openInstallSheet}>
                앱 설치하기
            </button>
        </section>
    );
}
