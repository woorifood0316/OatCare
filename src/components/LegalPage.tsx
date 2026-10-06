'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, FileText, X, Printer, Share2, Info } from 'lucide-react';

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
                        <div className="oc-legal-content">
                            <p className="oc-legal-intro">
                                우리종합식품(이하 '회사'라 함)은 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을 준수하고 있습니다.
                                본 방침은 회사가 제공하는 참오트케어(chamoatcare) 서비스 이용 시 개인정보가 어떻게 수집, 이용, 보호되는지 안내합니다.
                            </p>

                            <section className="oc-legal-section">
                                <h3>1. 수집하는 개인정보 항목 및 수집방법</h3>
                                <p>회사는 주문 접수, 배송, CS 응대를 위해 아래와 같은 최소한의 개인정보를 수집합니다.</p>
                                <ul>
                                    <li><strong>회원가입(소셜 로그인) 시:</strong> 카카오 - 닉네임(필수), 이메일(선택) / 네이버 - 이름(필수), 이메일(선택) / 구글 - 이름, 이메일 / 마케팅 정보 수신 동의 여부(선택). 이용자가 직접 입력하는 항목은 없으며, 각 소셜 로그인 제공사의 동의 화면에서 동의한 정보만 전달받습니다.</li>
                                    <li><strong>주문/결제 시:</strong> 수령인 성명, 연락처(휴대전화번호), 배송지 주소, 배송 요청사항, 주문 및 결제 내역(결제수단 종류, 카드사명과 일부가 가려진 카드번호). 카드번호 전체·유효기간·비밀번호는 회사가 저장하지 않으며 결제대행사가 처리합니다.</li>
                                    <li><strong>정기구독 이용 시:</strong> 구독 상품·배송 주기·결제일, 결제대행사가 발급한 자동결제 키(빌링키, 암호화하여 보관), 정기결제 내역</li>
                                    <li><strong>고객상담 시:</strong> 성명, 연락처, 상담내용</li>
                                    <li><strong>자동 수집 항목:</strong> 서비스 이용 기록, 접속 로그, 쿠키, 접속 IP 정보</li>
                                </ul>
                            </section>

                            <section className="oc-legal-section">
                                <h3>2. 개인정보의 수집 및 이용 목적</h3>
                                <ul>
                                    <li><strong>서비스 제공 및 이행:</strong> 참오트케어 제품 주문 처리, 물품 배송, 구매 완료 안내</li>
                                    <li><strong>정기결제:</strong> 이용자가 정한 주기에 따른 자동 결제, 결제 예정·실패·변경 안내, 환불 처리</li>
                                    <li><strong>알림 발송:</strong> 주문·결제·배송 상태 안내 (이메일 등, 카카오톡 알림 도입 시 사전 고지)</li>
                                    <li><strong>고객 관리:</strong> 본인 확인, 고객상담 및 민원 처리, 고지사항 전달</li>
                                    <li><strong>마케팅 및 서비스 개선:</strong> 신제품 안내 및 혜택 제공 (동의 시)</li>
                                </ul>
                            </section>

                            <section className="oc-legal-section">
                                <h3>3. 개인정보의 보유 및 이용 기간</h3>
                                <p>
                                    원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.
                                    단, 관계 법령에 따라 보존할 필요가 있는 경우 아래 기간 동안 보관합니다.
                                </p>
                                <ul>
                                    <li><strong>계약 또는 청약철회 등에 관한 기록:</strong> 5년 (전자상거래법)</li>
                                    <li><strong>대금결제 및 재화 등의 공급에 관한 기록:</strong> 5년 (전자상거래법)</li>
                                    <li><strong>소비자의 불만 또는 분쟁처리에 관한 기록:</strong> 3년 (전자상거래법)</li>
                                </ul>
                                <p>
                                    <strong>회원 탈퇴 시:</strong> 회원정보, 연결된 로그인 정보, 배송지, 등록한 카드(자동결제 키), 장바구니, 정기구독 정보는 즉시 삭제됩니다.
                                    위 법령에 따라 보관해야 하는 주문·결제 기록은 회원 정보와 분리하여 해당 기간 동안만 보관한 뒤 파기합니다.
                                </p>
                            </section>

                            <section className="oc-legal-section">
                                <h3>4. 개인정보의 제3자 제공 및 처리위탁</h3>
                                <p>회사는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다. 단, 상품 배송을 위해 필수적인 경우에 한하여 아래와 같이 위탁하고 있습니다.</p>
                                <ul>
                                    <li><strong>배송 위탁 업체:</strong> 택배사 (CJ대한통운, 롯데택배 등) - 물품 배송 업무</li>
                                    <li><strong>결제 처리:</strong> 토스페이먼츠(주) - 결제 승인·취소, 정기결제(자동결제) 처리</li>
                                    <li><strong>알림 발송:</strong> 이메일 발송 대행업체 - 주문·결제·배송 안내 메일 발송 (카카오 알림톡 등 메시지 발송 대행사를 이용하게 되는 경우 본 방침에 먼저 알려드립니다)</li>
                                    <li><strong>회원정보 보관(DB):</strong> Neon, Inc. - 회원정보 저장 및 관리</li>
                                    <li><strong>웹사이트 호스팅:</strong> Cloudflare, Inc. - 서비스 운영 및 접속 처리</li>
                                </ul>
                            </section>

                            <section className="oc-legal-section">
                                <h3>5. 개인정보의 국외 이전</h3>
                                <p>서비스 운영을 위해 아래와 같이 개인정보가 국외 서버에 저장·처리될 수 있습니다.</p>
                                <ul>
                                    <li><strong>Neon, Inc.</strong> (서버 위치: 싱가포르) - 회원·주문·구독 정보의 저장 및 관리 / 회원 탈퇴 또는 보유기간 종료 시까지</li>
                                    <li><strong>Cloudflare, Inc.</strong> (전 세계 네트워크) - 웹사이트 호스팅 및 접속 정보 처리 / 서비스 이용 기간</li>
                                </ul>
                                <p>국외 이전에 동의하지 않으실 경우 서비스 가입·이용이 제한될 수 있으며, 이전을 원하지 않는 경우 개인정보 보호책임자에게 문의해 주세요.</p>
                            </section>

                            <section className="oc-legal-section">
                                <h3>6. 개인정보 보호책임자 안내</h3>
                                <p>회사는 개인정보를 보호하고 관련 불만 처리를 위해 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
                                <div className="oc-legal-contact-card">
                                    <p><strong>개인정보 보호책임자:</strong> 윤영필 (대표)</p>
                                    <p><strong>전화번호:</strong> 031-998-7234</p>
                                    <p><strong>이메일:</strong> yyp0606@naver.com</p>
                                </div>
                            </section>
                        </div>
                    ) : (
                        <div className="oc-legal-content">
                            <p className="oc-legal-intro">
                                이 약관은 우리종합식품(전자상거래 사업자)이 운영하는 참오트케어(chamoatcare) 온라인 쇼핑몰에서 제공하는 인터넷 관련 서비스(이하 '서비스')를 이용함에 있어 사이트와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
                            </p>

                            <section className="oc-legal-section">
                                <h3>제1조 (정의)</h3>
                                <p>1. '사이트'란 회사가 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 재화 등을 거래할 수 있도록 설정한 가상의 영업장을 말합니다.</p>
                                <p>2. '이용자'란 사이트에 접속하여 이 약관에 따라 회사가 제공하는 서비스를 받는 구매 고객을 말합니다.</p>
                            </section>

                            <section className="oc-legal-section">
                                <h3>제2조 (약관의 효력과 개정)</h3>
                                <p>1. 본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.</p>
                                <p>2. 회사는 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.</p>
                            </section>

                            <section className="oc-legal-section">
                                <h3>제3조 (구매신청 및 결제)</h3>
                                <p>이용자는 사이트 상에서 아래의 방법에 의하여 구매를 신청하며, 회사는 이용자가 구매신청을 함에 있어 다음의 내용을 알기 쉽게 제공하여야 합니다.</p>
                                <ul>
                                    <li>재화 등의 검색 및 선택</li>
                                    <li>받는 사람의 성명, 주소, 전화번호, 이메일 주소 등의 입력</li>
                                    <li>결제방법의 선택 및 결제금액 확인</li>
                                </ul>
                                <p>배송비는 주문 화면에 표시된 금액에 따르며, 결제 전에 최종 결제 금액을 확인할 수 있습니다.</p>
                            </section>

                            <section className="oc-legal-section">
                                <h3>제4조 (정기구독)</h3>
                                <p>1. 정기구독은 이용자가 정한 배송 주기(일 단위)마다 등록된 카드로 자동 결제되고 상품이 배송되는 서비스입니다.</p>
                                <p>2. 회사는 정기구독 신청 시 구독 상품, 배송 주기, 회당 결제 금액, 첫 결제일과 다음 결제일, 해지 방법을 알리고 이용자의 동의를 받습니다. 신청 즉시 첫 회차가 결제됩니다.</p>
                                <p>3. 이용자는 마이페이지에서 언제든지 배송 주기·결제일·수량·배송지·결제 카드를 변경하거나, 회차를 건너뛰거나, 일시정지·해지할 수 있습니다. 해지하면 이후 회차의 결제와 배송이 중단됩니다.</p>
                                <p>4. 결제에 실패한 경우 회사는 3일 간격으로 최대 3회 다시 결제를 시도하며, 계속 실패하면 정기구독이 일시정지됩니다. 이용자는 카드를 확인한 뒤 마이페이지에서 다시 결제할 수 있습니다.</p>
                                <p>5. 상품 가격이나 정기구독 혜택이 변경되는 경우 회사는 변경된 가격으로 결제되기 전에 이용자에게 미리 알립니다.</p>
                                <p>6. 이미 결제되어 발송된 회차의 청약철회 및 환불은 제5조에 따릅니다.</p>
                            </section>

                            <section className="oc-legal-section">
                                <h3>제5조 (배송 및 청약철회/환불)</h3>
                                <p>1. 회사는 이용자와 재화 등의 공급시기에 관하여 별도의 약정이 없는 한, 청약을 한 날부터 3일 이내에 재화 등을 배송할 수 있도록 필요한 조치를 취합니다.</p>
                                <p>2. 식품의 특성상 포장이 훼손되었거나 개봉 후 상품 가치가 현저히 상실된 경우 청약철회가 제한될 수 있습니다.</p>
                                <p>3. 이용자는 상품이 발송되기 전에는 마이페이지에서 주문을 직접 취소할 수 있으며, 결제 금액은 전액 환불됩니다. 발송 이후의 취소·반품은 고객센터를 통해 접수합니다.</p>
                                <p>4. 환불은 결제하신 수단으로 이루어지며, 카드사에 따라 영업일 기준 3~5일이 소요될 수 있습니다.</p>
                            </section>

                            <section className="oc-legal-section">
                                <h3>제6조 (분쟁해결 및 관할법원)</h3>
                                <p>1. 회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 피해보상처리기구를 설치·운영합니다.</p>
                                <p>2. 회사와 이용자 간에 발생한 전자상거래 분쟁과 관련하여 이용자의 피해구제신청이 있는 경우에는 공정거래위원회 또는 시·도지사가 의뢰하는 분쟁조정기관의 조정에 따를 수 있습니다.</p>
                            </section>
                        </div>
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
