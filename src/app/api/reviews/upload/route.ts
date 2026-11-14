import { jsonError, sameOrigin, sessionUserId } from '../../../../lib/api';
import { r2Config, r2Put } from '../../../../lib/r2';

export const runtime = 'edge';

const MAX_BYTES = 800 * 1024; // photos are shrunk in the browser first (about 150–400 KB); this is the hard cap
const TYPES: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

/** Upload one review photo to R2 and return its public URL. */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('로그인이 필요해요', 401);
    if (!r2Config()) return jsonError('사진 올리기는 준비 중이에요', 503);

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    const file = form.get('file');
    if (!(file instanceof Blob)) return jsonError('사진을 선택해 주세요');
    const ext = TYPES[file.type];
    if (!ext) return jsonError('JPG·PNG·WEBP 사진만 올릴 수 있어요');
    if (file.size > MAX_BYTES) return jsonError('사진 용량이 너무 커요');

    const month = new Date().toISOString().slice(0, 7);
    const key = `reviews/${month}/${crypto.randomUUID()}.${ext}`;
    try {
        const url = await r2Put(key, await file.arrayBuffer(), file.type);
        return Response.json({ url });
    } catch {
        return jsonError('사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.', 502);
    }
}
