'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ScrollScene } from '../types';
import { getAssetUrl } from '../utils/assets';

// Static default poster (desktop's video's exact first frame) baked directly
// into the prerendered HTML, so the browser starts fetching it the moment it
// parses the page -- before any JS runs. Without this, <video> has no poster
// and no decoded frame yet on first paint, and browsers render that as a
// solid black box regardless of any background color on ancestor elements.
// The mobile-specific poster (also its video's own first frame) still swaps
// in via JS once mounted, for a precise match on phones.
const DEFAULT_POSTER = getAssetUrl('/assets/hero-poster-desktop.webp');

/* ============================================================================
   OatCare Scroll-Scrub Hero — scroll-world architecture
   ---------------------------------------------------------------------------
   Based on oso95/scroll-world scrub-engine.js:
   1. Direct visible <video> element with object-fit:cover (NO Canvas)
   2. Video loaded as in-memory Blob → ObjectURL (always seekable, no HTTP range)
   3. Seek-coalescing RAF loop: never queue currentTime while video.seeking
   4. Smooth lerp interpolation between scroll target and current position
   ========================================================================== */

// Staircase vertical offsets: each chapter steps down from top
const STAIR_OFFSETS: Record<string, string> = {
    'scene-01': '22%',
    'scene-02': '32%',
    'scene-03': '42%',
    'scene-04': '52%',
};

const SCENES: ScrollScene[] = [
    {
        id: 'scene-01',
        chapter: 'Chapter 01',
        title: '"9가지 좋은 곡물"',
        body: '귀리, 현미, 백태, 보리, 찰현미, 밀, 멥쌀, 흑미, 서리태.\n9가지 곡물이 오트케어 그레인 한 봉지에 모입니다.',
        tag: '50g 한 봉지',
        align: 'left',
        startPercent: 15,
        endPercent: 36,
    },
    {
        id: 'scene-02',
        chapter: 'Chapter 02',
        title: '매일 아침, 우리 집 식탁으로',
        body: '1분의 여유로 채우는 건강한 아침.\n바쁜 일상 속에서도 뜯고 붓기만 하면 식탁 위에 완벽한 한 끼가 준비됩니다.',
        tag: '뜯고 붓기만',
        align: 'right',
        startPercent: 36,
        endPercent: 57,
    },
    {
        id: 'scene-03',
        chapter: 'Chapter 03',
        title: '물만 부어, 저어서',
        body: '따뜻한 물이나 우유를 붓고 30초만 저으면 끝. 좋은 원료를 그대로 마십니다.',
        tag: '30초 완성',
        align: 'left',
        startPercent: 57,
        endPercent: 78,
    },
    {
        id: 'scene-04',
        chapter: 'Chapter 04',
        title: '완벽한 한 끼, 오트케어',
        body: '골고루, 든든하게, 매일 다른 맛으로. 바쁜 일상에도 놓치지 않는 균형 잡힌 한 끼.',
        tag: '다섯 가지 맛',
        align: 'right',
        startPercent: 78,
        endPercent: 100,
    },
];

