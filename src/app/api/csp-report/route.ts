export const runtime = 'edge';

/**
 * What the browser would have blocked under the report-only Content Security Policy (next.config.mjs).
 * Only the rule, the blocked source (origin only) and the page path are logged - never query strings or user data.
 */
export async function POST(request: Request) {
    let reports: Record<string, unknown>[] = [];
    try {
        const body = (await request.json()) as unknown;
        // legacy report-uri: { "csp-report": {...} }; Reporting API: [{ type, body: {...} }]
        if (Array.isArray(body)) reports = body.map((r) => ((r as { body?: Record<string, unknown> }).body ?? {}) as Record<string, unknown>);
        else if (body && typeof body === 'object') reports = [((body as Record<string, unknown>)['csp-report'] ?? body) as Record<string, unknown>];
    } catch {
        return new Response(null, { status: 204 });
    }
    for (const r of reports.slice(0, 10)) {
        const directive = String(r['effective-directive'] ?? r.effectiveDirective ?? r['violated-directive'] ?? '').slice(0, 60);
        const blocked = originOnly(String(r['blocked-uri'] ?? r.blockedURL ?? ''));
        const page = pathOnly(String(r['document-uri'] ?? r.documentURL ?? ''));
        console.warn('[csp-report]', JSON.stringify({ directive, blocked, page }));
    }
    return new Response(null, { status: 204 });
}

function originOnly(u: string): string {
    if (!u || !u.includes(':')) return u.slice(0, 40); // 'inline', 'eval', 'data' ...
    try {
        return new URL(u).origin;
    } catch {
        return u.slice(0, 40);
    }
}
function pathOnly(u: string): string {
    try {
        return new URL(u).pathname.slice(0, 120);
    } catch {
        return '';
    }
}
