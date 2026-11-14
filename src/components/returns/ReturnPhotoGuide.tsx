/** How to photograph a defect / wrong item so the date it was taken can be checked, plus the warning about forged photos. */
export function ReturnPhotoGuide() {
    return (
        <div className="rt-guide">
            <b className="rt-guide__title">📸 사진은 이렇게 올려 주세요</b>
            <ol className="rt-guide__list">
                <li>
                    <b>받으신 상품 전체</b>와 <b>문제가 있는 부분을 가까이</b> 찍어 주세요. 오배송이면 받으신 상품과 <b>상자의 송장</b>이 보이게 찍어 주세요.
                </li>
                <li>
                    <b>찍은 날짜를 확인할 수 있어야 해요.</b> 아래 두 가지 중 하나로 올려 주세요.
                </li>
            </ol>

            <div className="rt-guide__way">
                <b>방법 1 · 카메라에 날짜 표시(워터마크) 기능이 있으면</b>
                <p>
                    기능을 켜고 <b>오늘 날짜가 사진에 보이게</b> 찍어 주세요.
                </p>
                <figure className="rt-guide__sample">
                    <img src="/assets/returns/date-stamp-sample.webp" alt="사진 왼쪽 아래에 찍은 날짜가 표시된 예시 사진" loading="lazy" />
                    <figcaption>예시 · 사진에 찍은 날짜가 함께 보여요</figcaption>
                </figure>
            </div>

            <div className="rt-guide__way">
                <b>방법 2 · 날짜 표시 기능이 없으면</b>
                <p>
                    갤러리(사진 앱)에서 찍은 사진을 연 뒤 <b>화면을 위로 밀어 올려</b> 주세요. <b>찍은 날짜</b>가 나오는 <b>상세정보</b>가 보여요. 이 화면을{' '}
                    <b>캡처(스크린샷)</b>해서 상품 사진과 함께 올려 주세요. (아이폰은 사진 아래의 ⓘ 버튼을 눌러도 돼요)
                </p>
                <figure className="rt-guide__sample">
                    <img src="/assets/returns/photo-info-sample.webp" alt="갤러리에서 사진을 위로 밀어 올리면 보이는 상세정보 화면 예시. 찍은 날짜가 표시돼 있어요." loading="lazy" />
                    <figcaption>예시 · 사진을 위로 밀어 올리면 보이는 상세정보 화면 (빨간 칸이 찍은 날짜)</figcaption>
                </figure>
            </div>
        </div>
    );
}

/** Shown in red wherever defect / wrong-item photos are submitted. */
export function ReturnForgeryWarning() {
    return (
        <div className="rt-warn" role="note">
            <b>⚠️ 사진 조작에 대한 안내</b>
            <p>
                사진의 <b>촬영 날짜나 내용을 편집하거나, AI 등으로 조작·합성</b>해 상품에 하자나 오배송이 있는 것처럼 신청하는 행위는{' '}
                <b>업무방해죄, 사기죄 등으로 형사 고발</b>될 수 있으며, 이로 인해 회사가 입은 손해에 대해서는 <b>민사상 손해배상을 청구</b>할 수 있습니다.
            </p>
            <p>
                회사는 확인을 위해 <b>원본 사진 파일 제출</b>을 요청할 수 있고, 촬영 날짜가 확인되지 않거나 조작이 의심되는 경우 교환·반품이 <b>반려</b>될 수 있습니다.
            </p>
        </div>
    );
}

/** The 교환·반품 text on the product pages (배송·교환·반품 tab). */
export function ReturnPolicySummary() {
    return (
        <>
            <p>
                <b>신청:</b> 마이페이지 &gt; 주문·배송 &gt; 주문 상세의 <b>[교환·반품 신청]</b>에서 접수해 주세요. 승인되면 택배 기사님이 회수하러 방문해요.
            </p>
            <p>
                <b>단순 변심:</b> 상품을 받은 날부터 7일 이내, <b>개봉하지 않은 상품</b>만 반품할 수 있어요(식품 특성상 개봉·섭취 후에는 불가). 반품 배송비는 고객 부담으로,{' '}
                <b>주문 전체 반품 시 왕복 6,000원</b>(처음 배송비 3,000원을 내셨다면 그 금액 포함), <b>일부 반품 시 편도 3,000원</b>을 환불 금액에서 빼고 돌려드려요.
            </p>
            <p>
                <b>상품 하자·오배송:</b> 받은 날부터 3개월 이내, 알게 된 날부터 30일 이내 교환 또는 환불해 드리며 배송비는 회사가 부담해요. 문제 부분 사진과{' '}
                <b>찍은 날짜를 확인할 수 있는 사진</b>(날짜 표시 사진 또는 사진 상세정보 캡처)을 함께 올려 주세요. 받으신 직후 확인해 주시면 더 빠르게 처리돼요.
            </p>
            <p className="rt-warn-line">
                사진의 날짜·내용을 편집하거나 AI 등으로 조작해 신청하면 업무방해·사기 등으로 형사 고발될 수 있으며, 민사상 손해배상을 청구할 수 있습니다.
            </p>
            <p>환불은 반품 상품 확인 후 3영업일 이내, 결제하신 수단으로 처리돼요.</p>
        </>
    );
}
