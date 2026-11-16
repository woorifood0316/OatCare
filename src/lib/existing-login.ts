// Someone tries to sign up with another social login but already has an account: show which login they used.
import { getSql } from './db';

/** The social login (kakao / naver / google) of the member who already uses this email, or null. */
export async function existingLoginFor(email: string | null | undefined): Promise<string | null> {
    const e = email?.trim().toLowerCase();
    if (!e) return null;
    const rows = await getSql()`
        select a.provider from accounts a join users u on u.id = a.user_id
        where lower(a.email) = ${e} or lower(u.email) = ${e}
        order by a.created_at limit 1
    `;
    return (rows[0]?.provider as string | undefined) ?? null;
}
