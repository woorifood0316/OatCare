export type OrderStatus = 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'canceled' | 'failed';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
    pending: '결제 대기',
    paid: '결제 완료',
    preparing: '상품 준비 중',
    shipped: '배송 중',
    delivered: '배송 완료',
    canceled: '주문 취소',
    failed: '결제 실패',
};

/** Statuses the admin may move an order to, from each status. */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
    pending: [],
    paid: ['preparing', 'shipped'],
    preparing: ['shipped'],
    shipped: ['delivered'],
    delivered: [],
    canceled: [],
    failed: [],
};

export const CARRIERS = [
    { id: 'cj', name: 'CJ대한통운', url: (no: string) => `https://trace.cjlogistics.com/next/tracking.html?wblNo=${encodeURIComponent(no)}` },
    { id: 'lotte', name: '롯데택배', url: (no: string) => `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${encodeURIComponent(no)}` },
    { id: 'hanjin', name: '한진택배', url: (no: string) => `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&wblnum=${encodeURIComponent(no)}` },
    { id: 'epost', name: '우체국택배', url: (no: string) => `https://service.epost.go.kr/trace.RetrieveDomRgiTraceList.comm?sid1=${encodeURIComponent(no)}` },
    { id: 'logen', name: '로젠택배', url: (no: string) => `https://www.ilogen.com/web/personal/trace/${encodeURIComponent(no)}` },
] as const;

export function trackingUrl(carrier: string | null, trackingNo: string | null): string | null {
    if (!carrier || !trackingNo) return null;
    const c = CARRIERS.find((x) => x.name === carrier || x.id === carrier);
    return c ? c.url(trackingNo) : null;
}

/** Customer can cancel on their own only before the parcel is handed to the carrier. */
export function customerCanCancel(status: OrderStatus): boolean {
    return status === 'paid';
}
