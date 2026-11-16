// Cloudflare R2 through its S3-compatible API (AWS Signature V4, Web Crypto only, so it runs on the edge).
// Needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and
//  - R2_BUCKET + R2_PUBLIC_URL: the public bucket (review photos, shown to everyone)
//  - R2_PRIVATE_BUCKET: a bucket WITHOUT public access (exchange/return evidence: shown only through
//    /api/returns/photo to the member who sent it and to admins)

const enc = new TextEncoder();

function hex(buf: ArrayBuffer): string {
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function sha256(data: ArrayBuffer | Uint8Array | string): Promise<string> {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    return hex(await crypto.subtle.digest('SHA-256', bytes));
}
async function hmac(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
    const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return crypto.subtle.sign('HMAC', k, enc.encode(msg));
}

function credentials() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secret = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secret) return null;
    return { accountId, accessKeyId, secret };
}

/** The public bucket (review photos). */
export function r2Config() {
    const c = credentials();
    const bucket = process.env.R2_BUCKET;
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (!c || !bucket || !publicUrl) return null;
    return { ...c, bucket, publicUrl: publicUrl.replace(/\/$/, '') };
}

/** The private bucket (return evidence), or null when it is not set up. */
export function r2PrivateConfig() {
    const c = credentials();
    const bucket = process.env.R2_PRIVATE_BUCKET;
    if (!c || !bucket) return null;
    return { ...c, bucket };
}

/** A signed request to R2. */
async function r2Fetch(
    cfg: { accountId: string; accessKeyId: string; secret: string; bucket: string },
    method: 'PUT' | 'GET',
    key: string,
    body?: ArrayBuffer,
    contentType?: string,
): Promise<Response> {
    const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
    const path = `/${cfg.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
    const date = amzDate.slice(0, 8);
    const region = 'auto';
    const payloadHash = body ? await sha256(body) : await sha256('');

    const headers: Record<string, string> = {
        ...(contentType ? { 'content-type': contentType } : {}),
        host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
    };
    const signedHeaders = Object.keys(headers).sort().join(';');
    const canonicalHeaders = Object.keys(headers)
        .sort()
        .map((h) => `${h}:${headers[h]}\n`)
        .join('');
    const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const scope = `${date}/${region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256(canonicalRequest)].join('\n');

    let k = await hmac(enc.encode(`AWS4${cfg.secret}`), date);
    k = await hmac(k, region);
    k = await hmac(k, 's3');
    k = await hmac(k, 'aws4_request');
    const signature = hex(await hmac(k, stringToSign));

    return fetch(`https://${host}${path}`, {
        method,
        headers: {
            ...headers,
            authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
        },
        body,
    });
}

/** PUT into the public bucket; returns its public URL. Throws on failure. */
export async function r2Put(key: string, body: ArrayBuffer, contentType: string): Promise<string> {
    const cfg = r2Config();
    if (!cfg) throw new Error('R2 is not configured');
    const res = await r2Fetch(cfg, 'PUT', key, body, contentType);
    if (!res.ok) throw new Error(`R2 upload failed: ${res.status}`);
    return `${cfg.publicUrl}/${key}`;
}

/** PUT into the private bucket. Throws on failure. */
export async function r2PutPrivate(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
    const cfg = r2PrivateConfig();
    if (!cfg) throw new Error('Private R2 bucket is not configured');
    const res = await r2Fetch(cfg, 'PUT', key, body, contentType);
    if (!res.ok) throw new Error(`R2 private upload failed: ${res.status}`);
}

/** GET from the private bucket: the object, or null when it does not exist. */
export async function r2GetPrivate(key: string): Promise<{ body: ReadableStream<Uint8Array> | null; contentType: string } | null> {
    const cfg = r2PrivateConfig();
    if (!cfg) return null;
    const res = await r2Fetch(cfg, 'GET', key);
    if (!res.ok) return null;
    return { body: res.body, contentType: res.headers.get('content-type') ?? 'application/octet-stream' };
}
