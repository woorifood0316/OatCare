import { getSql } from './db';

export type AccessOutcome = 'allowed' | 'anonymous' | 'not_admin' | 'idle';

/** Kept this long (the rule asks for at least 1 year). */
export const ACCESS_LOG_YEARS = 2;

/** Write one admin access (see db/access-log.sql). Never throws: logging must not block the admin pages. */
export async function logAdminAccess(e: {
    userId: string | null;
    outcome: AccessOutcome;
    method: string;
    path: string;
    ip: string | null;
    country: string | null;
    userAgent: string | null;
}): Promise<void> {
    try {
        await getSql()`
            insert into admin_access_log (user_id, outcome, method, path, ip, country, user_agent)
            values (${e.userId}, ${e.outcome}, ${e.method}, ${e.path.slice(0, 300)}, ${e.ip}, ${e.country}, ${e.userAgent?.slice(0, 300) ?? null})
        `;
    } catch (err) {
        console.error('[access-log]', err);
    }
}

export interface AccessRow {
    id: number;
    at: string;
    outcome: AccessOutcome;
    method: string;
    path: string;
    ip: string | null;
    country: string | null;
    userAgent: string | null;
    userName: string | null;
}

export async function listAccessLog(refusedOnly: boolean, limit = 300): Promise<AccessRow[]> {
    const rows = await getSql()`
        select l.*, u.name as user_name from admin_access_log l left join users u on u.id = l.user_id
        where (not ${refusedOnly} or l.outcome <> 'allowed')
        order by l.at desc limit ${limit}
    `;
    return rows.map((r) => ({
        id: Number(r.id),
        at: new Date(r.at as string).toISOString(),
        outcome: r.outcome as AccessOutcome,
        method: r.method as string,
        path: r.path as string,
        ip: (r.ip as string | null) ?? null,
        country: (r.country as string | null) ?? null,
        userAgent: (r.user_agent as string | null) ?? null,
        userName: (r.user_name as string | null) ?? null,
    }));
}

/** Refused attempts in the last 30 days (shown on the dashboard so a monthly look is easy). */
export async function refusedCount30d(): Promise<number> {
    try {
        const r = await getSql()`select count(*)::int n from admin_access_log where outcome <> 'allowed' and at > now() - interval '30 days'`;
        return (r[0]?.n as number) ?? 0;
    } catch {
        return 0;
    }
}

/** Daily: drop entries older than ACCESS_LOG_YEARS. */
export async function cleanupAccessLog(): Promise<number> {
    try {
        const r = await getSql()`delete from admin_access_log where at < now() - (${ACCESS_LOG_YEARS} || ' years')::interval returning id`;
        return r.length;
    } catch {
        return 0;
    }
}
