import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SetPage } from '../../../components/product/SetPage';
import { SET_PAGES, getSetPage } from '../../../lib/products';
import { getItem } from '../../../lib/catalog';

export const dynamicParams = false;

export function generateStaticParams() {
    return SET_PAGES.map((s) => ({ count: String(s.count) }));
}

export async function generateMetadata({ params }: { params: Promise<{ count: string }> }): Promise<Metadata> {
    const { count } = await params;
    const s = getSetPage(count);
    const item = s ? getItem(s.sku) : undefined;
    if (!s || !item) return {};
    return {
        title: `${item.name} | 참오트케어`,
        description: s.description,
        alternates: { canonical: `/sets/${s.count}` },
        openGraph: { title: item.name, description: s.description, url: `/sets/${s.count}`, images: [s.img] },
    };
}

export default async function Page({ params }: { params: Promise<{ count: string }> }) {
    const { count } = await params;
    const s = getSetPage(count);
    const item = s ? getItem(s.sku) : undefined;
    if (!s || !item) notFound();
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: item.name,
        description: s.description,
        brand: { '@type': 'Brand', name: '참오트케어' },
        image: [`https://chamoatcare.com${s.img}`],
        offers: {
            '@type': 'Offer',
            priceCurrency: 'KRW',
            price: item.price,
            availability: 'https://schema.org/InStock',
            url: `https://chamoatcare.com/sets/${s.count}`,
        },
    };
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <SetPage count={s.count} />
        </>
    );
}
