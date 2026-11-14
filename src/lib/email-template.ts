// Customer emails: one layout (logo, title, details, a button back to the site, business info) and the content of
// each event. Order emails are built from the order as it is now (items, amounts, shipping), not from the queued
// payload, so a resend shows the current state. Plain-text versions go along for mail apps that don't show HTML.
import type { NotifyEvent } from './notify';
import { customerMessage } from './notify-messages';
import { getOrderByNo, type Order } from './orders';
import { FLAVORS } from './catalog';
import { trackingUrl } from './order-status';

const SITE = () => (process.env.SITE_URL || 'https://chamoatcare.com').replace(/\/$/, '');
const won = (n: unknown) => `${Number(n ?? 0).toLocaleString('ko-KR')}원`;
const esc = (s: unknown) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
const kst = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
/** 010-1234-5678 → 010-****-5678 (the email may be forwarded or read on a shared screen). */
const maskPhone = (p: string | null) => (p ? p.replace(/^(\d{2,3})-?(\d{3,4})-?(\d{4})$/, '$1-****-$3') : '');

export { BUSINESS } from './business';
import { BUSINESS } from './business';

export interface Email {
    subject: string;
    html: string;
    text: string;
}

const C = { maroon: '#7a2331', brown: '#3b2a20', cream: '#f7f1e4', line: '#e7dcc4', muted: '#8a7a6a' };

/** Two-column rows ("상품 금액 | 18,700원"). */
function rows(list: [string, string, boolean?][]): string {
    return list
        .map(
            ([k, v, strong]) => `<tr>
  <td style="padding:6px 0;color:${C.muted};font-size:14px;">${esc(k)}</td>
  <td style="padding:6px 0;text-align:right;font-size:${strong ? 17 : 14}px;${strong ? `font-weight:800;color:${C.maroon};` : `color:${C.brown};`}">${v}</td>
</tr>`,
        )
        .join('');
}

function section(title: string, inner: string): string {
    return `<tr><td style="padding:18px 28px 4px;">
  <div style="font-size:13px;font-weight:800;color:${C.brown};margin-bottom:8px;">${esc(title)}</div>
  ${inner}
</td></tr>`;
}

function mixText(mix?: Record<string, number>): string {
    if (!mix) return '';
    return FLAVORS.filter((f) => (mix[f] ?? 0) > 0)
        .map((f) => `${f} ${mix[f]}`)
        .join(' · ');
}

/** Ordered items + amounts. */
function orderDetail(o: Order): { html: string; text: string } {
    const items = o.items
        .map((it) => {
            const mix = mixText(it.mixBreakdown);
            const sub = [mix, it.cycleDays && !it.gift ? `${it.cycleDays}일마다 정기배송` : '', it.gift ? '사은품' : ''].filter(Boolean).join(' · ');
            return `<tr>
  <td style="padding:10px 0;border-bottom:1px solid ${C.line};font-size:14px;color:${C.brown};">
    <b>${esc(it.name)}</b>${sub ? `<br><span style="font-size:12px;color:${C.muted};">${esc(sub)}</span>` : ''}
  </td>
  <td style="padding:10px 10px;border-bottom:1px solid ${C.line};font-size:14px;color:${C.brown};text-align:center;white-space:nowrap;">${it.qty}개</td>
  <td style="padding:10px 0;border-bottom:1px solid ${C.line};font-size:14px;color:${C.brown};text-align:right;white-space:nowrap;">${it.gift ? '무료' : won(it.amount)}</td>
</tr>`;
        })
        .join('');
    const totals: [string, string, boolean?][] = [
        ['상품 금액', won(o.subtotal)],
        ['배송비', o.shippingFee === 0 ? '무료' : won(o.shippingFee)],
    ];
    if (o.discountAmount > 0) totals.push(['쿠폰 할인', `-${won(o.discountAmount)}`]);
    totals.push(['결제 금액', `${won(o.amount)}${o.paymentLabel ? `<br><span style="font-size:12px;font-weight:400;color:${C.muted};">${esc(o.paymentLabel)}</span>` : ''}`, true]);

    const html =
        section('주문 상품', `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${items}</table>`) +
        section('결제 금액', `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows(totals)}</table>`) +
        (o.shipAddress1
            ? section(
                  '배송지',
                  `<div style="font-size:14px;line-height:1.7;color:${C.brown};">${esc(o.shipName)} · ${esc(maskPhone(o.shipPhone))}<br>${o.shipZip ? `(${esc(o.shipZip)}) ` : ''}${esc(o.shipAddress1)} ${esc(o.shipAddress2 ?? '')}${o.shipMemo ? `<br><span style="color:${C.muted};">요청사항: ${esc(o.shipMemo)}</span>` : ''}</div>`,
              )
            : '');
    const text = [
        '[주문 상품]',
        ...o.items.map((it) => `- ${it.name} ${it.qty}개 ${it.gift ? '무료' : won(it.amount)}${it.mixBreakdown ? ` (${mixText(it.mixBreakdown)})` : ''}`),
        '',
        `상품 금액 ${won(o.subtotal)} / 배송비 ${o.shippingFee === 0 ? '무료' : won(o.shippingFee)}${o.discountAmount > 0 ? ` / 쿠폰 할인 -${won(o.discountAmount)}` : ''}`,
        `결제 금액 ${won(o.amount)}${o.paymentLabel ? ` (${o.paymentLabel})` : ''}`,
        o.shipAddress1 ? `\n[배송지] ${o.shipName} · ${maskPhone(o.shipPhone)} / ${o.shipAddress1} ${o.shipAddress2 ?? ''}` : '',
    ]
        .filter((l) => l !== undefined)
        .join('\n');
    return { html, text };
}

