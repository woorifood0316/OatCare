// "카카오톡에서 열기 / 네이버 앱에서 열기": a QR code scanned with the phone camera opens the site in the phone's
// browser (Samsung Internet, Chrome, Safari), where Kakao/Naver are not logged in, so their login pages ask for an
// id and password. Re-opening the same page INSIDE the KakaoTalk / Naver app (already logged in) turns the login into
// a single "동의" tap. Client side only.

export type InAppKind = 'kakao' | 'naver' | 'other' | null;

/** Which app's built-in browser we are in (null = a regular browser). */
export function inAppKind(ua: string = navigator.userAgent): InAppKind {
    if (/KAKAOTALK/i.test(ua)) return 'kakao';
    if (/NAVER\(inapp|NAVER\/|NaverMatome/i.test(ua)) return 'naver';
    if (/Instagram|FBAN|FBAV|Line\/|DaumApps|Whale\/.*Mobile.*inapp|everytimeApp|BAND\//i.test(ua)) return 'other';
    return null;
}

export const isMobile = (ua: string = navigator.userAgent) => /Android|iPhone|iPad|iPod/i.test(ua);
const isAndroid = (ua: string = navigator.userAgent) => /Android/i.test(ua);

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

/**
 * Link that opens `url` inside the app's own browser.
 * KakaoTalk: the plain kakaotalk://inappbrowser scheme (the form Kakao's own SDK uses; the Android intent form
 * opened an empty KakaoTalk browser). Naver: Android intent with a fallback back to this page.
 */
export function openInAppLink(app: 'kakao' | 'naver', url: string, fallback: string): string {
    const u = encodeURIComponent(url);
    if (app === 'kakao') return `kakaotalk://inappbrowser?url=${u}`;
    return isAndroid()
        ? `intent://inappbrowser?url=${u}&target=new&version=6#Intent;scheme=naversearchapp;package=com.nhn.android.search;S.browser_fallback_url=${encodeURIComponent(fallback)};end`
        : `naversearchapp://inappbrowser?url=${u}&target=new&version=6`;
}

/** The guest cart rides along in the URL (the app's browser has its own, empty storage). */
export const CART_PARAM = 'oc_cart';

export function encodeCart(lines: unknown[]): string {
    if (!lines.length) return '';
    const json = JSON.stringify(lines);
    const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

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
