// Kakao JavaScript SDK loader + "open the KakaoTalk app" login start (client side only).
// The JavaScript key is public by design (it only works on the web domains registered in the Kakao console).

const SDK_SRC = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
const JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || 'a51e591e18acabd1f22af0ee5d9a3e9d';

interface KakaoSdk {
    isInitialized(): boolean;
    init(key: string): void;
    Auth: {
        authorize(opts: { redirectUri: string; state?: string; scope?: string; throughTalk?: boolean }): void;
    };
}
declare global {
    interface Window {
        Kakao?: KakaoSdk;
    }
}

function loadSdk(): Promise<KakaoSdk> {
    if (window.Kakao) return Promise.resolve(window.Kakao);
    return new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
        const script = existing ?? document.createElement('script');
        const timer = setTimeout(() => reject(new Error('kakao sdk timeout')), 6000);
        script.addEventListener(
            'load',
            () => {
                clearTimeout(timer);
                window.Kakao ? resolve(window.Kakao) : reject(new Error('kakao sdk missing'));
            },
            { once: true },
        );
        script.addEventListener('error', () => reject(new Error('kakao sdk failed')), { once: true });
        if (!existing) {
            script.src = SDK_SRC;
            script.async = true;
            document.head.appendChild(script);
        }
    });
}

const randomState = () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Starts Kakao login. On a phone with KakaoTalk installed this opens the app ("동의하고 계속하기" only);
 * otherwise Kakao shows its normal web login. Rejects if the SDK cannot be used, so the caller can fall back.
 */
/** Start downloading the SDK early (call when the login page opens). */
export function preloadKakaoSdk(): void {
    loadSdk().catch(() => {});
}

export function startKakaoLogin(callbackPath: string): Promise<void> {
    // Already loaded: open KakaoTalk synchronously, inside the tap.
    if (window.Kakao) {
        runKakaoLogin(window.Kakao, callbackPath);
        return Promise.resolve();
    }
    return loadSdk().then((Kakao) => runKakaoLogin(Kakao, callbackPath));
}

function runKakaoLogin(Kakao: KakaoSdk, callbackPath: string): void {
    if (!Kakao.isInitialized()) Kakao.init(JS_KEY);
    const state = randomState();
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `oc_kstate=${state}; path=/; max-age=600; SameSite=Lax${secure}`;
    document.cookie = `oc_kcb=${encodeURIComponent(callbackPath)}; path=/; max-age=600; SameSite=Lax${secure}`;
    Kakao.Auth.authorize({
        redirectUri: `${window.location.origin}/api/kakao/callback`,
        state,
        scope: 'profile_nickname,account_email',
    });
}
