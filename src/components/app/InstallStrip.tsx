'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { dismissInstallStrip, isPhone, openInstallSheet, stripDismissed } from '../../lib/app-install';
import { offerText, useAppInstall } from './useAppInstall';

/**
 * A slim strip at the bottom of the home page on phones (e.g. right after a QR scan). It never covers the page,
 * closes with one tap and stays away for 14 days; people using the app never see it.
 */
export function InstallStrip() {
    const ins = useAppInstall();
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (ins.hidden || !isPhone() || stripDismissed()) return;
        const t = setTimeout(() => setShow(true), 1500);
        return () => clearTimeout(t);
    }, [ins.hidden]);

    if (!show || ins.hidden) return null;
    const offer = offerText(ins.info);
    return (
        <div className="app-strip" role="region" aria-label="앱 설치 안내">
            <img src="/icon-192.png" alt="" className="app-strip__icon" />
            <button type="button" className="app-strip__text" onClick={openInstallSheet}>
                <strong>{offer.perk ? `앱 설치하면 ${offer.short}` : '앱으로 설치하면 더 편해요'}</strong>
                <span>아이콘 한 번으로 바로 들어와요</span>
            </button>
            <button type="button" className="app-strip__btn" onClick={openInstallSheet}>
                설치
            </button>
            <button
                type="button"
                className="app-strip__close"
                aria-label="닫기"
                onClick={() => {
                    dismissInstallStrip();
                    setShow(false);
                }}
            >
                <X size={16} />
            </button>
        </div>
    );
}
