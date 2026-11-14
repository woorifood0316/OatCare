import { getRequestContext } from '@cloudflare/next-on-pages';

/**
 * Keep work running after the response has been sent (Cloudflare's waitUntil). Outside Cloudflare (local dev) the
 * promise simply runs on. Errors are logged, never thrown: the visitor already has their answer.
 */
export function runInBackground(work: Promise<unknown>): void {
    const safe = work.catch((e) => console.error('[background]', e));
    try {
        getRequestContext().ctx.waitUntil(safe);
    } catch {
        void safe;
    }
}
