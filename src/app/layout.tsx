import type { Metadata } from 'next';
import '../index.css';

export const metadata: Metadata = {
    title: 'OatCare 오트케어 — 바쁜 아침을 위한 5가지 맛 오트밀',
    description: '한 봉지 50g, 물이나 우유를 붓고 30초면 완성되는 오트케어. 바쁜 아침을 든든하고 건강하게 체인지하세요.',
    icons: {
        icon: '/assets/oatcare-logo.png',
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
            <body>{children}</body>
        </html>
    );
}
