'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { dismissInstallStrip, isPhone, openInstallSheet, stripDismissed } from '../../lib/app-install';
import { offerText, useAppInstall } from './useAppInstall';

/** Sections where the customer compares and picks products: the strip steps aside while any of them is on screen. */
const SHOP_SECTIONS = ['#bundles', '#product-lineup', '#signup-perks'];

/**
 * A slim strip at the bottom of the home page on phones (e.g. right after a QR scan). It steps aside while the sets
 * and flavours are on screen (never covering the products), closes with one tap and stays away for 14 days; people
 * using the app never see it.
 */
export function InstallStrip() {
    const ins = useAppInstall();
    const [show, setShow] = useState(false);
    const [overShop, setOverShop] = useState(false);

    useEffect(() => {
        const els = SHOP_SECTIONS.map((sel) => document.querySelector(sel)).filter((el): el is Element => Boolean(el));
        if (els.length === 0) return;
        const visible = new Set<Element>();
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.isIntersecting) visible.add(e.target);
                else visible.delete(e.target);
            }
            setOverShop(visible.size > 0);
        });
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        if (ins.hidden || !isPhone() || stripDismissed()) return;
        const t = setTimeout(() => setShow(true), 1500);
        return () => clearTimeout(t);
    }, [ins.hidden]);

    if (!show || ins.hidden || overShop) return null;
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
