// Upload to Cloudflare R2 through its S3-compatible API (AWS Signature V4, Web Crypto only, so it runs on the edge).
// Needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_URL (the bucket's public URL).

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

export function r2Config() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secret = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (!accountId || !accessKeyId || !secret || !bucket || !publicUrl) return null;
    return { accountId, accessKeyId, secret, bucket, publicUrl: publicUrl.replace(/\/$/, '') };
}

/** PUT an object; returns its public URL. Throws on failure. */
export async function r2Put(key: string, body: ArrayBuffer, contentType: string): Promise<string> {
    const cfg = r2Config();
    if (!cfg) throw new Error('R2 is not configured');
    const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
    const path = `/${cfg.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
    const date = amzDate.slice(0, 8);
    const region = 'auto';
    const payloadHash = await sha256(body);

    const headers: Record<string, string> = {
        'content-type': contentType,
        host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
    };
    const signedHeaders = Object.keys(headers).sort().join(';');
    const canonicalHeaders = Object.keys(headers)
        .sort()
        .map((h) => `${h}:${headers[h]}\n`)
        .join('');
    const canonicalRequest = ['PUT', path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const scope = `${date}/${region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256(canonicalRequest)].join('\n');

    let k = await hmac(enc.encode(`AWS4${cfg.secret}`), date);
    k = await hmac(k, region);
    k = await hmac(k, 's3');
    k = await hmac(k, 'aws4_request');
    const signature = hex(await hmac(k, stringToSign));

    const res = await fetch(`https://${host}${path}`, {
        method: 'PUT',
        headers: {
            ...headers,
            authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
        },
        body,
    });
    if (!res.ok) throw new Error(`R2 upload failed: ${res.status}`);
    return `${cfg.publicUrl}/${key}`;
}