export const ScrollScrubHero: React.FC = () => {
    const trackRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const introRef = useRef<HTMLDivElement>(null);
    const chapterCardRef = useRef<HTMLDivElement>(null);

    // React state — updated ONLY on actual value change (no 60fps thrash)
    const [progressPct, setProgressPct] = useState(0);
    const [currentScene, setCurrentScene] = useState<ScrollScene>(SCENES[0]);
    const [videoLoaded, setVideoLoaded] = useState(false);

    // Mutable refs for the RAF loop (no React re-renders)
    const targetRef = useRef(0);   // raw scroll target 0..1
    const currentRef = useRef(0);  // lerped current position 0..1
    const lastPctRef = useRef(0);
    const lastSceneRef = useRef(SCENES[0].id);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        let blobUrl: string | null = null;
        let animId = 0;

        /* ── Step 1: Ultra-Fast Responsive R2 Video Streaming (PC: hero-desktop-v2.mp4 / Mobile: hero-mobile-v2.mp4) ── */
        const R2_URL = process.env.NEXT_PUBLIC_R2_URL || 'https://pub-a86a2d7952624f80aed6c433a53f18f9.r2.dev';
        const isMobile = window.innerWidth <= 768;
        const mobileVideoSrc = `${R2_URL}/hero-mobile-v2.mp4`;
        const desktopVideoSrc = `${R2_URL}/hero-desktop-v2.mp4`;
        const primaryVideoSrc = isMobile ? mobileVideoSrc : desktopVideoSrc;

        const localMobileFallback = '/assets/hero-mobile-v2.mp4';
        const localDesktopFallback = '/assets/hero-desktop-v2.mp4';
        const localFallback = isMobile ? localMobileFallback : localDesktopFallback;

        // ⚡ 0. Instant Poster: set poster attribute to eliminate black screen flash
        const posterDesktop = `${R2_URL}/hero-poster-desktop.webp`;
        const posterMobile = `${R2_URL}/hero-poster-mobile.webp`;
        const posterSrc = isMobile ? posterMobile : posterDesktop;
        const localPosterFallback = isMobile ? '/assets/hero-poster-mobile.webp' : '/assets/hero-poster-desktop.webp';
        video.poster = posterSrc;
        video.onerror = () => { video.poster = localPosterFallback; };

        // ⚡ 1. Synchronously set primary video streaming source on mount (0ms faststart playback)
        if (!video.src || video.src === window.location.href) {
            video.src = primaryVideoSrc;
            video.load();
            try {
                video.currentTime = 0;
            } catch (_) { }
        }

        // ⚡ 2. Concurrently fetch full Blob into RAM in background (with robust try/catch fallback for R2 CORS/404)
        // Desktop-only: this exists so scroll-scrub can seek to any point with zero HTTP
        // range-request latency. Mobile just plays forward once, so it doesn't need this —
        // and the async video.load() this performs would otherwise abort an in-flight
        // play() on mobile (AbortError: "interrupted by a new load request").
        if (!isMobile) {
            const loadVideoBlob = async () => {
                try {
                    // Try R2 CDN first
                    const res = await fetch(primaryVideoSrc);
                    if (res.ok) {
                        const blob = await res.blob();
                        return blob;
                    }
                } catch (r2Err) {
                    console.warn('[ScrollScrubHero] R2 CDN fetch failed or CORS blocked, loading local fallback:', r2Err);
                }

                // Fallback to local /assets/
                try {
                    const localRes = await fetch(localFallback);
                    if (localRes.ok) {
                        const localBlob = await localRes.blob();
                        return localBlob;
                    }
                } catch (localErr) {
                    console.error('[ScrollScrubHero] Local video fetch failed:', localErr);
                }
                return null;
            };

            loadVideoBlob()
                .then((blob) => {
                    if (blob) {
                        blobUrl = URL.createObjectURL(blob);
                        const pos = video.currentTime || 0;
                        video.src = blobUrl;
                        video.load();
                        try {
                            video.currentTime = pos;
                        } catch (_) { }
                    }
                    setVideoLoaded(true);
                })
                .catch((err) => {
                    console.warn('[ScrollScrubHero] Video blob load caught error:', err);
                    setVideoLoaded(true);
                });
        }

        /* ── Mobile: plays on first touch, then loops for as long as it's on screen ──
           Touch scroll is too coarse/inertial for frame-accurate scrubbing, so on
           mobile the video doesn't wait for scroll position — it waits for the
           user's first touch (tap or the start of a scroll swipe) so playback
           starts only once they've actually engaged with the page, then loops
           continuously so scrolling away and back always shows it playing.
           Chapter overlay switches on video time instead of scroll position.
           Desktop keeps the scroll-scrub below. */
        if (isMobile) {
            video.loop = true;

            // Drive the intro/chapter fade off a continuous (unrounded) fraction written
            // straight to the DOM every RAF frame — bypassing React state, which only
            // holds an integer percent. That rounding was the real cause of the choppy
            // fade: React only re-renders ~7 times/sec during the 0-14% intro window,
            // so the opacity was stepping in ~15 discrete jumps instead of dissolving.
            // Scene switching stays on the rounded integer since chapters are inherently
            // discrete anyway.
            let rafId = 0;
            const updateProgress = () => {
                const dur = video.duration;
                if (dur && !isNaN(dur) && dur > 0) {
                    const rawPct = Math.min(100, (video.currentTime / dur) * 100);

                    const introT = Math.min(1, rawPct / 14);
                    const introOp = Math.max(0, 1 - introT);
                    const introSc = Math.max(0.65, 1.15 - introT * 0.45);
                    if (introRef.current) {
                        introRef.current.style.opacity = String(introOp);
                        introRef.current.style.transform = `translate(-50%, -50%) scale(${introSc})`;
                        introRef.current.style.pointerEvents = introOp > 0.1 ? 'auto' : 'none';
                    }
                    if (chapterCardRef.current) {
                        const chapterOp = rawPct < 15 ? 0 : Math.min(1, (rawPct - 15) / 5);
                        chapterCardRef.current.style.opacity = String(chapterOp);
                    }

                    const pct = Math.round(rawPct);
                    if (pct !== lastPctRef.current) {
                        lastPctRef.current = pct;
                        setProgressPct(pct);
                    }
                    const scene =
                        SCENES.find((s) => pct >= s.startPercent && pct <= s.endPercent) ||
                        (pct < SCENES[0].startPercent ? SCENES[0] : SCENES[SCENES.length - 1]);
                    if (scene.id !== lastSceneRef.current) {
                        lastSceneRef.current = scene.id;
                        setCurrentScene(scene);
                    }
                }
                rafId = requestAnimationFrame(updateProgress);
            };

            const playVideo = () => {
                video.play().catch(() => { });
                cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(updateProgress);
            };
            const pauseVideo = () => {
                video.pause();
                cancelAnimationFrame(rafId);
            };

            let hasStarted = false; // set once the user's first touch unlocks playback
            let isVisible = false;

            const observer = new IntersectionObserver(
                ([entry]) => {
                    isVisible = entry.isIntersecting;
                    if (!hasStarted) return;
                    if (isVisible) {
                        playVideo();
                    } else {
                        pauseVideo();
                    }
                },
                { threshold: 0.5 }
            );
            if (trackRef.current) observer.observe(trackRef.current);

            const startOnFirstTouch = () => {
                if (hasStarted) return;
                hasStarted = true;
                if (isVisible) {
                    playVideo();
                }
            };
            window.addEventListener('touchstart', startOnFirstTouch, { passive: true });

            const onMetaMobile = () => setVideoLoaded(true);
            video.addEventListener('loadedmetadata', onMetaMobile);
            if (video.readyState >= 1) setVideoLoaded(true);

            return () => {
                cancelAnimationFrame(rafId);
                observer.disconnect();
                window.removeEventListener('touchstart', startOnFirstTouch);
                video.removeEventListener('loadedmetadata', onMetaMobile);
                if (blobUrl) URL.revokeObjectURL(blobUrl);
            };
        }

        /* ── Desktop: Step 2 — scroll/touch listeners update targetRef ── */
        const onScroll = () => {
            const track = trackRef.current;
            if (!track) return;
            const rect = track.getBoundingClientRect();
            const scrollable = rect.height - window.innerHeight;
            if (scrollable <= 0) return;
            targetRef.current = Math.min(Math.max(-rect.top / scrollable, 0), 1);
        };

        /* ── Step 3: Seek-coalescing RAF loop ── */
        const raf = () => {
            const diff = targetRef.current - currentRef.current;
            if (Math.abs(diff) < 0.0003) {
                currentRef.current = targetRef.current;
            } else {
                currentRef.current += diff * 0.18;
            }

            const p = currentRef.current;

            // Update React state only when integer % changes
            const pct = Math.round(p * 100);
            if (pct !== lastPctRef.current) {
                lastPctRef.current = pct;
                setProgressPct(pct);
            }

            // Update scene only when scene actually changes
            const scene =
                SCENES.find((s) => pct >= s.startPercent && pct <= s.endPercent) ||
                (pct < SCENES[0].startPercent ? SCENES[0] : SCENES[SCENES.length - 1]);
            if (scene.id !== lastSceneRef.current) {
                lastSceneRef.current = scene.id;
                setCurrentScene(scene);
            }

            const dur = video.duration;
            if (dur && !isNaN(dur) && dur > 0 && !video.seeking) {
                const t = Math.min(Math.max(p, 0), 0.999) * dur;
                if (Math.abs(video.currentTime - t) > 0.008) {
                    try {
                        video.currentTime = t;
                    } catch (_) {
                        /* ignore seek collision */
                    }
                }
            }

            animId = requestAnimationFrame(raf);
        };

        const onMeta = () => {
            setVideoLoaded(true);
            onScroll();
            animId = requestAnimationFrame(raf);
        };
        video.addEventListener('loadedmetadata', onMeta);

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('touchmove', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        onScroll();

        if (video.readyState >= 1) {
            onMeta();
        }

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('touchmove', onScroll);
            window.removeEventListener('resize', onScroll);
            video.removeEventListener('loadedmetadata', onMeta);
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, []);

    // Intro brand animation calculations (0% ~ 15% scroll)
    const introOpacity = Math.max(0, 1 - progressPct / 14);
    const introScale = Math.max(0.65, 1.15 - (progressPct / 14) * 0.45);
    const chapterOpacity = progressPct < 15 ? 0 : Math.min(1, (progressPct - 15) / 5);

    return (
        <section ref={trackRef} className="oc-scroll-scrub-track" id="hero">
            <div className="oc-scroll-scrub-sticky">
                <video
                    ref={videoRef}
                    className="oc-scroll-video"
                    playsInline
                    muted
                    preload="auto"
                    poster={DEFAULT_POSTER}
                    style={{ opacity: 1, filter: 'none' }}
                />

                {/* Content & Chapters Overlay */}
                <div className="oc-scroll-content-container">

                    {/* Central Hero Intro Brand Block (0% ~ 15% scroll scale-down & fade-out) */}
                    <div
                        ref={introRef}
                        style={{
                            position: 'absolute',
                            top: '46%',
                            left: '50%',
                            transform: `translate(-50%, -50%) scale(${introScale})`,
                            opacity: introOpacity,
                            pointerEvents: introOpacity > 0.1 ? 'auto' : 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            zIndex: 10,
                            width: 'max-content',
                            transition: 'opacity 0.05s ease-out',
                        }}
                    >
                        <img
                            src="/assets/oatcare-logo.png"
                            alt="오트케어 로고"
                            style={{
                                height: 'clamp(4.5rem, 9vw, 7rem)',
                                width: 'auto',
                                borderRadius: '16px',
                                boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                                marginBottom: '1.2rem',
                            }}
                        />
                        <h1
                            style={{
                                color: '#F7F1E4',
                                fontSize: 'clamp(2.5rem, 6vw, 4.8rem)',
                                fontWeight: 800,
                                letterSpacing: '-0.02em',
                                textShadow: '0 4px 24px rgba(0,0,0,0.95), 0 0 50px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,1)',
                                margin: 0,
                                lineHeight: 1.1,
                            }}
                        >
                            OatCare 오트케어
                        </h1>
                        <p
                            style={{
                                color: 'rgba(247, 241, 228, 0.95)',
                                fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                                fontWeight: 600,
                                marginTop: '0.8rem',
                                textShadow: '0 2px 18px rgba(0,0,0,0.95), 0 0 35px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,1)',
                            }}
                        >
                            바쁜 아침을 채우는 가장 완벽한 50g 한 끼
                        </p>
                    </div>

                    {/* Active Chapter Card Overlay (Appears after 15% scroll) */}
                    {progressPct >= 15 && (
                        <div
                            ref={chapterCardRef}
                            className={`oc-scroll-chapter-card ${currentScene.align === 'left' ? 'align-left' : 'align-right'}`}
                            style={{
                                position: 'absolute',
                                top: STAIR_OFFSETS[currentScene.id] || '30%',
                                left: currentScene.align === 'left' ? 'clamp(1.5rem, 5vw, 4rem)' : 'auto',
                                right: currentScene.align === 'right' ? 'clamp(1.5rem, 5vw, 4rem)' : 'auto',
                                opacity: chapterOpacity,
                                transition: 'opacity 0.2s ease-in-out',
                            }}
                        >
                            <span
                                className="oc-eyebrow"
                                style={{
                                    color: '#C9963C',
                                    fontSize: 'clamp(0.92rem, 1.4vw, 1.05rem)',
                                    textShadow: '0 2px 14px rgba(0,0,0,0.95), 0 0 25px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,1)',
                                    marginBottom: '0.6rem',
                                    display: 'block',
                                }}
                            >
                                {currentScene.chapter} — {currentScene.tag}
                            </span>
                            <h2
                                style={{
                                    fontSize: 'clamp(2.15rem, 4.2vw, 3.4rem)',
                                    fontWeight: 800,
                                    lineHeight: 1.15,
                                    marginBottom: '1rem',
                                    color: '#F7F1E4',
                                    textShadow: '0 4px 24px rgba(0,0,0,0.95), 0 0 50px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,1)',
                                }}
                            >
                                {currentScene.title}
                            </h2>
                            <p
                                style={{
                                    fontSize: '1.26rem',
                                    lineHeight: 1.65,
                                    color: 'rgba(247, 241, 228, 0.95)',
                                    textShadow: '0 2px 18px rgba(0,0,0,0.95), 0 0 35px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,1)',
                                    maxWidth: '42ch',
                                    whiteSpace: 'pre-line',
                                }}
                            >
                                {currentScene.body}
                            </p>
                        </div>
                    )}

                    {/* Progress Bar */}
                    <div className="oc-scroll-progress-bar">
                        <span
                            style={{
                                fontFamily: 'var(--oc-mono)',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                color: '#C9963C',
                            }}
                        >
                            {progressPct}%
                        </span>

                        <div className="oc-scroll-steps-indicator">
                            {SCENES.map((scene) => (
                                <div
                                    key={scene.id}
                                    className={`oc-scroll-step-dot ${scene.id === currentScene.id && progressPct >= 15 ? 'active' : ''
                                        }`}
                                    title={scene.title}
                                />
                            ))}
                        </div>

                        <span className="oc-scroll-progress-title">
                            {progressPct < 15 ? 'OatCare Intro' : currentScene.title}
                        </span>
                    </div>

                    {/* Scroll Hint — desktop only; mobile plays on touch, not scroll */}
                    <div
                        className="oc-scroll-hint"
                        style={{
                            position: 'absolute',
                            bottom: '4.4rem',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            color: 'rgba(247,241,228,0.85)',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            pointerEvents: 'none',
                            opacity: 1,
                            transition: 'opacity 0.3s ease',
                        }}
                    >
                        <span>스크롤하여 스토리 탐색</span>
                        <ChevronDown size={15} />
                    </div>
                </div>
            </div>
        </section>
    );
};
