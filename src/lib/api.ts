import { cookies } from 'next/headers';
import { auth } from '../auth';
import { ADMIN_SEEN_COOKIE, adminActive } from './admin-idle';
import { getSql } from './db';

/** CSRF guard for cookie-authenticated mutations: only same-origin requests. */
export function sameOrigin(request: Request): boolean {
    const origin = request.headers.get('origin');
    if (!origin) return false;
    try {
        return new URL(origin).host === new URL(request.url).host;
    } catch {
        return false;
    }
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
    return Response.json({ error: message, ...extra }, { status });
}

/** Logged-in user's id from the session, or null. */
export async function sessionUserId(): Promise<string | null> {
    const session = await auth();
    return session?.user?.id ?? null;
}

/** Admin check is done against the DB on every request (never trust the JWT for roles). */
export async function requireAdmin(): Promise<{ id: string } | null> {
    const session = await auth();
    const id = session?.user?.id;
    if (!id) return null;
    const rows = await getSql()`select role from users where id = ${id}`;
    if (rows[0]?.role !== 'admin') return null;
    // Unused for 12 hours: no customer data until the admin logs in again (lib/admin-idle.ts).
    const jar = await cookies();
    return (await adminActive(id, session.authAt, jar.get(ADMIN_SEEN_COOKIE)?.value)) ? { id } : null;
}

export function isUuid(value: unknown): value is string {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export { addDays, todayKst } from './dates';
