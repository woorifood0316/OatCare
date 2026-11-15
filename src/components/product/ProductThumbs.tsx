// Small product photos for order, subscription, return and review screens (the same square, cream-backed thumbnail
// the cart and checkout use). Works in server and client components.
import { findSkuByName, getItem } from '../../lib/catalog';
import { getAssetUrl } from '../../utils/assets';

type Line = { sku?: string; name: string; qty: number; gift?: boolean };

/** The product a line is about: by its sku, or by its name (return requests keep only the name). */
function itemOf(line: { sku?: string; name: string }) {
    return getItem(line.sku ?? '') ?? getItem(findSkuByName(line.name) ?? '');
}

/** One product photo. */
export function ProductThumb({ line, size = 'md' }: { line: { sku?: string; name: string }; size?: 'sm' | 'md' }) {
    const item = itemOf(line);
    if (!item) return <span className={`pthumb pthumb--${size} pthumb--empty`} aria-hidden="true" />;
    return <img className={`pthumb pthumb--${size}`} src={getAssetUrl(item.img)} alt="" loading="lazy" />;
}

/** The products of one order as photos laid over each other (sets first, at most 3, then "+N"). */
export function StackedThumbs({ lines }: { lines: Line[] }) {
    const seen = new Set<string>();
    const list = lines
        .filter((l) => !l.gift)
        .map((l) => ({ l, item: itemOf(l) }))
        .filter((x) => {
            const key = x.item?.sku ?? x.l.name;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((a, b) => Number(b.item?.kind === 'bundle') - Number(a.item?.kind === 'bundle'));
    const shown = list.slice(0, 3);
    const more = list.length - shown.length;
    return (
        <span className="pstack" aria-hidden="true">
            {shown.map((x, i) => (
                <ProductThumb key={x.item?.sku ?? i} line={x.l} />
            ))}
            {more > 0 ? <span className="pstack__more">+{more}</span> : null}
        </span>
    );
}

/**
 * One-line title for an order: "든든 20개입 한달 박스", "낱개 4가지 맛 · 총 12개",
 * "든든 20개입 한달 박스 + 낱개 2가지 맛", "든든 20개입 한달 박스 외 1건".
 */
export function orderTitle(lines: Line[]): string {
    const real = lines.filter((l) => !l.gift);
    if (real.length === 0) return '주문';
    const sets = real.filter((l) => itemOf(l)?.kind === 'bundle');
    const singles = real.filter((l) => itemOf(l)?.kind === 'single');
    const singleCount = singles.reduce((s, l) => s + l.qty, 0);
    if (sets.length === 0 && singles.length > 0) {
        return singles.length === 1 ? `${singles[0].name} ${singleCount}개` : `낱개 ${singles.length}가지 맛 · 총 ${singleCount}개`;
    }
    const head = sets[0] ?? real[0];
    const restSets = sets.length - 1;
    const parts = [head.name + (restSets > 0 ? ` 외 ${restSets}건` : '')];
    if (singles.length > 0) parts.push(`낱개 ${singles.length}가지 맛`);
    return parts.join(' + ');
}