/** The whole email. `lead` paragraphs are plain text (escaped); `extraHtml` is already-built sections. */
export function layout(opts: {
    title: string;
    lead: string[];
    meta?: [string, string][];
    extraHtml?: string;
    button?: { label: string; url: string };
    note?: string;
}): string {
    const logo = `${SITE()}/assets/oatcare-logo.png`;
    const meta = opts.meta?.length
        ? section('', `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.cream};border-radius:10px;padding:6px 14px;">${rows(opts.meta.map(([k, v]) => [k, esc(v)]))}</table>`)
        : '';
    const button = opts.button
        ? `<tr><td align="center" style="padding:26px 28px 8px;">
  <a href="${esc(opts.button.url)}" style="display:inline-block;padding:14px 34px;border-radius:12px;background:${C.maroon};color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;">${esc(opts.button.label)}</a>
</td></tr>`
        : '';
    const note = opts.note ? `<tr><td style="padding:14px 28px 0;font-size:13px;line-height:1.7;color:${C.muted};">${esc(opts.note)}</td></tr>` : '';
    return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#f3eee4;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3eee4;padding:24px 10px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffdf8;border-radius:16px;overflow:hidden;border:1px solid ${C.line};">
  <tr><td style="padding:22px 28px 6px;"><a href="${SITE()}" style="text-decoration:none;color:${C.maroon};font-size:18px;font-weight:800;"><img src="${logo}" width="34" height="34" alt="" style="vertical-align:middle;border-radius:8px;margin-right:8px;">참오트케어</a></td></tr>
  <tr><td style="padding:14px 28px 0;font-size:22px;font-weight:800;color:${C.brown};">${esc(opts.title)}</td></tr>
  <tr><td style="padding:8px 28px 0;font-size:15px;line-height:1.7;color:${C.brown};">${opts.lead.map((l) => esc(l)).join('<br>')}</td></tr>
  ${meta}
  ${opts.extraHtml ?? ''}
  ${button}
  ${note}
  <tr><td style="padding:28px 28px 24px;border-top:1px solid ${C.line};font-size:12px;line-height:1.7;color:${C.muted};">
    고객센터 ${BUSINESS.phone} (평일 09:00~18:00) · ${BUSINESS.email}<br>
    상호 ${BUSINESS.name} · 대표 ${BUSINESS.ceo} · 사업자등록번호 ${BUSINESS.regNo} · 통신판매업 ${BUSINESS.mailOrderNo}<br>
    ${BUSINESS.address}<br>
    이 메일은 주문·결제·배송 등 거래 안내를 위해 발송된 메일이에요.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

const textFooter = () =>
    `\n\n---\n참오트케어 고객센터 ${BUSINESS.phone} · ${BUSINESS.email}\n상호 ${BUSINESS.name} · 대표 ${BUSINESS.ceo} · 사업자등록번호 ${BUSINESS.regNo}\n${BUSINESS.address}`;

/**
 * The email for one queued customer notification, or null when this event sends none.
 * `order` can be passed in (test mail); otherwise it is loaded from the payload's orderNo.
 */
export async function buildCustomerEmail(event: NotifyEvent, p: Record<string, unknown>, order?: Order | null): Promise<Email | null> {
    const base = customerMessage(event, p);
    if (!base) return null;
    const o = order !== undefined ? order : typeof p.orderNo === 'string' ? await getOrderByNo(p.orderNo) : null;
    const orderUrl = o ? `${SITE()}/mypage/orders/${o.orderNo}` : `${SITE()}/mypage/orders`;
    const subUrl = `${SITE()}/mypage/subscription`;
    const detail = o ? orderDetail(o) : null;
    const orderMeta: [string, string][] = o ? [['주문번호', o.orderNo], ['주문일시', kst(o.paidAt ?? o.createdAt)]] : [];

    let title = base.subject.replace(/^\[참오트케어\]\s*/, '').replace(/\s*\([^)]*\)\s*$/, '');
    let lead: string[] = [];
    let button: { label: string; url: string } | undefined = { label: '주문 내역 확인하기', url: orderUrl };
    let note: string | undefined;
    let meta = orderMeta;
    let extra = detail?.html ?? '';

    switch (event) {
        case 'order_paid':
            title = '주문해 주셔서 감사합니다';
            lead = ['주문이 완료됐어요. 꼼꼼히 준비해서 보내 드릴게요.'];
            note = '평일 오후 1시까지 결제하신 주문은 당일 발송돼요. 발송되면 운송장 번호를 다시 알려 드릴게요.';
            break;
        case 'order_canceled':
            title = '주문이 취소됐어요';
            lead = [`결제하신 ${won(p.amount ?? o?.amount)}이 환불돼요.`, '카드사에 따라 환불 반영까지 영업일 기준 3~5일 걸릴 수 있어요.'];
            if (p.reason) meta = [...orderMeta, ['취소 사유', String(p.reason)]];
            break;
        case 'order_shipped': {
            title = '상품이 출발했어요';
            const carrier = String(p.carrier ?? o?.carrier ?? '');
            const no = String(p.trackingNo ?? o?.trackingNo ?? '');
            lead = ['주문하신 상품을 보내 드렸어요. 보통 1~2일 안에 도착해요.'];
            meta = [...orderMeta, ['택배사', carrier], ['운송장 번호', no]];
            const track = trackingUrl(carrier, no);
            button = track ? { label: '배송 조회하기', url: track } : button;
            note = '받으신 상품에 문제가 있으면 마이페이지 > 주문·배송 > 주문 상세에서 교환·반품을 신청해 주세요.';
            break;
        }
        case 'subscription_started':
            title = '정기구독이 시작됐어요';
            lead = [`${p.cycleDays}일마다 자동으로 결제되고 배송돼요. 첫 회차 상품은 지금 준비하고 있어요.`, '정기구독은 최소 2회 이용(결제) 후 해지할 수 있어요.'];
            button = { label: '구독 관리하기', url: subUrl };
            note = '배송 주기 변경, 건너뛰기, 해지는 마이페이지 > 정기구독에서 할 수 있어요.';
            break;
        case 'subscription_charged':
            title = '정기구독 결제가 완료됐어요';
            lead = ['이번 회차 결제가 완료되어 상품을 준비하고 있어요.'];
            button = { label: '구독 관리하기', url: subUrl };
            break;
        case 'subscription_charge_failed':
            title = '정기구독 결제에 실패했어요';
            lead = [`등록된 카드로 결제하지 못했어요. (${String(p.reason ?? '')})`, `${p.retryInDays}일 뒤에 다시 시도해요. 카드를 확인하거나 지금 바로 결제할 수 있어요.`];
            button = { label: '결제 카드 확인하기', url: subUrl };
            extra = '';
            meta = [];
            break;
        case 'billing_upcoming':
            title = '정기구독 결제 예정 안내';
            lead = [`${p.date}에 ${won(p.amount)}이 자동 결제될 예정이에요.`, '주기 변경, 건너뛰기, 해지는 결제일 전날까지 할 수 있어요.'];
            button = { label: '구독 관리하기', url: subUrl };
            extra = '';
            meta = [];
            break;
        case 'subscription_paused':
        case 'subscription_cancel_requested':
        case 'subscription_canceled':
            lead = base.text.split('\n').filter((l) => l && !l.startsWith('http') && !/: https?:/.test(l));
            button = event === 'subscription_canceled' ? { label: '참오트케어 둘러보기', url: SITE() } : { label: '구독 관리하기', url: subUrl };
            extra = '';
            meta = [];
            break;
        case 'return_requested':
        case 'return_approved':
        case 'return_rejected':
        case 'return_completed':
            lead = base.text.split('\n').filter((l) => l && !/https?:/.test(l));
            button = { label: '진행 상황 확인하기', url: orderUrl };
            extra = '';
            break;
        case 'inquiry_answered':
            title = '남기신 상품 문의에 답변이 달렸어요';
            lead = [];
            meta = [];
            extra =
                section('문의', `<div style="font-size:14px;line-height:1.7;color:${C.brown};white-space:pre-wrap;">${esc(p.question)}</div>`) +
                section('참오트케어 답변', `<div style="font-size:14px;line-height:1.7;color:${C.brown};background:${C.cream};border-radius:10px;padding:12px 14px;white-space:pre-wrap;">${esc(p.answer)}</div>`);
            button = { label: '내 문의 보기', url: `${SITE()}/mypage/inquiries` };
            break;
        default:
            lead = base.text.split('\n').filter((l) => l && !/https?:/.test(l));
            extra = '';
    }

    const html = layout({ title, lead, meta, extraHtml: extra, button, note });
    const text = [
        title,
        '',
        ...lead,
        ...(meta.length ? ['', ...meta.map(([k, v]) => `${k}: ${v}`)] : []),
        ...(extra && detail && extra === detail.html ? ['', detail.text] : []),
        ...(event === 'inquiry_answered' ? ['', `문의: ${p.question}`, `답변: ${p.answer}`] : []),
        ...(button ? ['', `${button.label}: ${button.url}`] : []),
        ...(note ? ['', note] : []),
    ].join('\n');
    return { subject: base.subject, html, text: text + textFooter() };
}

