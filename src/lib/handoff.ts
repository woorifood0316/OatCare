import { getSql } from './db';

/** How long a hand-over link works. */
const HANDOFF_SECONDS = 180;

async function sha256(text: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * A one-time login token for moving this member from an app's built-in browser (KakaoTalk, Naver app) to Chrome /
 * Safari, where the site can be added to the home screen. Only its hash is stored; 3 minutes, works once.
 */
export async function createHandoff(userId: string): Promise<string> {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const sql = getSql();
    await sql`delete from login_handoffs where expires_at < now() - interval '1 day'`;
    await sql`
        insert into login_handoffs (token_hash, user_id, expires_at)
        values (${await sha256(token)}, ${userId}, now() + (${HANDOFF_SECONDS} || ' seconds')::interval)
    `;
    return token;
}

/** The member the token belongs to, using it up; null when unknown, used or expired. */
export async function consumeHandoff(token: string): Promise<{ id: string; name: string | null; email: string | null } | null> {
    if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
    const rows = await getSql()`
        update login_handoffs h set used_at = now()
        from users u
        where h.token_hash = ${await sha256(token)} and h.used_at is null and h.expires_at > now() and u.id = h.user_id
        returning u.id, u.name, u.email
    `;
    const r = rows[0];
    return r ? { id: r.id as string, name: (r.name as string | null) ?? null, email: (r.email as string | null) ?? null } : null;
}

/** "모든 기기에서 로그아웃": every session carries the member's session_version; raising it ends them all. */
export async function endAllSessions(userId: string): Promise<void> {
    const sql = getSql();
    await sql`update users set session_version = session_version + 1 where id = ${userId}`;
    await sql`delete from login_handoffs where user_id = ${userId}`;
}
