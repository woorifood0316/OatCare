import React from 'react';
import Link from 'next/link';

export function PageHead({ title, desc }: { title: string; desc?: string }) {
    return (
        <div className="my-head">
            <h1>{title}</h1>
            {desc ? <p>{desc}</p> : null}
        </div>
    );
}

export function ComingSoon({
    title,
    desc,
    items,
}: {
    title: string;
    desc: string;
    items: string[];
}) {
    return (
        <>
            <PageHead title={title} desc={desc} />
            <section className="my-card my-empty">
                <span className="my-badge">준비 중</span>
                <p className="my-empty__lead">곧 이용하실 수 있어요.</p>
                <ul className="my-empty__list">
                    {items.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
                <Link href="/#product-lineup" className="my-btn my-btn--primary">
                    제품 둘러보기
                </Link>
            </section>
        </>
    );
}
