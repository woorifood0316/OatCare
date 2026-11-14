'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Star, X } from 'lucide-react';
import { compressImage } from '../../lib/image-compress';
import {
    COUPON_VALID_DAYS,
    REVIEW_MAX_LENGTH,
    REVIEW_MAX_PHOTOS,
    REVIEW_MIN_LENGTH,
    REVIEW_REWARD_PHOTO,
    REVIEW_REWARD_TEXT,
    REVIEW_STRIKE_LIMIT,
    WELCOME_COUPON_MIN_COUNT,
} from '../../lib/catalog';
import type { Reviewable } from '../../lib/reviews';
import { InviteNudge } from '../share/InviteNudge';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** The rules shown wherever a review is written (also in the terms, 제8조). */
export function ReviewPolicy() {
    return (
        <ul className="rv-policy">
            <li>
                <b>욕설·비방, 개인정보</b>(전화번호·주소·이메일·계좌 등), <b>광고·홍보</b> 글은 <b>자동으로 등록되지 않거나 삭제</b>됩니다.
            </li>
            <li>
                위 사유로 삭제되면 <b>위반 1회</b>로 기록되고, <b>{REVIEW_STRIKE_LIMIT}회</b>가 되면 리뷰 작성이 제한되며 <b>회원 자격이 상실(제명)</b>될 수 있어요.
            </li>
            <li>위반으로 삭제된 리뷰로 받은 쿠폰은 사용 전이면 회수돼요.</li>
            <li>별점과 내용은 자유롭게 써 주세요. 좋지 않은 평가라는 이유로 리뷰를 지우지 않아요.</li>
        </ul>
    );
}

