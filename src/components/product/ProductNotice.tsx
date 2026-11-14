// 상품 정보 제공 고시 (식품) and 판매자 정보, shown in the product pages' 배송·교환·반품 tab.
// All values come from the package label (lib/product-facts) and the business details used in the footer.
import React from 'react';
import type { Flavor } from '../../lib/catalog';
import { LABEL_COMMON, PRODUCT_FACTS, type Nutrient } from '../../lib/product-facts';
import { BUSINESS } from '../../lib/business';

const n = (x: Nutrient) => (x.pct !== undefined ? `${x.amount} (${x.pct}%)` : x.amount);

function nutrition(fl: Flavor): string {
    const f = PRODUCT_FACTS[fl];
    return `1포(50g)당 열량 ${f.kcal}kcal, 나트륨 ${n(f.sodium)}, 탄수화물 ${n(f.carbs)}, 당류 ${n(f.sugars)}, 식이섬유 ${n(f.fiber)}, 지방 ${n(f.fat)}, 트랜스지방 ${f.transFat.amount}, 포화지방 ${n(f.saturatedFat)}, 콜레스테롤 ${n(f.cholesterol)}, 단백질 ${n(f.protein)} · 1일 영양성분 기준치에 대한 비율(%)은 2,000kcal 기준`;
}

/** One flavour (낱개 page) or every flavour of a set (`count` pouches in total). */
export function ProductNotice({ name, flavors, count }: { name: string; flavors: Flavor[]; count: number }) {
    const single = flavors.length === 1;
    const per = (pick: (fl: Flavor) => React.ReactNode) =>
        single ? (
            pick(flavors[0])
        ) : (
            <div className="pn-flavors">
                {flavors.map((fl) => (
                    <details key={fl}>
                        <summary>{fl}</summary>
                        <div>{pick(fl)}</div>
                    </details>
                ))}
            </div>
        );
    const crossNotes = Array.from(new Set(flavors.map((fl) => PRODUCT_FACTS[fl].crossContact)));

    return (
        <>
            <h3 className="pn-title">상품 정보 제공 고시</h3>
            <dl className="pd-policy pn-table">
                <dt>제품명</dt>
                <dd>{name}</dd>
                <dt>식품의 유형</dt>
                <dd>{LABEL_COMMON.foodType}</dd>
                <dt>생산자 및 소재지</dt>
                <dd>{LABEL_COMMON.manufacturer}</dd>
                <dt>판매원</dt>
                <dd>{LABEL_COMMON.seller}</dd>
                <dt>제조연월일·소비기한</dt>
                <dd>소비기한: 별도 표기일까지 (각 포장에 표기)</dd>
                <dt>포장단위별 용량·수량</dt>
                <dd>{count === 1 ? '50g × 1포' : `50g × ${count}포 (총 ${(count * 50).toLocaleString('ko-KR')}g)`}</dd>
                <dt>내포장재질</dt>
                <dd>{LABEL_COMMON.packaging}</dd>
                <dt>원재료명 및 함량</dt>
                <dd>{per((fl) => PRODUCT_FACTS[fl].ingredients)}</dd>
                <dt>알레르기 유발물질</dt>
                <dd>{LABEL_COMMON.allergens}</dd>
                <dt>영양성분</dt>
                <dd>{per((fl) => nutrition(fl))}</dd>
                <dt>소비자 안전 주의사항</dt>
                <dd>
                    {crossNotes.map((c) => (
                        <span key={c} className="pn-line">
                            {c}
                        </span>
                    ))}
                    <span className="pn-line">{LABEL_COMMON.storage}</span>
                    <span className="pn-line">부정·불량식품 신고는 국번없이 1399</span>
                </dd>
                <dt>수입식품 여부</dt>
                <dd>해당 없음 (국내 제조)</dd>
                <dt>소비자 상담</dt>
                <dd>{BUSINESS.phone}</dd>
            </dl>

            <h3 className="pn-title">판매자 정보</h3>
            <dl className="pd-policy pn-table">
                <dt>상호 / 대표자</dt>
                <dd>
                    {BUSINESS.name} / {BUSINESS.ceo}
                </dd>
                <dt>사업장 소재지</dt>
                <dd>{BUSINESS.address}</dd>
                <dt>연락처 / 이메일</dt>
                <dd>
                    {BUSINESS.phone} / {BUSINESS.email}
                </dd>
                <dt>사업자등록번호</dt>
                <dd>{BUSINESS.regNo}</dd>
                <dt>통신판매업 신고번호</dt>
                <dd>{BUSINESS.mailOrderNo}</dd>
            </dl>
            <p className="pn-minor">미성년자가 체결한 계약은 법정대리인이 동의하지 않는 경우 본인 또는 법정대리인이 취소할 수 있습니다.</p>
        </>
    );
}
