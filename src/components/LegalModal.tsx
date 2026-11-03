'use client';

import React from 'react';
import { X, ShieldCheck, FileText, Award } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { PrivacyContent, TermsContent } from './LegalContent';

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
        if (type === 'terms') return { icon: <FileText size={22} color="var(--oc-maroon)" />, title: '참오트케어 이용약관' };
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
                        <PrivacyContent />
                    ) : (
                        <TermsContent />
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
