import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductPage } from '../../../components/product/ProductPage';
import { PRODUCT_PAGES, detailUrl, getProductPage } from '../../../lib/products';
import { getItem } from '../../../lib/catalog';

export const dynamicParams = false;

export function generateStaticParams() {
    return PRODUCT_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const p = getProductPage(slug);
    if (!p) return {};
    const title = `참오트케어 ${p.flavor} — ${p.tagline}`;
    return {
        title: `${title} | 참오트케어`,
        description: p.description,
        alternates: { canonical: `/products/${p.slug}` },
        openGraph: { title, description: p.description, url: `/products/${p.slug}`, images: [detailUrl(p.slug, '01.webp')] },
    };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const p = getProductPage(slug);
    const item = p ? getItem(p.sku) : undefined;
    if (!p || !item) notFound();

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: item.name,
        description: p.description,
        brand: { '@type': 'Brand', name: '참오트케어' },
        image: [`https://chamoatcare.com${p.img}`],
        offers: {
            '@type': 'Offer',
            priceCurrency: 'KRW',
            price: item.price,
            availability: 'https://schema.org/InStock',
            url: `https://chamoatcare.com/products/${p.slug}`,
        },
    };
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <ProductPage slug={p.slug} />
        </>
    );
}
