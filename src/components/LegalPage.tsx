'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, FileText, X, Printer, Share2, Info } from 'lucide-react';
import { PrivacyContent, TermsContent } from './LegalContent';

interface LegalPageProps {
    type: 'privacy' | 'terms';
    onGoBack: () => void;
}

// In-app WebView browsers (KakaoTalk, Naver, Instagram, Facebook, Line) commonly
// don't implement window.print() at all -- it silently does nothing. Detecting
// them lets us warn up front instead of leaving a dead-looking button.
const detectInAppBrowser = (): string | null => {
    const ua = navigator.userAgent || '';
    if (/KAKAOTALK/i.test(ua)) return '카카오톡';
    if (/NAVER\(/i.test(ua)) return '네이버';
    if (/Instagram/i.test(ua)) return '인스타그램';
    if (/FBAN|FBAV/i.test(ua)) return '페이스북';
    if (/Line\//i.test(ua)) return '라인';
    return null;
};

export const LegalPage: React.FC<LegalPageProps> = ({ type, onGoBack }) => {
    const isPrivacy = type === 'privacy';
    const [isMobile, setIsMobile] = useState(false);
    const [inAppBrowserName, setInAppBrowserName] = useState<string | null>(null);
    const [copiedToast, setCopiedToast] = useState(false);
    const [showActionMenu, setShowActionMenu] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = isPrivacy ? '개인정보처리방침 | 참오트케어' : '이용약관 | 참오트케어';
        setIsMobile(window.innerWidth <= 768);
        setInAppBrowserName(detectInAppBrowser());
    }, [isPrivacy]);

    const handlePrint = () => {
        window.print();
    };

    const getShareData = () => ({
        title: document.title,
        text: isPrivacy ? '참오트케어 개인정보처리방침' : '참오트케어 이용약관',
        url: window.location.href,
    });

    // Returns true once the share attempt is "handled" (succeeded, or the user
    // deliberately cancelled it) -- false only when it genuinely never happened,
    // so the caller knows whether it's worth falling further back.
    const attemptShare = async (): Promise<boolean> => {
        if (typeof navigator.share !== 'function') return false;
        try {
            await navigator.share(getShareData());
            return true;
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return true;
            return false;
        }
    };

    const copyLinkFallback = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopiedToast(true);
            setTimeout(() => setCopiedToast(false), 4500);
        } catch (_) { }
    };

    // In-app browsers (Kakao etc.) don't reliably support share OR print, so
    // there's nothing to choose between -- just try share, then fall all the
    // way back to copying the link so tapping the button always does
    // *something* visible.
    const runAutoFallbackChain = async () => {
        const shared = await attemptShare();
        if (shared) return;
        await copyLinkFallback();
    };

    // Real browsers (Samsung Internet, Chrome, Safari) support share AND print
    // independently -- picking one automatically meant tapping the button only
    // ever did whichever came first (share), so "저장하기" was unreachable.
    // Let the user choose instead.
    const handleActionButtonClick = () => {
        const canChoose = !inAppBrowserName && typeof navigator.share === 'function' && typeof window.print === 'function';
        if (canChoose) {
            setShowActionMenu(true);
            return;
        }
        runAutoFallbackChain();
    };

    return (
        <div className="oc-legal-page">
            {/* Header / Brand Top Bar */}
            <header className="oc-legal-page__header">
                <div className="oc-legal-page__header-inner">
                    <button className="oc-legal-page__back-btn" onClick={onGoBack}>
                        <X size={18} />
                        <span>닫기</span>
                    </button>

                    <div className="oc-legal-page__brand">
                        <img src="/assets/oatcare-logo.png" alt="chamoatcare Logo" style={{ height: '1.8rem', borderRadius: '4px' }} />
                        <strong style={{ fontSize: '1.1rem', color: 'var(--oc-maroon)', fontWeight: 800 }}>참오트케어</strong>
                    </div>

                    {isMobile ? (
                        <div className="oc-legal-page__action-wrap">
                            <button className="oc-legal-page__print-btn" onClick={handleActionButtonClick}>
                                <Share2 size={16} />
                                <span>공유/저장하기</span>
                            </button>

                            {showActionMenu && (
                                <>
                                    <div
                                        className="oc-legal-page__menu-backdrop"
                                        onClick={() => setShowActionMenu(false)}
                                    />
                                    <div className="oc-legal-page__action-menu">
                                        <button
                                            onClick={async () => {
                                                setShowActionMenu(false);
                                                const shared = await attemptShare();
                                                if (!shared) await copyLinkFallback();
                                            }}
                                        >
                                            <Share2 size={16} />
                                            <span>공유하기</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowActionMenu(false);
                                                window.print();
                                            }}
                                        >
                                            <Printer size={16} />
                                            <span>저장하기</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <button className="oc-legal-page__print-btn" onClick={handlePrint}>
                            <Printer size={16} />
                            <span>인쇄하기</span>
                        </button>
                    )}
                </div>
            </header>

            {copiedToast && (
                <div className="oc-legal-page__toast">
                    <strong>링크가 복사되었습니다</strong>
                    <span>현재 브라우저에서는 공유하기만 가능합니다.</span>
                    <span>저장이 필요하신 경우 Chrome 등 다른 브라우저를 이용해 주세요.</span>
                </div>
            )}

            {/* Main Content Container */}
            <main className="oc-legal-page__container">
                <div className="oc-legal-page__card">
                    <div className="oc-legal-page__title-area">
                        {isPrivacy ? <ShieldCheck size={32} color="var(--oc-maroon)" /> : <FileText size={32} color="var(--oc-maroon)" />}
                        <h1>{isPrivacy ? '개인정보처리방침' : '참오트케어 이용약관'}</h1>
                        <p className="oc-legal-page__meta">시행일자: 2026년 1월 1일 | 우리종합식품 (chamoatcare)</p>
                    </div>

                    {isMobile && inAppBrowserName && (
                        <div className="oc-legal-page__inapp-notice">
                            <Info size={16} />
                            <span>
                                {inAppBrowserName} 브라우저에서는 공유하기만 가능합니다. 저장이 필요하신 경우 Chrome 등 다른 브라우저를 이용해 주세요.
                            </span>
                        </div>
                    )}

                    {isPrivacy ? (
                        <PrivacyContent />
                    ) : (
                        <TermsContent />
                    )}

                    <div className="oc-legal-page__footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                        <button
                            className="oc-cta-fill"
                            onClick={onGoBack}
                            style={{ width: '100%', maxWidth: '320px', padding: '0.85rem', justifyContent: 'center', textAlign: 'center' }}
                        >
                            확인 및 닫기
                        </button>
                        <p>© 2026 우리종합식품 (chamoatcare). All rights reserved.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};
