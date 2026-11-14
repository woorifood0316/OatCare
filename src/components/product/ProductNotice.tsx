'use client';

// Product page notices as compact tables (label | value):
//  - ProductLabelInfo: 필수 표기 정보 (상품 정보 제공 고시, 식품) at the top of the 상품상세 tab
//  - ProductNotice: 배송·교환·반품 안내, 교환/반품 제한사항, 판매자 정보 in the 배송·교환·반품 tab
// Values come from the package label (lib/product-facts), the catalog rules and the business details.
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Flavor } from '../../lib/catalog';
import { FREE_SHIPPING_MIN_COUNT, MIN_SUBSCRIPTION_CHARGES, RETURN_CHANGE_OF_MIND_DAYS, RETURN_FEE_ONE_WAY, RETURN_FEE_ROUND_TRIP, SHIPPING_FEE } from '../../lib/catalog';
import { LABEL_COMMON, PRODUCT_FACTS, type Nutrient } from '../../lib/product-facts';
import { BUSINESS } from '../../lib/business';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const pct = (x: Nutrient) => (x.pct !== undefined ? `${x.amount}(${x.pct}%)` : x.amount);

function nutrition(fl: Flavor): string {
    const f = PRODUCT_FACTS[fl];
    return `총 내용량 50g / ${f.kcal}kcal · 나트륨 ${pct(f.sodium)} · 탄수화물 ${pct(f.carbs)} · 당류 ${pct(f.sugars)} · 식이섬유 ${pct(f.fiber)} · 지방 ${pct(f.fat)} · 트랜스지방 ${f.transFat.amount} · 포화지방 ${pct(f.saturatedFat)} · 콜레스테롤 ${pct(f.cholesterol)} · 단백질 ${pct(f.protein)} (1일 영양성분 기준치에 대한 비율, 2,000kcal 기준)`;
}

