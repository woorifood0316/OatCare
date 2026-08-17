'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
    children: React.ReactNode;
    className?: string;
    id?: string;
    delay?: number; // delay in seconds (e.g., 0.1, 0.2)
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
    children,
    className = '',
    id,
    delay = 0
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(el);
                }
            },
            {
                root: null,
                rootMargin: '0px 0px -60px 0px', // Triggers as section moves 60px into viewport
                threshold: 0.05,
            }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            id={id}
            className={`oc-scroll-reveal ${isVisible ? 'oc-scroll-reveal--active' : ''} ${className}`}
            style={{ transitionDelay: `${delay}s` }}
        >
            {children}
        </div>
    );
};
