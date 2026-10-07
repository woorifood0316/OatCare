// TEMPORARY test login for the payment-provider review. Credentials live in the test_logins table
// (password stored as a PBKDF2 hash). Deleting the row switches the test login off immediately.
import { getSql } from './db';

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

export async function hashPassword(password: string, salt: string): Promise<string> {
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 },
        key,
        256,
    );
    return hex(bits);
}

/** Returns the user id when the id/password match a test login row. */
export async function verifyTestLogin(loginId: string, password: string): Promise<string | null> {
    if (!loginId || !password || loginId.length > 64 || password.length > 128) return null;
    const rows = await getSql()`select user_id, salt, password_hash from test_logins where login_id = ${loginId}`;
    if (rows.length === 0) return null;
    const { user_id, salt, password_hash } = rows[0] as { user_id: string; salt: string; password_hash: string };
    const h = await hashPassword(password, salt);
    if (h.length !== password_hash.length) return null;
    let diff = 0;
    for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ password_hash.charCodeAt(i);
    return diff === 0 ? user_id : null;
}
