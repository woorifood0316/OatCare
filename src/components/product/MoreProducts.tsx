import Link from 'next/link';
import { getItem } from '../../lib/catalog';
import { PRODUCT_PAGES, SET_PAGES } from '../../lib/products';
import { getAssetUrl } from '../../utils/assets';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/**
 * "다른 상품도 둘러보세요" at the bottom of every product page: all sets and all single flavours (not just the same
 * kind), minus the page being viewed. `current` is that page's SKU.
 */
export function MoreProducts({ current }: { current: string }) {
    const cards = [
        ...SET_PAGES.map((s) => {
            const it = getItem(s.sku)!;
            return { key: s.sku, href: `/sets/${s.count}`, img: s.img, kind: '세트', name: it.name, tagline: s.tagline, price: it.price };
        }),
        ...PRODUCT_PAGES.map((p) => ({
            key: p.sku,
            href: `/products/${p.slug}`,
            img: p.img,
            kind: '낱개',
            name: p.flavor,
            tagline: p.tagline,
            price: getItem(p.sku)!.price,
        })),
    ].filter((c) => c.key !== current);

    return (
        <section className="pd-sec pd-rec">
            <h2>다른 상품도 둘러보세요</h2>
            <div className="pd-rec__grid">
                {cards.map((c) => (
                    <Link key={c.key} href={c.href} className="pd-rec__card">
                        <img src={getAssetUrl(c.img)} alt={`참오트케어 ${c.name}`} loading="lazy" />
                        <span className={`pd-rec__kind${c.kind === '세트' ? ' is-set' : ''}`}>{c.kind}</span>
                        <b>{c.name}</b>
                        <span className="oc-balance">{c.tagline}</span>
                        <em>
                            {won(c.price)}
                            {c.kind === '낱개' ? <small> / 1개</small> : null}
                        </em>
                    </Link>
                ))}
            </div>
        </section>
    );
}