export function ReviewForm({ items, initialKey, photosEnabled }: { items: Reviewable[]; initialKey?: string; photosEnabled: boolean }) {
    const router = useRouter();
    const [key, setKey] = useState(items.find((i) => i.key === initialKey)?.key ?? items[0]?.key ?? '');
    const [rating, setRating] = useState(0);
    const [body, setBody] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [eventJoined, setEventJoined] = useState(true);
    const [agreed, setAgreed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState<{ reward: number } | null>(null);

    const reward = photos.length > 0 ? REVIEW_REWARD_PHOTO : REVIEW_REWARD_TEXT;
    const length = body.trim().length;

    const addPhotos = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setError('');
        setUploading(true);
        try {
            const room = REVIEW_MAX_PHOTOS - photos.length;
            const picked = [...files].slice(0, room);
            if (files.length > room) setError(`사진은 ${REVIEW_MAX_PHOTOS}장까지 올릴 수 있어요`);
            const urls: string[] = [];
            for (const file of picked) {
                // Shrunk in the browser first (long side 1280px, ~150–400 KB) so only what is needed is uploaded.
                const blob = await compressImage(file);
                const fd = new FormData();
                fd.append('file', blob, `review.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`);
                const res = await fetch('/api/reviews/upload', { method: 'POST', body: fd });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error((data.error as string) ?? '사진을 올리지 못했어요');
                urls.push(data.url as string);
            }
            setPhotos((p) => [...p, ...urls]);
        } catch (e) {
            setError(e instanceof Error ? e.message : '사진을 올리지 못했어요');
        } finally {
            setUploading(false);
        }
    };

    const submit = async () => {
        if (busy) return;
        if (!key) return setError('리뷰할 상품을 선택해 주세요');
        if (rating < 1) return setError('별점을 선택해 주세요');
        if (length < REVIEW_MIN_LENGTH) return setError(`후기를 ${REVIEW_MIN_LENGTH}자 이상 써 주세요 (지금 ${length}자)`);
        if (!agreed) return setError('리뷰 운영정책을 확인해 주세요');
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, rating, body, photos, eventJoined, agreedPolicy: true }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError((data.error as string) ?? '리뷰를 등록하지 못했어요');
                setBusy(false);
                return;
            }
            setDone({ reward: (data.reward as number) ?? 0 });
            setBusy(false);
            router.refresh();
        } catch {
            setError('네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
            setBusy(false);
        }
    };

    if (done) {
        return (
            <section className="my-card rv-done">
                <b>리뷰가 등록됐어요. 고마워요!</b>
                {done.reward > 0 ? (
                    <p>
                        🎟️ 리뷰 이벤트 쿠폰 <b>{won(done.reward)}</b>을 드렸어요. 마이페이지 쿠폰에서 확인할 수 있어요.
                    </p>
                ) : null}
                <InviteNudge heading="리뷰 고마워요! 친구에게도 추천해 보세요" />
                <button
                    type="button"
                    className="my-btn"
                    onClick={() => {
                        setDone(null);
                        setRating(0);
                        setBody('');
                        setPhotos([]);
                        setAgreed(false);
                        setKey('');
                    }}
                >
                    다른 상품 리뷰 쓰기
                </button>
            </section>
        );
    }

    return (
        <section className="my-card rv-form">
            <label className="rv-field">
                <span>리뷰할 상품</span>
                <select value={key} onChange={(e) => setKey(e.target.value)}>
                    {items.map((i) => (
                        <option key={i.key} value={i.key}>
                            {i.name} · 주문 {i.orderNo}
                        </option>
                    ))}
                </select>
            </label>

            <div className="rv-field">
                <span>별점</span>
                <div className="rv-stars" role="radiogroup" aria-label="별점">
                    {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}점`} className={n <= rating ? 'is-on' : ''} onClick={() => setRating(n)}>
                            <Star size={28} />
                        </button>
                    ))}
                </div>
            </div>

            <label className="rv-field">
                <span>
                    후기 <small>({REVIEW_MIN_LENGTH}자 이상)</small>
                </span>
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value.slice(0, REVIEW_MAX_LENGTH))}
                    rows={6}
                    placeholder="맛, 식감, 드시는 방법, 포만감 등 솔직한 후기를 남겨 주세요."
                />
                <small className={`rv-count${length >= REVIEW_MIN_LENGTH ? ' is-ok' : ''}`}>
                    {length} / {REVIEW_MAX_LENGTH}자
                </small>
            </label>

            {photosEnabled ? (
                <div className="rv-field">
                    <span>
                        사진 <small>(선택 · 최대 {REVIEW_MAX_PHOTOS}장, 자동으로 용량을 줄여 올려요)</small>
                    </span>
                    <div className="rv-photos">
                        {photos.map((p) => (
                            <div key={p} className="rv-photo">
                                <img src={p} alt="첨부한 사진" />
                                <button type="button" onClick={() => setPhotos((list) => list.filter((x) => x !== p))} aria-label="사진 빼기">
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        {photos.length < REVIEW_MAX_PHOTOS ? (
                            <label className={`rv-photo rv-photo--add${uploading ? ' is-busy' : ''}`}>
                                <Camera size={20} />
                                <small>{uploading ? '올리는 중' : '사진 추가'}</small>
                                <input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={(e) => addPhotos(e.target.files).then(() => (e.target.value = ''))} />
                            </label>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <div className="rv-box">
                <b>리뷰 운영정책</b>
                <ReviewPolicy />
                <label className="addr-check">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                    <span>리뷰 운영정책을 확인했어요 (필수)</span>
                </label>
            </div>

            <div className="rv-box rv-box--event">
                <label className="addr-check">
                    <input type="checkbox" checked={eventJoined} onChange={(e) => setEventJoined(e.target.checked)} />
                    <span>
                        <b>리뷰 이벤트 참여</b> · 등록하면 <b>{won(reward)} 쿠폰</b>을 바로 드려요 (글 리뷰 {won(REVIEW_REWARD_TEXT)} · 사진 리뷰 {won(REVIEW_REWARD_PHOTO)})
                    </span>
                </label>
                <p>
                    참여한 리뷰에는 <b>&lsquo;리뷰 이벤트 참여&rsquo;</b> 표시가 함께 보여요. 쿠폰은 별점·내용과 관계없이 지급되며,
                    {COUPON_VALID_DAYS}일 동안 20·30개 세트·정기구독 또는 {WELCOME_COUPON_MIN_COUNT}개(한 박스) 이상 주문에 쓸 수 있어요.
                </p>
            </div>

            {error ? (
                <p className="my-error" role="alert">
                    {error}
                </p>
            ) : null}
            <button type="button" className="my-btn my-btn--primary rv-submit" onClick={submit} disabled={busy || uploading}>
                {busy ? '등록 중...' : '리뷰 등록하기'}
            </button>
        </section>
    );
}
