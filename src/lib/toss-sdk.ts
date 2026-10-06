'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
    interface Window {
        TossPayments?: (clientKey: string) => any;
    }
}

const SDK_SRC = 'https://js.tosspayments.com/v2/standard';

/** Loads the Toss Payments browser SDK once. */
export function loadTossSdk(): Promise<void> {
    if (window.TossPayments) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
        const script = existing ?? document.createElement('script');
        script.addEventListener('load', () => resolve(), { once: true });
        script.addEventListener('error', () => reject(new Error('toss sdk')), { once: true });
        if (!existing) {
            script.src = SDK_SRC;
            script.async = true;
            document.head.appendChild(script);
        }
    });
}
