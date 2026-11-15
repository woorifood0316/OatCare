// The home-screen app (PWA). Client side only.
//
// Where the visitor is decides how the site can be installed:
//  - Android Chrome / Samsung Internet: the browser fires `beforeinstallprompt`; one button shows the phone's own
//    install dialog.
//  - iPhone Safari: Apple has no install button for sites; the visitor adds it from the share menu (we show the steps).
//  - KakaoTalk / Naver app built-in browsers: they cannot install, so we hand over to Chrome / Safari first.
// Once the visitor opens the site from the home-screen icon (display-mode standalone) nobody is asked again: the
// browser keeps a local mark and, for members, the server remembers it (users.app_installed_at).

import { inAppKind, isAndroid, isIos, isStandalone, type InAppKind } from './app-switch';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const INSTALLED_KEY = 'oc_app_installed';
const APP_LAUNCH_KEY = 'oc_app_launch';
const WAS_MEMBER_KEY = 'oc_was_member';
const DISMISS_KEY = 'oc_install_dismissed';
/** "닫기" on the strip hides it this long. */
export const INSTALL_DISMISS_DAYS = 14;
/** Event that opens the install sheet from anywhere (menu item, cards). */
export const OPEN_INSTALL_EVENT = 'oc:install';
/** Set by the sign-up screen; the install sheet opens once on the next page. */
export const JOINED_KEY = 'oc_joined';

let deferred: BeforeInstallPromptEvent | null = null;
let started = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

/** Catch the browser's install offer early (it fires once, soon after load). Call once on the client. */
export function startInstallCapture() {
    if (started || typeof window === 'undefined') return;
    started = true;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferred = e as BeforeInstallPromptEvent;
        // The browser offers to install only when the app is NOT on the phone: it was removed (or never added).
        try {
            localStorage.removeItem(INSTALLED_KEY);
        } catch {
            /* storage blocked */
        }
        emit();
    });
    window.addEventListener('appinstalled', () => {
        markInstalled();
        deferred = null;
        emit();
    });
    // The home-screen icon opens manifest start_url (?utm_source=app): remember for this tab that we run as the app.
    try {
        if (new URLSearchParams(window.location.search).get('utm_source') === 'app') sessionStorage.setItem(APP_LAUNCH_KEY, '1');
    } catch {
        /* storage blocked */
    }
    if (runningAsApp()) markInstalled();
}

/** Opened from the home-screen icon (display-mode standalone, or launched through the manifest start_url). */
export function runningAsApp(): boolean {
    if (isStandalone()) return true;
    try {
        return sessionStorage.getItem(APP_LAUNCH_KEY) === '1';
    } catch {
        return false;
    }
}

/** This browser has been logged in as a member before (to say "다시 로그인" rather than "가입"). */
export function rememberMember() {
    try {
        localStorage.setItem(WAS_MEMBER_KEY, '1');
    } catch {
        /* storage blocked */
    }
}
export function wasMember(): boolean {
    try {
        return localStorage.getItem(WAS_MEMBER_KEY) === '1';
    } catch {
        return false;
    }
}

export function subscribeInstall(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
}

export function markInstalled() {
    try {
        localStorage.setItem(INSTALLED_KEY, '1');
    } catch {
        /* storage blocked */
    }
    emit();
}

export function isMarkedInstalled(): boolean {
    try {
        return localStorage.getItem(INSTALLED_KEY) === '1';
    } catch {
        return false;
    }
}

export const canPromptInstall = () => deferred !== null;

/** Show the phone's own install dialog (Android / desktop Chrome). */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    const ev = deferred;
    if (!ev) return 'unavailable';
    deferred = null;
    emit();
    try {
        await ev.prompt();
        const choice = await ev.userChoice;
        if (choice.outcome === 'accepted') markInstalled();
        return choice.outcome;
    } catch {
        return 'unavailable';
    }
}

export function dismissInstallStrip() {
    try {
        localStorage.setItem(DISMISS_KEY, String(Date.now() + INSTALL_DISMISS_DAYS * 86400000));
    } catch {
        /* storage blocked */
    }
}

export function stripDismissed(): boolean {
    try {
        return Number(localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now();
    } catch {
        return false;
    }
}

export function openInstallSheet() {
    window.dispatchEvent(new Event(OPEN_INSTALL_EVENT));
}

export type InstallEnv =
    | { kind: 'standalone' }
    /** Chrome / Samsung Internet on Android (prompt may or may not be available yet). */
    | { kind: 'android' }
    /** Safari on iPhone / iPad. */
    | { kind: 'ios-safari' }
    /** Another browser on iPhone (Chrome, Whale...): Safari or its share menu adds to the home screen. */
    | { kind: 'ios-other' }
    /** An app's built-in browser (KakaoTalk, Naver app, Instagram...). */
    | { kind: 'inapp'; app: Exclude<InAppKind, null>; android: boolean }
    | { kind: 'desktop' };

export function installEnv(ua: string = navigator.userAgent): InstallEnv {
    if (runningAsApp()) return { kind: 'standalone' };
    const app = inAppKind(ua);
    if (app) return { kind: 'inapp', app, android: isAndroid(ua) };
    if (isAndroid(ua)) return { kind: 'android' };
    if (isIos(ua)) return /CriOS|FxiOS|EdgiOS|Whale|NAVER|KAKAOTALK/i.test(ua) ? { kind: 'ios-other' } : { kind: 'ios-safari' };
    return { kind: 'desktop' };
}

/** Phones and tablets only: the strip and the after-sign-up sheet are for them. */
export const isPhone = (ua: string = navigator.userAgent) => isAndroid(ua) || isIos(ua);
