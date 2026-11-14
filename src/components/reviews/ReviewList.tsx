'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import type { PublicReview, ReviewStats } from '../../lib/reviews';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const day = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

function Stars({ value, size = 14 }: { value: number; size?: number }) {
    return (
        <span className="rv-starline" aria-label={`별점 ${value}점`}>
            {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={size} className={n <= Math.round(value) ? 'is-on' : ''} />
            ))}
        </span>
    );
}

/** Reviews written on this site for one product: average, star bars, sorting and the list. */
export function ReviewList({ sku, externalNote }: { sku: string; externalNote?: string }) {
    const [data, setData] = useState<{ reviews: PublicReview[]; stats: ReviewStats } | null>(null);
    const [sort, setSort] = useState<'new' | 'high' | 'low' | 'photo'>('new');
    const [zoom, setZoom] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        fetch(`/api/reviews?sku=${encodeURIComponent(sku)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => alive && d && setData(d))
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [sku]);

    const list = useMemo(() => {
        const all = data?.reviews ?? [];
        if (sort === 'high') return [...all].sort((a, b) => b.rating - a.rating);
        if (sort === 'low') return [...all].sort((a, b) => a.rating - b.rating);
        if (sort === 'photo') return all.filter((r) => r.photos.length > 0);
        return all;
    }, [data, sort]);

    if (!data) return <p className="pd-empty">리뷰를 불러오는 중이에요…</p>;

    const { stats } = data;
    return (
        <div className="rv-list">
            {stats.count === 0 ? (
                <p className="pd-empty">
                    아직 이 쇼핑몰에 작성된 리뷰가 없어요. 구매하신 뒤{' '}
                    <Link href="/mypage/reviews">마이페이지 → 리뷰 쓰기</Link>에서 첫 리뷰를 남겨 주세요.
                </p>
            ) : (
                <>
                    <div className="rv-summary">
                        <div className="rv-summary__avg">
                            <b>{stats.average.toFixed(1)}</b>
                            <Stars value={stats.average} size={16} />
                            <small>리뷰 {stats.count}개</small>
                        </div>
                        <ul className="rv-summary__bars">
                            {[5, 4, 3, 2, 1].map((n) => (
                                <li key={n}>
                                    <span>{n}점</span>
                                    <i>
                                        <em style={{ width: `${stats.count ? (stats.stars[n - 1] / stats.count) * 100 : 0}%` }} />
                                    </i>
                                    <small>{stats.stars[n - 1]}</small>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="rv-sort" role="tablist" aria-label="리뷰 정렬">
                        {(
                            [
                                ['new', '최신순'],
                                ['high', '별점 높은순'],
                                ['low', '별점 낮은순'],
                                ['photo', '사진 리뷰'],
                            ] as const
                        ).map(([k, label]) => (
                            <button key={k} type="button" role="tab" aria-selected={sort === k} className={sort === k ? 'is-active' : ''} onClick={() => setSort(k)}>
                                {label}
                            </button>
                        ))}
                    </div>

                    <ul className="rv-items">
                        {list.map((r) => (
                            <li key={r.id}>
                                <div className="rv-item__head">
                                    <Stars value={r.rating} />
                                    <b>{r.authorName}</b>
                                    {r.kind === 'subscription' ? <span className="rv-tag">정기구독</span> : null}
                                    <small>{day(r.createdAt)}</small>
                                </div>
                                {r.eventJoined ? (
                                    <p className="rv-disclose">
                                        리뷰 이벤트 참여 · 작성자에게 {r.rewardAmount > 0 ? `${won(r.rewardAmount)} ` : ''}할인 쿠폰이 지급됐어요
                                    </p>
                                ) : null}
                                <p className="rv-item__body">{r.body}</p>
                                {r.photos.length > 0 ? (
                                    <div className="rv-item__photos">
                                        {r.photos.map((p) => (
                                            <button key={p} type="button" onClick={() => setZoom(p)} aria-label="사진 크게 보기">
                                                <img src={p} alt="리뷰 사진" loading="lazy" />
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </li>
                        ))}
                        {list.length === 0 ? <li className="pd-empty">사진 리뷰가 아직 없어요.</li> : null}
                    </ul>
                </>
            )}
            {externalNote ? <p className="rv-external">{externalNote}</p> : null}

            {zoom ? (
                <div className="rv-zoom" role="dialog" aria-modal="true" onClick={() => setZoom(null)}>
                    <img src={zoom} alt="리뷰 사진" />
                </div>
            ) : null}
        </div>
    );
}
