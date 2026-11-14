// Which browser the site runs in. A QR code scanned with the phone camera opens the phone's browser (Samsung
// Internet, Chrome, Safari), where Kakao/Naver are not logged in; inside the KakaoTalk / Naver app they are.
// Opening those apps from a web page is blocked or unreliable on many phones, so the start page only explains how
// to come in through the apps. Client side only.

export type InAppKind = 'kakao' | 'naver' | 'other' | null;

/** Which app's built-in browser we are in (null = a regular browser). */
export function inAppKind(ua: string = navigator.userAgent): InAppKind {
    if (/KAKAOTALK/i.test(ua)) return 'kakao';
    if (/NAVER\(inapp|NAVER\/|NaverMatome/i.test(ua)) return 'naver';
    if (/Instagram|FBAN|FBAV|Line\/|DaumApps|Whale\/.*Mobile.*inapp|everytimeApp|BAND\//i.test(ua)) return 'other';
    return null;
}

export const isMobile = (ua: string = navigator.userAgent) => /Android|iPhone|iPad|iPod/i.test(ua);

/** Set on the URL we hand to the app, so the page knows it is inside that app even if the user agent doesn't say so. */
export const INAPP_PARAM = 'oc_inapp';
const INAPP_KEY = 'oc_inapp';

/** The app browser we were opened in by our own "…에서 열기" button (kept for this tab). */
export function rememberedInApp(): InAppKind {
    try {
        const url = new URL(window.location.href);
        const v = url.searchParams.get(INAPP_PARAM);
        if (v === 'kakao' || v === 'naver') {
            sessionStorage.setItem(INAPP_KEY, v);
            url.searchParams.delete(INAPP_PARAM);
            window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
            return v;
        }
        const saved = sessionStorage.getItem(INAPP_KEY);
        return saved === 'kakao' || saved === 'naver' ? saved : null;
    } catch {
        return null;
    }
}

/** The guest cart rides along in the URL (the app's browser has its own, empty storage). */
export const CART_PARAM = 'oc_cart';

export function decodeCart(v: string): unknown[] | null {
    try {
        const b64 = v.replace(/-/g, '+').replace(/_/g, '/');
        const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
        const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
        const parsed = JSON.parse(json);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/** Inverse of decodeCart (URL-safe base64 of the JSON lines). */
export function encodeCart(lines: unknown[]): string {
    const bytes = new TextEncoder().encode(JSON.stringify(lines));
    let bin = '';
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export type OpenTarget = 'kakao' | 'naver' | 'chrome';

export const isAndroid = (ua: string = navigator.userAgent) => /Android/i.test(ua);
export const isIos = (ua: string = navigator.userAgent) => /iPhone|iPad|iPod/i.test(ua);
/** Real Chrome on Android (not Samsung Internet / Whale / Edge / Opera / an app WebView). */
export const isAndroidChrome = (ua: string = navigator.userAgent) =>
    isAndroid(ua) && /Chrome\/[\d.]+ Mobile/.test(ua) && !/SamsungBrowser|Whale|EdgA|OPR|; wv\)|Version\/[\d.]+ Chrome/.test(ua);
/** Opened from the home-screen icon (installed web app). */
export const isStandalone = () =>
    window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/**
 * Link that asks the phone to open `url` inside that app.
 *  - Naver app: its in-app browser ("naversearchapp://inappbrowser"), widely used.
 *  - KakaoTalk: its in-app browser ("kakaotalk://inappbrowser"); not in Kakao's public docs, so it may not work on every
 *    version. A Kakao channel link is the official route.
 *  - Chrome: Android only (Android intent).
 * On Android the intent carries a fallback back to this page (with oc_noapp=<target>) for when the app isn't installed.
 */
export function openInAppHref(target: OpenTarget, url: string, ua: string = navigator.userAgent): string | null {
    const u = new URL(url);
    if (target === 'kakao' || target === 'naver') u.searchParams.set(INAPP_PARAM, target);
    else u.searchParams.set('oc_opened', target); // Chrome: don't offer the chooser again there
    const dest = u.toString();
    const back = new URL(url);
    back.searchParams.set('oc_noapp', target);
    const fallback = `S.browser_fallback_url=${encodeURIComponent(back.toString())}`;
    const android = isAndroid(ua);
    if (target === 'naver') {
        const q = `inappbrowser?url=${encodeURIComponent(dest)}&target=new&version=6`;
        return android ? `intent://${q}#Intent;scheme=naversearchapp;package=com.nhn.android.search;${fallback};end` : `naversearchapp://${q}`;
    }
    if (target === 'kakao') {
        const q = `inappbrowser?url=${encodeURIComponent(dest)}`;
        return android ? `intent://${q}#Intent;scheme=kakaotalk;package=com.kakao.talk;${fallback};end` : `kakaotalk://${q}`;
    }
    if (!android) return null;
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;${fallback};end`;
}
