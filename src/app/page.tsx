'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { slugForFlavor, slugForSetName } from '../lib/products';
import { ScrollScrubHero } from '../components/ScrollScrubHero';
import { QuickPurchaseDrawer } from '../components/QuickPurchaseDrawer';
import { LegalModal, LegalModalType } from '../components/LegalModal';
import { LegalPage } from '../components/LegalPage';
import { ScrollReveal } from '../components/ScrollReveal';
import {
    BoldStatement,
    Bundles,
    ContentTeaser,
    FamilyStory,
    FinalCta,
    Footer,
    JournalArticle,
    JournalArticleModal,
    Nav,
    ProductGrid,
    QuickReviews,
} from '../components/Sections';

export default function Home() {
    const router = useRouter();
    // Flavours and sets open their own product pages.
    const setSelectedProduct = (p: { flavor: string }) => {
        const slug = slugForFlavor(p.flavor);
        const setCount = slugForSetName(p.flavor);
        if (slug) {
            try { sessionStorage.setItem('oc_return', 'product-lineup'); } catch {}
            router.push(`/products/${slug}`);
        } else if (setCount) {
            try { sessionStorage.setItem('oc_return', 'bundles'); } catch {}
            router.push(`/sets/${setCount}`);
        }
    };
    const [selectedArticle, setSelectedArticle] = useState<JournalArticle | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerTab, setDrawerTab] = useState<'single' | 'bundle'>('single');
    const [legalModalType, setLegalModalType] = useState<LegalModalType>(null);
    const [standaloneLegalRoute, setStandaloneLegalRoute] = useState<'privacy' | 'terms' | null>(null);
    const [savedScrollPos, setSavedScrollPos] = useState<number>(0);

    // Coming back from a product page (back button or header link) lands on the flavour lineup, not the top.
    useEffect(() => {
        let target: string | null = null;
        try {
            target = sessionStorage.getItem('oc_return');
            sessionStorage.removeItem('oc_return');
        } catch {}
        if (!target) return;
        const go = () => {
            const el = document.getElementById(target!);
            if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 75 });
        };
        const t1 = setTimeout(go, 150);
        const t2 = setTimeout(go, 700);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    useEffect(() => {
        const checkRoute = () => {
            const path = window.location.pathname.toLowerCase();
            const search = window.location.search.toLowerCase();
            const hash = window.location.hash.toLowerCase();

            if (path.includes('privacy') || search.includes('privacy') || hash.includes('privacy')) {
                setStandaloneLegalRoute('privacy');
            } else if (path.includes('terms') || search.includes('terms') || hash.includes('terms')) {
                setStandaloneLegalRoute('terms');
            } else {
                setStandaloneLegalRoute(null);
            }
        };

        checkRoute();
        window.addEventListener('popstate', checkRoute);
        window.addEventListener('hashchange', checkRoute);

        return () => {
            window.removeEventListener('popstate', checkRoute);
            window.removeEventListener('hashchange', checkRoute);
        };
    }, []);

    const handleOpenDrawer = (tab: 'single' | 'bundle' = 'single') => {
        setDrawerTab(tab);
        setIsDrawerOpen(true);
    };

    const handleOpenLegal = (type: 'privacy' | 'terms' | 'license') => {
        if (type === 'privacy' || type === 'terms') {
            setSavedScrollPos(window.scrollY);
            window.history.pushState({}, '', `?page=${type}`);
            setStandaloneLegalRoute(type);
        } else {
            setLegalModalType(type);
        }
    };

    const handleGoBackHome = () => {
        const targetY = savedScrollPos;
        window.history.pushState({}, '', window.location.pathname);
        setStandaloneLegalRoute(null);
        setTimeout(() => {
            window.scrollTo({ top: targetY, behavior: 'instant' as ScrollBehavior });
        }, 20);
    };

    if (standaloneLegalRoute) {
        return <LegalPage type={standaloneLegalRoute} onGoBack={handleGoBackHome} />;
    }

    return (
        <div style={{ background: 'var(--oc-cream)', minHeight: '100vh' }}>
            <Nav onOpenDrawer={handleOpenDrawer} />
            <ScrollScrubHero />

            <ScrollReveal className="oc-band oc-band--cream">
                <BoldStatement />
            </ScrollReveal>

            <ScrollReveal className="oc-band oc-band--tan">
                <QuickReviews />
            </ScrollReveal>

            <ScrollReveal className="oc-band oc-band--cream">
                <ProductGrid onSelectProduct={setSelectedProduct} />
            </ScrollReveal>

            <QuickPurchaseDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                initialTab={drawerTab}
            />

            <LegalModal type={legalModalType} onClose={() => setLegalModalType(null)} />

            <ScrollReveal className="oc-band oc-band--tan">
                <FamilyStory />
            </ScrollReveal>

            <ScrollReveal className="oc-band oc-band--cream">
                <Bundles onSelectProduct={setSelectedProduct} />
            </ScrollReveal>

            <ScrollReveal className="oc-band oc-band--tan">
                <ContentTeaser onSelectArticle={setSelectedArticle} />
            </ScrollReveal>

            <JournalArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />

            <ScrollReveal>
                <FinalCta onOpenDrawer={handleOpenDrawer} />
            </ScrollReveal>

            <Footer onOpenLegal={handleOpenLegal} />
        </div>
    );
}
