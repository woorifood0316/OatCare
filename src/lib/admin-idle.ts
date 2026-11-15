// 개인정보의 안전성 확보조치 기준: a person handling personal data is logged out after a period without use.
// The admin pages check a signed cookie renewed on every admin page view; after ADMIN_IDLE_HOURS without one the
// admin confirms with their social login again (customers are not affected).
import { encode, decode } from 'next-auth/jwt';

export const ADMIN_SEEN_COOKIE = 'oc_admin_seen';
import { ADMIN_IDLE_HOURS } from './admin-idle-const';
export { ADMIN_IDLE_HOURS };
const MAX_AGE = ADMIN_IDLE_HOURS * 3600;
/** A login this recent counts as active (the cookie is set right after, by the admin shell). */
const FRESH_LOGIN_MS = 10 * 60 * 1000;

function secret(): string {
    const s = process.env.AUTH_SECRET;
    if (!s) throw new Error('AUTH_SECRET is not set');
    return s;
}

export async function sealAdminSeen(uid: string): Promise<string> {
    return encode({ token: { uid }, secret: secret(), salt: ADMIN_SEEN_COOKIE, maxAge: MAX_AGE });
}

export const adminSeenCookieOptions = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge: MAX_AGE };

/** True when this admin used the admin pages within ADMIN_IDLE_HOURS, or has just logged in. */
export async function adminActive(uid: string, authAt: number | undefined, cookieValue: string | undefined): Promise<boolean> {
    if (authAt && Date.now() - authAt < FRESH_LOGIN_MS) return true;
    if (!cookieValue) return false;
    try {
        const t = await decode({ token: cookieValue, secret: secret(), salt: ADMIN_SEEN_COOKIE });
        return t?.uid === uid;
    } catch {
        return false;
    }
}
