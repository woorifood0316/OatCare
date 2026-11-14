'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, X } from 'lucide-react';
import { compressImage } from '../../lib/image-compress';
import { RETURN_CHANGE_OF_MIND_DAYS, RETURN_FEE_ONE_WAY, RETURN_FEE_ROUND_TRIP, RETURN_MAX_PHOTOS } from '../../lib/catalog';
import { RETURN_REASON_LABEL, estimateRefund, type ReturnKind, type ReturnLine, type ReturnReason } from '../../lib/return-rules';
import type { Order } from '../../lib/orders';
import { ReturnForgeryWarning, ReturnPhotoGuide } from './ReturnPhotoGuide';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

export function ReturnForm({
    order,
    lines,
    alreadyRefunded,
    changeOfMindOk,
    changeOfMindUntil,
    defectUntil,
    photosEnabled,
}: {
    order: Order;
    lines: ReturnLine[];
    alreadyRefunded: number;
    changeOfMindOk: boolean;
    changeOfMindUntil: string;
    defectUntil: string;
    photosEnabled: boolean;
}) {
    const router = useRouter();
    const [reason, setReason] = useState<ReturnReason | ''>('');
    const [type, setType] = useState<ReturnKind>('refund');
    const [picked, setPicked] = useState<Record<number, number>>(() => Object.fromEntries(lines.map((l) => [l.index, l.qty])));
    const [detail, setDetail] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [unopened, setUnopened] = useState(false);
    const [agreedWarning, setAgreedWarning] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const isDefect = reason === 'defect' || reason === 'wrong_item';
    const items = lines.filter((l) => (picked[l.index] ?? 0) > 0).map((l) => ({ ...l, qty: picked[l.index] }));
    const est = useMemo(
        () => (reason ? estimateRefund(order, reason === 'change_of_mind' ? 'refund' : type, reason, items, alreadyRefunded) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [reason, type, JSON.stringify(items), alreadyRefunded],
    );

    const addPhotos = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setError('');
        setUploading(true);
        try {
            const room = RETURN_MAX_PHOTOS - photos.length;
            if (files.length > room) setError(`사진은 ${RETURN_MAX_PHOTOS}장까지 올릴 수 있어요`);
            const urls: string[] = [];
            for (const file of [...files].slice(0, room)) {
                const blob = await compressImage(file);
                const fd = new FormData();
                fd.append('file', blob, `return.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`);
                fd.append('purpose', 'return');
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
        if (!reason) return setError('신청 사유를 선택해 주세요');
        if (items.length === 0) return setError('신청할 상품을 선택해 주세요');
        if (reason === 'change_of_mind' && !unopened) return setError('개봉하지 않은 상품인지 확인해 주세요');
        if (isDefect) {
            if (detail.trim().length < 10) return setError('어떤 문제가 있는지 10자 이상 적어 주세요');
            if (photos.length === 0) return setError('상품 사진과 찍은 날짜를 확인할 수 있는 사진을 올려 주세요');
            if (!agreedWarning) return setError('사진 제출 안내를 확인해 주세요');
        }
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/returns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderNo: order.orderNo,
                    reason,
                    type: reason === 'change_of_mind' ? 'refund' : type,
                    items: items.map(({ index, qty }) => ({ index, qty })),
                    detail,
                    photos,
                    unopened,
                    agreedWarning,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError((data.error as string) ?? '신청하지 못했어요');
                setBusy(false);
                return;
            }
            router.push(`/mypage/orders/${order.orderNo}?return=done`);
            router.refresh();
        } catch {
            setError('네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
            setBusy(false);
        }
    };

    return (
        <section className="my-card rt-form">
            <div className="rv-field">
                <span>신청 사유</span>
                <div className="rt-choices">
                    {(['change_of_mind', 'defect', 'wrong_item'] as ReturnReason[]).map((r) => {
                        const disabled = r === 'change_of_mind' && !changeOfMindOk;
                        return (
                            <label key={r} className={`rt-choice${reason === r ? ' is-on' : ''}${disabled ? ' is-off' : ''}`}>
                                <input type="radio" name="reason" checked={reason === r} disabled={disabled} onChange={() => setReason(r)} />
                                <span>
                                    <b>{RETURN_REASON_LABEL[r]}</b>
                                    <small>
                                        {r === 'change_of_mind'
                                            ? disabled
                                                ? `받은 날부터 ${RETURN_CHANGE_OF_MIND_DAYS}일이 지나 신청할 수 없어요`
                                                : `${changeOfMindUntil}까지 · 미개봉 상품만 · 반품 배송비 고객 부담`
                                            : `${defectUntil}까지 · 배송비 회사 부담 · 사진 필수`}
                                    </small>
                                </span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {isDefect ? (
                <div className="rv-field">
                    <span>처리 방법</span>
                    <div className="rt-choices rt-choices--row">
                        {(['refund', 'exchange'] as ReturnKind[]).map((t) => (
                            <label key={t} className={`rt-choice${type === t ? ' is-on' : ''}`}>
                                <input type="radio" name="type" checked={type === t} onChange={() => setType(t)} />
                                <span>
                                    <b>{t === 'refund' ? '반품 (환불)' : '교환'}</b>
                                    <small>{t === 'refund' ? '결제하신 수단으로 환불' : '같은 상품으로 다시 보내 드려요'}</small>
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            ) : null}

            <div className="rv-field">
                <span>신청할 상품</span>
                <ul className="rt-lines">
                    {lines.map((l) => (
                        <li key={l.index}>
                            <label className="addr-check">
                                <input
                                    type="checkbox"
                                    checked={(picked[l.index] ?? 0) > 0}
                                    onChange={(e) => setPicked((p) => ({ ...p, [l.index]: e.target.checked ? l.qty : 0 }))}
                                />
                                <span>{l.name}</span>
                            </label>
                            {l.qty > 1 && (picked[l.index] ?? 0) > 0 ? (
                                <select value={picked[l.index]} onChange={(e) => setPicked((p) => ({ ...p, [l.index]: Number(e.target.value) }))} aria-label={`${l.name} 수량`}>
                                    {Array.from({ length: l.qty }, (_, i) => i + 1).map((n) => (
                                        <option key={n} value={n}>
                                            {n}개
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <small>{l.qty}개</small>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            {reason === 'change_of_mind' ? (
                <div className="rt-box">
                    <b>단순 변심 반품 배송비</b>
                    <p>
                        주문 전체를 반품하면 <b>왕복 {won(RETURN_FEE_ROUND_TRIP)}</b>, 일부만 반품하면 <b>편도 {won(RETURN_FEE_ONE_WAY)}</b>을 고객님이 부담하시며, 환불
                        금액에서 빼고 돌려드려요. (처음 주문 때 배송비 {won(RETURN_FEE_ONE_WAY)}을 내셨다면 그 금액을 포함해 왕복 {won(RETURN_FEE_ROUND_TRIP)}이에요)
                    </p>
                    <label className="addr-check">
                        <input type="checkbox" checked={unopened} onChange={(e) => setUnopened(e.target.checked)} />
                        <span>
                            <b>개봉하지 않은 상품</b>이에요 (필수) · 개별 포장(포)을 뜯었거나 드신 상품은 단순 변심 반품이 안 돼요. 택배 상자를 열어 확인한 것은 괜찮아요. 사은품을 받으셨다면 함께 보내 주세요
                        </span>
                    </label>
                </div>
            ) : null}

            {isDefect ? (
                <>
                    <label className="rv-field">
                        <span>
                            어떤 문제가 있나요? <small>(10자 이상)</small>
                        </span>
                        <textarea
                            value={detail}
                            onChange={(e) => setDetail(e.target.value.slice(0, 1000))}
                            rows={4}
                            placeholder={reason === 'wrong_item' ? '예: 그레인 20개를 주문했는데 초코 20개가 왔어요' : '예: 상자가 찢어져 파우치 3개가 터져 있었어요'}
                        />
                    </label>

                    <ReturnPhotoGuide />

                    {photosEnabled ? (
                        <div className="rv-field">
                            <span>
                                사진 <small>(필수 · 최대 {RETURN_MAX_PHOTOS}장 · 상품 사진 + 찍은 날짜 확인 사진)</small>
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
                                {photos.length < RETURN_MAX_PHOTOS ? (
                                    <label className={`rv-photo rv-photo--add${uploading ? ' is-busy' : ''}`}>
                                        <Camera size={20} />
                                        <small>{uploading ? '올리는 중' : '사진 추가'}</small>
                                        <input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={(e) => addPhotos(e.target.files).then(() => (e.target.value = ''))} />
                                    </label>
                                ) : null}
                            </div>
                        </div>
                    ) : (
                        <p className="my-error">지금은 사진 올리기를 준비 중이에요. 고객센터(031-998-7234)로 문의해 주세요.</p>
                    )}

                    <ReturnForgeryWarning />
                    <label className="addr-check rt-agree">
                        <input type="checkbox" checked={agreedWarning} onChange={(e) => setAgreedWarning(e.target.checked)} />
                        <span>
                            위 안내를 확인했으며, <b>조작하지 않은 실제 사진</b>을 올려요 (필수)
                        </span>
                    </label>
                </>
            ) : null}

            {est && items.length > 0 ? (
                <dl className="rt-est">
                    {reason === 'change_of_mind' ? (
                        <div>
                            <dt>반품 배송비</dt>
                            <dd>-{won(est.fee)}</dd>
                        </div>
                    ) : null}
                    <div>
                        <dt>{type === 'exchange' && isDefect ? '교환' : '예상 환불 금액'}</dt>
                        <dd>
                            <b>{type === 'exchange' && isDefect ? '같은 상품 재발송 (비용 없음)' : won(est.refund)}</b>
                        </dd>
                    </div>
                    <p>상품을 회수해 확인한 뒤 확정돼요. 쿠폰 할인이 있었다면 상품 금액에 나눠 반영돼요.</p>
                </dl>
            ) : null}

            {error ? (
                <p className="my-error" role="alert">
                    {error}
                </p>
            ) : null}
            <button type="button" className="my-btn my-btn--primary rv-submit" onClick={submit} disabled={busy || uploading || !reason}>
                {busy ? '신청 중...' : '교환·반품 신청하기'}
            </button>
        </section>
    );
}
