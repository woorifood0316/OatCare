// Cloudflare Workers AI (free daily allowance). Two ways to reach it, whichever is set up:
//  1. The Pages binding named "AI" (Pages > Settings > Bindings > Workers AI)  - no key needed
//  2. The REST API with CF_ACCOUNT_ID (or R2_ACCOUNT_ID) + CF_AI_TOKEN (API token with "Workers AI" permission)
// Any failure returns null; callers then fall back to a plain text match or a human answer.

import { getRequestContext } from '@cloudflare/next-on-pages';

/**
 * A model that answers straight away (no hidden "thinking" step: the first choice, glm-4.7-flash, spent its tokens
 * thinking and returned nothing). Override with AI_MODEL (any Workers AI text-generation model).
 */
const DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

type AiBinding = { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };

function binding(): AiBinding | null {
    try {
        const env = getRequestContext().env as Record<string, unknown>;
        const ai = env.AI as AiBinding | undefined;
        return ai && typeof ai.run === 'function' ? ai : null;
    } catch {
        return null; // not running on Cloudflare (local dev)
    }
}

export function workersAiReady(): boolean {
    return Boolean(binding() || ((process.env.CF_ACCOUNT_ID || process.env.R2_ACCOUNT_ID) && process.env.CF_AI_TOKEN));
}

/** Text out of the different response shapes Workers AI models use. */
function textOf(out: unknown): string {
    const o = (out ?? {}) as Record<string, unknown>;
    const r = (o.result ?? o) as Record<string, unknown>;
    if (typeof r.response === 'string') return r.response;
    if (typeof r.response === 'number') return String(r.response);
    const choices = r.choices as { message?: { content?: unknown }; text?: unknown }[] | undefined;
    const c = choices?.[0];
    if (c) {
        if (typeof c.message?.content === 'string') return c.message.content;
        if (typeof c.text === 'string') return c.text;
    }
    return '';
}

export async function runChat(system: string, user: string, maxTokens = 32): Promise<string | null> {
    const model = process.env.AI_MODEL || DEFAULT_MODEL;
    const input = {
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ],
        max_tokens: maxTokens,
        temperature: 0,
    };
    try {
        const ai = binding();
        if (ai) return textOf(await ai.run(model, input));

        const account = process.env.CF_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
        const token = process.env.CF_AI_TOKEN;
        if (!account || !token) return null;
        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
            console.error('[workers-ai]', res.status, (await res.text()).slice(0, 300));
            return null;
        }
        return textOf(await res.json());
    } catch (e) {
        console.error('[workers-ai] failed', e);
        return null;
    }
}
