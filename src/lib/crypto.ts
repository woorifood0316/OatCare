// AES-256-GCM for secrets we must be able to read back (billing keys). WebCrypto, edge-safe.

function b64decode(s: string): Uint8Array {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

function b64encode(bytes: Uint8Array): string {
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
}

async function getKey(): Promise<CryptoKey> {
    const raw = process.env.BILLING_ENC_KEY;
    if (!raw) throw new Error('BILLING_ENC_KEY is not configured');
    const bytes = b64decode(raw);
    if (bytes.length !== 32) throw new Error('BILLING_ENC_KEY must be 32 bytes (base64)');
    return crypto.subtle.importKey('raw', bytes as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(plain: string): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await getKey(), new TextEncoder().encode(plain)));
    return `${b64encode(iv)}.${b64encode(ct)}`;
}

export async function decryptSecret(token: string): Promise<string> {
    const [ivB64, ctB64] = token.split('.');
    if (!ivB64 || !ctB64) throw new Error('bad secret format');
    const pt = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64decode(ivB64) as BufferSource },
        await getKey(),
        b64decode(ctB64) as BufferSource,
    );
    return new TextDecoder().decode(pt);
}
