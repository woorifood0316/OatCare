// App notifications in the browser. Client side only.
import { isIos } from './app-switch';
import { runningAsApp } from './app-install';

export type PushState =
    /** this browser cannot receive pushes */
    | 'unsupported'
    /** iPhone outside the home-screen app: install first */
    | 'needs-app'
    /** the person blocked notifications for this site */
    | 'denied'
    /** on for this device */
    | 'on'
    | 'off';

function b64urlToBytes(s: string): Uint8Array {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
    const bin = atob(b64);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function pushState(): Promise<PushState> {
    if (isIos() && !runningAsApp()) return 'needs-app';
    if (!supported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        return sub && Notification.permission === 'granted' ? 'on' : 'off';
    } catch {
        return 'off';
    }
}

/**
 * Ask the phone for permission (must run from a tap) and register this device. `marketing` also records the optional
 * event/benefit consent. Returns what the server says it gave (the notification coupon), or an error code.
 */
export async function enablePush(marketing = false): Promise<{ ok: true; consentCoupon?: boolean; activated?: number } | { ok: false; reason: 'denied' | 'unsupported' | 'failed' }> {
    if (!supported()) return { ok: false, reason: 'unsupported' };
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return { ok: false, reason: 'denied' };
        const { key } = (await (await fetch('/api/push', { cache: 'no-store' })).json()) as { key: string | null };
        if (!key) return { ok: false, reason: 'failed' };
        const reg = await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(key) as BufferSource }));
        const res = await fetch('/api/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub.toJSON(), marketing }),
        });
        if (!res.ok) return { ok: false, reason: 'failed' };
        const data = (await res.json()) as { consentCoupon?: boolean; activated?: number };
        return { ok: true, ...data };
    } catch {
        return { ok: false, reason: 'failed' };
    }
}

export async function disablePush(): Promise<void> {
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;
        await fetch('/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
    } catch {
        /* already gone */
    }
}
