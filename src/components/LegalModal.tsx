'use client';

import React from 'react';
import { X, ShieldCheck, FileText, Award } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export type LegalModalType = 'privacy' | 'terms' | 'license' | null;

interface LegalModalProps {
    type: LegalModalType;
    onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
    useBodyScrollLock(!!type);

    if (!type) return null;

    const renderHeaderTitle = () => {
        if (type === 'privacy') return { icon: <ShieldCheck size={22} color="var(--oc-maroon)" />, title: '개인정보처리방침' };
        if (type === 'terms') return { icon: <FileText size={22} color="var(--oc-maroon)" />, title: '오트케어 이용약관' };
        return { icon: <Award size={22} color="var(--oc-maroon)" />, title: '우리종합식품 사업자등록증' };
    };

    const header = renderHeaderTitle();

    return (
        <div className="oc-modal-backdrop" onClick={onClose}>
            <div className="oc-legal-modal" onClick={(e) => e.stopPropagation()}>
                <div className="oc-legal-modal__header">
                    <div className="oc-legal-modal__title-box">
                        {header.icon}
                        <h2>{header.title}</h2>
                    </div>
                    <button className="oc-legal-modal__close" onClick={onClose} aria-label="닫기">
                        <X size={20} />
                    </button>
                </div>

                <div className="oc-legal-modal__body">
                    {type === 'license' ? (
                        <div className="oc-legal-license-box" style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--oc-brown)', marginBottom: '1rem', fontWeight: 600 }}>
                                상호: 우리종합식품 | 사업자등록번호: 850-27-00983 | 대표자: 윤영필
                            </p>
                            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--oc-line)', boxShadow: '0 8px 25px rgba(0,0,0,0.12)' }}>
                                <img
                                    src="/assets/woori.jpg"
                                    alt="우리종합식품 사업자등록증"
                                    style={{ width: '100%', height: 'auto', display: 'block' }}
                                />
                            </div>
                        </div>
                    ) : type === 'privacy' ? (
                        <div className="oc-legal-content">
                            <p className="oc-legal-intro">
                                우리종합식품(이하 '회사'라 함)은 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을 준수하고 있습니다.
                                본 방침은 회사가 제공하는 오트케어(OatCare) 서비스 이용 시 개인정보가 어떻게 수집, 이용, 보호되는지 안내합니다.
                            </p>

                            <section className="oc-legal-section">
                                <h3>1. 수집하는 개인정보 항목 및 수집방법</h3>
                                <p>회사는 주문 접수, 배송, CS 응대를 위해 아래와 같은 최소한의 개인정보를 수집합니다.</p>
                                <ul>
                                    <li><strong>주문/결제 시:</strong> 주문자 성명, 연락처(휴대전화번호), 이메일, 배송지 주소, 결제 정보</li>
                                    <li><strong>고객상담 시:</strong> 성명, 연락처, 상담내용</li>
                                    <li><strong>자동 수집 항목:</strong> 서비스 이용 기록, 접속 로그, 쿠키, 접속 IP 정보</li>
                                </ul>
                            </section>

                            <section className="oc-legal-section">
                                <h3>2. 개인정보의 수집 및 이용 목적</h3>
                                <ul>
                                    <li><strong>서비스 제공 및 이행:</strong> 오트케어 제품 주문 처리, 물품 배송, 구매 완료 안내</li>
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
                            </section>

                            <section className="oc-legal-section">
                                <h3>4. 개인정보의 제3자 제공 및 처리위탁</h3>
                                <p>회사는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다. 단, 상품 배송을 위해 필수적인 경우에 한하여 아래와 같이 위탁하고 있습니다.</p>
                                <ul>
                                    <li><strong>배송 위탁 업체:</strong> 택배사 (CJ대한통운, 롯데택배 등) - 물품 배송 업무</li>
                                </ul>
                            </section>

                            <section className="oc-legal-section">
                                <h3>5. 개인정보 보호책임자 안내</h3>
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
                                이 약관은 우리종합식품(전자상거래 사업자)이 운영하는 오트케어(OatCare) 온라인 쇼핑몰에서 제공하는 인터넷 관련 서비스(이하 '서비스')를 이용함에 있어 사이트와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
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
                            </section>

                            <section className="oc-legal-section">
                                <h3>제4조 (배송 및 청약철회/환불)</h3>
                                <p>1. 회사는 이용자와 재화 등의 공급시기에 관하여 별도의 약정이 없는 한, 청약을 한 날부터 3일 이내에 재화 등을 배송할 수 있도록 필요한 조치를 취합니다.</p>
                                <p>2. 식품의 특성상 포장이 훼손되었거나 개봉 후 상품 가치가 현저히 상실된 경우 청약철회가 제한될 수 있습니다.</p>
                            </section>

                            <section className="oc-legal-section">
                                <h3>제5조 (분쟁해결 및 관할법원)</h3>
                                <p>1. 회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 피해보상처리기구를 설치·운영합니다.</p>
                                <p>2. 회사와 이용자 간에 발생한 전자상거래 분쟁과 관련하여 이용자의 피해구제신청이 있는 경우에는 공정거래위원회 또는 시·도지사가 의뢰하는 분쟁조정기관의 조정에 따를 수 있습니다.</p>
                            </section>
                        </div>
                    )}
                </div>

                <div className="oc-legal-modal__footer">
                    <button className="oc-cta-fill" onClick={onClose} style={{ width: '100%', padding: '0.8rem', justifyContent: 'center', textAlign: 'center' }}>
                        확인 및 닫기
                    </button>
                </div>
            </div>
        </div>
    );
};
