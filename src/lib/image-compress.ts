// Shrink a photo in the browser before upload: longest side at most MAX_SIDE px, WebP (JPEG fallback), lowering the
// quality until it fits MAX_BYTES. A 5 MB phone photo usually ends up around 150–300 KB.

const MAX_SIDE = 1280;
const MAX_BYTES = 400 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('이미지를 읽지 못했어요'));
        };
        img.src = url;
    });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: File): Promise<Blob> {
    if (!file.type.startsWith('image/')) throw new Error('사진 파일만 올릴 수 있어요');
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('이미지를 처리하지 못했어요');
    ctx.fillStyle = '#fff'; // transparent PNGs become white, not black, as JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const webp = (await toBlob(canvas, 'image/webp', 0.8))?.type === 'image/webp';
    const type = webp ? 'image/webp' : 'image/jpeg';
    let quality = 0.82;
    let blob = await toBlob(canvas, type, quality);
    while (blob && blob.size > MAX_BYTES && quality > 0.45) {
        quality -= 0.1;
        blob = await toBlob(canvas, type, quality);
    }
    if (!blob) throw new Error('이미지를 처리하지 못했어요');
    return blob;
}
