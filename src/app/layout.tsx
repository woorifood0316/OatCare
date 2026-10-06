import type { Metadata } from 'next';
import '../index.css';
import { Providers } from '../components/Providers';
import { getAssetUrl, R2_BASE_URL } from '../utils/assets';

const SITE_URL = 'https://chamoatcare.com';

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: '/' },
    openGraph: {
        type: 'website',
        url: SITE_URL,
        siteName: '참오트케어',
        locale: 'ko_KR',
        title: '참오트케어 — 바쁜 아침을 위한 5가지 맛 오트밀',
        description: '물이나 우유를 붓고 30초면 완성되는 참오트케어 오트밀. 5가지 맛, 정기구독 시 5% 추가 할인과 첫 회 쉐이커 보틀 증정 (최소 2회 이용).',
        images: ['/assets/og-logo-512.png'],
    },
    title: '참오트케어 — 바쁜 아침을 위한 5가지 맛 오트밀',
    description: '물이나 우유를 붓고 30초면 완성되는 참오트케어 오트밀. 5가지 맛, 정기구독 시 5% 추가 할인과 첫 회 쉐이커 보틀 증정 (최소 2회 이용).',
    // Static files in /public (not app/icon.*): next-on-pages rejects metadata-file routes without an edge runtime.
    // Google wants a square favicon whose size is a multiple of 48px.
    icons: {
        icon: [
            { url: '/favicon.ico', sizes: '48x48' },
            { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
        ],
        apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko">
            <head>
                <link rel="preconnect" href={R2_BASE_URL} />
                <link
                    rel="preload"
                    as="image"
                    href={getAssetUrl('/assets/chamoatcare-logo-512.webp')}
                    imageSrcSet={`${getAssetUrl('/assets/chamoatcare-logo-256.webp')} 256w, ${getAssetUrl('/assets/chamoatcare-logo-512.webp')} 512w`}
                    imageSizes="(max-width: 800px) 72px, 112px"
                />
                <link
                    rel="stylesheet"
                    as="style"
                    crossOrigin="anonymous"
                    href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
                />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'WebSite',
                            name: '참오트케어',
                            alternateName: ['chamoatcare', '참오트케어 chamoatcare'],
                            url: 'https://chamoatcare.com/',
                        }),
                    }}
                />
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