/** Two-column table: [label, value][] */
function Table({ rows }: { rows: [string, React.ReactNode][] }) {
    return (
        <table className="pn-t">
            <tbody>
                {rows.map(([k, v]) => (
                    <tr key={k}>
                        <th scope="row">{k}</th>
                        <td>{v}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/** Four-column table on wide screens (two label/value pairs per row), two columns on phones. */
function Table4({ rows, visible }: { rows: [string, React.ReactNode][]; visible?: number }) {
    const pairs: [string, React.ReactNode][][] = [];
    for (let i = 0; i < rows.length; i += 2) pairs.push(rows.slice(i, i + 2));
    return (
        <table className="pn-t pn-t--4">
            <tbody>
                {(visible ? pairs.slice(0, visible) : pairs).map((pair) => (
                    <tr key={pair[0][0]}>
                        {pair.map(([k, v]) => (
                            <React.Fragment key={k}>
                                <th scope="row">{k}</th>
                                <td colSpan={pair.length === 1 ? 3 : 1}>{v}</td>
                            </React.Fragment>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/** 필수 표기 정보 (상품 정보 제공 고시 - 식품): one flavour, or every flavour of a set (count pouches). */
export function ProductLabelInfo({ name, flavors, count }: { name: string; flavors: Flavor[]; count: number }) {
    const [open, setOpen] = useState(false);
    const single = flavors.length === 1;
    const per = (pick: (fl: Flavor) => string) =>
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
        <div className="pn pn--label">
            <h3 className="pn-title">필수 표기 정보</h3>
            <Table4
                visible={open ? undefined : 3}
                rows={[
                    ['제품명', name],
                    ['식품의 유형', LABEL_COMMON.foodType],
                    ['생산자 및 소재지', `제조원/${LABEL_COMMON.manufacturer}, 소분원 및 판매원/${LABEL_COMMON.seller}`],
                    ['제조연월일, 소비기한 또는 품질유지기한', '소비기한: 별도 표기일까지 (각 포장에 표기)'],
                    ['포장단위별 내용물의 용량(중량), 수량', count === 1 ? '50g, 1개(파우치)' : `50g, ${count}개(파우치)`],
                    ['원재료명 및 함량', per((fl) => PRODUCT_FACTS[fl].ingredients)],
                    ['영양성분', per(nutrition)],
                    ['유전자변형식품에 해당하는 경우의 표시', `해당 표시 없음 · 알레르기 유발물질: ${LABEL_COMMON.allergens}`],
                    ['소비자안전을 위한 주의사항', [...crossNotes, LABEL_COMMON.storage].join(' ')],
                    ['수입식품 문구', '해당 없음 (국내 제조)'],
                    ['소비자상담관련 전화번호', BUSINESS.phone],
                ]}
            />
            <button type="button" className={`pn-more${open ? ' is-open' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                {open ? '필수 표기 정보 접기' : '필수 표기 정보 더보기'} <ChevronDown size={16} />
            </button>
        </div>
    );
}

/** 배송·교환·반품 tab. `set` = a set page (shipping always free). */
export function ProductNotice({ set }: { set?: boolean }) {
    return (
        <div className="pn">
            <Table
                rows={[
                    [
                        '배송',
                        <>
                            평일 오후 1시까지 결제 시 당일 발송 (이후·주말·공휴일은 다음 영업일) ·{' '}
                            {set ? '세트 상품 무료배송' : `배송비 ${won(SHIPPING_FEE)}, 세트 포함 또는 ${FREE_SHIPPING_MIN_COUNT}개 이상 무료`}
                        </>,
                    ],
                    ['정기구독', `결제일에 결제·발송 · 최소 ${MIN_SUBSCRIPTION_CHARGES}회 이용 · 주기 변경·해지 예약은 마이페이지에서`],
                    ['교환·반품 신청', '마이페이지 > 주문·배송 > 주문 상세 > [교환·반품 신청] · 승인되면 택배 기사님이 회수 방문'],
                    ['단순 변심', `받은 날부터 ${RETURN_CHANGE_OF_MIND_DAYS}일 이내 · 미개봉 상품만 · 반품 배송비 전체 ${won(RETURN_FEE_ROUND_TRIP)}(왕복) / 일부 ${won(RETURN_FEE_ONE_WAY)}(편도), 환불 금액에서 차감`],
                    ['상품 하자·오배송', '받은 날부터 3개월, 안 날부터 30일 이내 · 배송비 회사 부담 · 문제 부분 사진과 찍은 날짜를 확인할 수 있는 사진 필수'],
                    ['환불', '반품 상품 확인 후 3영업일 이내, 결제하신 수단으로'],
                    ['반품처', `${BUSINESS.address} (${BUSINESS.name})`],
                ]}
            />
            <p className="pn-warn">사진의 날짜·내용을 편집하거나 AI 등으로 조작해 신청하면 업무방해·사기 등으로 형사 고발될 수 있으며, 민사상 손해배상을 청구할 수 있습니다.</p>

            <h3 className="pn-title">교환/반품 제한사항</h3>
            <ul className="pn-list">
                <li>개별 포장(포)을 뜯었거나 일부 소비한 경우 (단, 내용 확인을 위한 택배 상자·외부 포장 개봉은 예외)</li>
                <li>보관 부주의·시간 경과로 상품의 가치가 현저히 감소한 경우</li>
                <li>세트 상품 일부 소비, 구성품·사은품 분실·훼손으로 재판매가 불가한 경우</li>
                <li>화면과 실제 색상·이미지 차이를 이유로 무료 교환·반품을 요청하는 경우 (단순 변심으로 처리)</li>
            </ul>

            <h3 className="pn-title">판매자 정보</h3>
            <Table4
                rows={[
                    ['상호/대표자', `${BUSINESS.name} / ${BUSINESS.ceo}`],
                    ['사업장 소재지', BUSINESS.address],
                    ['e-mail', BUSINESS.email],
                    ['연락처', BUSINESS.phone],
                    ['통신판매업 신고번호', BUSINESS.mailOrderNo],
                    ['사업자번호', BUSINESS.regNo],
                ]}
            />
            <p className="pn-minor">미성년자가 체결한 계약은 법정대리인이 동의하지 않는 경우 본인 또는 법정대리인이 취소할 수 있습니다.</p>
        </div>
    );
}
