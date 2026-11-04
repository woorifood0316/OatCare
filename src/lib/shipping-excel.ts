// Excel forms for the admin orders screen (SheetJS, pure JS so it runs on the edge runtime).
//   A. 배송정보 출력 양식 (download)  - header text / column order / cell formats follow the client's form exactly.
//   B. 송장번호 일괄 업로드 양식 (upload) - same 4 columns as the Naver Smart Store 발송처리 form.
import * as XLSX from 'xlsx';
import type { Order } from './orders';
import { FLAVORS, GIFT_SHAKER_NAME } from './catalog';
import { CARRIERS } from './order-status';

// ---- Form A -------------------------------------------------------------------------------------------------------

// NOTE: "우편변호" (sic) is the client's original header; the carrier's system may read the file by this name.
export const EXPORT_HEADERS = [
    '받는사람 이름',
    '받는사람 전화번호',
    '받는사람 전화번호2',
    '우편변호',
    '받는사람 주소',
    '받는사람 상세주소',
    '상품 이름',
    '옵션 이름',
    '상품 수량',
    '배송메시지',
    '주문일시',
    '주문번호',
] as const;

const EXPORT_COL_WIDTHS = [17, 21.5, 13, 15, 84, 17, 80, 13.5, 12, 24, 18.5, 24.5];
// columns that must stay text so leading zeros survive: 전화번호, 전화번호2, 우편변호
const TEXT_COLS = new Set([1, 2, 3]);

/** `YYYY-MM-DD HH:mm:ss` in Korea time. */
export function kstDateTime(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

/** One row per order line (a free gift is its own line). The order number is the same for every row of an order. */
export function exportRows(orders: Order[]): (string | number)[][] {
    const rows: (string | number)[][] = [];
    for (const o of orders) {
        for (const it of o.items) {
            const rawOption = it.mixBreakdown
                ? // jsonb does not keep key order, so always print in the catalog's flavour order
                  FLAVORS.filter((f) => (it.mixBreakdown?.[f] ?? 0) > 0)
                      .map((f) => `${f} ${it.mixBreakdown?.[f]}`)
                      .join(' / ')
                : it.gift
                  ? '증정'
                  : '';
            // Brackets make the option stand out on the printed waybill: "[그레인 4 / 고구마 4]"
            const option = rawOption ? `[${rawOption}]` : '';
            // The carrier's waybill prints only "받는사람 주소", so the detail address goes into it too;
            // the 상세주소 column stays (the form's layout is fixed) but is left empty to avoid printing it twice.
            const address = [o.shipAddress1, o.shipAddress2].map((x) => (x ?? '').trim()).filter(Boolean).join(' ');
            rows.push([
                o.shipName ?? '',
                o.shipPhone ?? '',
                '',
                o.shipZip ?? '',
                address,
                '',
                it.gift ? it.name || GIFT_SHAKER_NAME : it.name,
                option,
                it.qty,
                o.shipMemo ?? '',
                kstDateTime(o.paidAt ?? o.createdAt),
                o.orderNo,
            ]);
        }
    }
    return rows;
}

export function buildExportWorkbook(orders: Order[]): Uint8Array {
    const rows = exportRows(orders);
    const ws: XLSX.WorkSheet = {};
    const put = (r: number, c: number, v: string | number, text: boolean) => {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (typeof v === 'number') ws[addr] = { t: 'n', v };
        else ws[addr] = text ? { t: 's', v, z: '@' } : { t: 's', v };
    };
    EXPORT_HEADERS.forEach((h, c) => put(0, c, h, false));
    rows.forEach((row, i) => row.forEach((v, c) => put(i + 1, c, v, TEXT_COLS.has(c))));
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length, 1), c: EXPORT_HEADERS.length - 1 } });
    ws['!cols'] = EXPORT_COL_WIDTHS.map((wch) => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '그레인'); // sheet name as in the client's original
    return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}

// ---- Form B -------------------------------------------------------------------------------------------------------

export const UPLOAD_HEADERS = ['상품주문번호', '배송방법', '택배사', '송장번호'] as const;
export const UPLOAD_SHEET = '발송처리';
export const METHOD_COURIER = '택배,등기,소포';
export const METHODS = [METHOD_COURIER, '퀵서비스', '방문수령', '직접전달'] as const;

export function buildTemplateWorkbook(): Uint8Array {
    const ws = XLSX.utils.aoa_to_sheet([[...UPLOAD_HEADERS]]);
    ws['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, UPLOAD_SHEET);
    return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}

export interface UploadRow {
    /** 1-based row number in the sheet, for error messages. */
    line: number;
    orderNo: string;
    method: string;
    carrier: string;
    trackingNo: string;
    /** Set by a parser when the file itself is inconsistent for this order (shown as an error). */
    conflict?: string;
    /** TOGLE rows: the waybill may come from any carrier, so a missing / unknown carrier name is not an error. */
    anyCarrier?: boolean;
    /** Courier files list other sellers' parcels too: rows whose order number is not ours are skipped. */
    foreign?: boolean;
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_UPLOAD_ROWS = 5000;

export type ParseResult = { ok: true; rows: UploadRow[] } | { ok: false; error: string };

/** Reads .xls and .xlsx. Everything is read as text so long numbers never turn into 1.2E+15. */
export function parseUpload(data: Uint8Array): ParseResult {
    let wb: XLSX.WorkBook;
    try {
        wb = XLSX.read(data, { type: 'array', raw: false, cellDates: false });
    } catch {
        return { ok: false, error: '엑셀 파일을 읽지 못했어요. .xls 또는 .xlsx 파일인지 확인해 주세요' };
    }
    const sheet = wb.Sheets[UPLOAD_SHEET] ?? wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return { ok: false, error: '시트를 찾지 못했어요' };
    const grid = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '', raw: false, blankrows: false });

    // Find the header row by column name (order of columns may differ).
    let headerAt = -1;
    for (let i = 0; i < Math.min(grid.length, 10); i++) {
        if ((grid[i] ?? []).some((c) => String(c).trim() === UPLOAD_HEADERS[0])) {
            headerAt = i;
            break;
        }
    }
    if (headerAt < 0) return { ok: false, error: '"상품주문번호" 열을 찾지 못했어요. 송장번호 업로드 양식이 맞는지 확인해 주세요' };
    const header = (grid[headerAt] ?? []).map((c) => String(c).trim());
    const col = (name: string) => header.indexOf(name);
    const idx = { order: col('상품주문번호'), method: col('배송방법'), carrier: col('택배사'), tracking: col('송장번호') };
    const missing = UPLOAD_HEADERS.filter((h) => col(h) < 0);
    if (missing.length) return { ok: false, error: `필수 열이 없어요: ${missing.join(', ')}` };

    const rows: UploadRow[] = [];
    for (let i = headerAt + 1; i < grid.length; i++) {
        const r = grid[i] ?? [];
        const orderNo = String(r[idx.order] ?? '').trim();
        // The original form has explanation rows (2~3행); skip them and empty lines.
        if (!orderNo || orderNo.startsWith('발주처리를') || orderNo.startsWith('※')) continue;
        rows.push({
            line: i + 1,
            orderNo,
            method: String(r[idx.method] ?? '').trim(),
            carrier: String(r[idx.carrier] ?? '').trim(),
            trackingNo: String(r[idx.tracking] ?? '').trim(),
        });
        if (rows.length > MAX_UPLOAD_ROWS) return { ok: false, error: `한 번에 ${MAX_UPLOAD_ROWS.toLocaleString('ko-KR')}행까지 올릴 수 있어요` };
    }
    if (rows.length === 0) return { ok: false, error: '처리할 행이 없어요' };
    return { ok: true, rows };
}

// ---- TOGLE waybill file ------------------------------------------------------------------------------------------
// TOGLE_<이름>_YYYYMMDD_HHMMSS.xlsx: Sheet1, header in row 1, 13 columns (운송장번호 … 주문번호, header typo "우편변호").
// It is our own delivery-info export plus a 운송장번호 column, so one order can span several rows (one per product
// line, gift included). TOGLE gathers waybills from several carriers; the file normally has no carrier column,
// so the carrier is stored only when a "택배사" column exists (the tracking link then falls back to a search).

export const TOGLE_HEADERS = { order: '주문번호', tracking: '운송장번호', carrier: '택배사' } as const;
/** Stored as the carrier when the TOGLE file does not say which one. */
export const UNKNOWN_CARRIER = '택배';

/** Cell value as text without losing digits (a 12-digit number must not become 4.12E+11). */
function cellText(v: unknown): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 0 }) : String(v);
    return String(v).trim();
}

/** Our own order numbers: OC + YYYYMMDD + "-" + 6 letters/digits (lib/orders.ts newOrderNo). */
export const OUR_ORDER_RE = /^OC\d{8}-[A-Z0-9]{6,8}$/;

export type WaybillSource = 'togle' | 'lotte';

const SOURCES: Record<WaybillSource, { label: string; sheet: string; carrier: string | null }> = {
    // TOGLE: our delivery-info export + 운송장번호; mixed carriers, normally no carrier column.
    togle: { label: '토글', sheet: 'Sheet1', carrier: null },
    // Lotte (롯데택배 출고·송장 내역 *_YYMMDD.xlsx): Sheet0, 48 columns, one row per waybill. The file lists every
    // parcel of the day, other malls' orders included (Naver/Coupang numbers, "-"): only OC… numbers are ours.
    lotte: { label: '롯데택배', sheet: 'Sheet0', carrier: '롯데택배' },
};

/**
 * Waybill files from TOGLE or Lotte: find the 운송장번호 / 주문번호 columns by name, read every cell as text,
 * merge the rows of one order, flag one order with two different waybills, and mark other sellers' rows.
 */
export function parseWaybillUpload(data: Uint8Array, source: WaybillSource): ParseResult {
    const src = SOURCES[source];
    let wb: XLSX.WorkBook;
    try {
        // cellStyles off: these files carry broken style records that some readers choke on.
        wb = XLSX.read(data, { type: 'array', cellStyles: false, cellDates: false });
    } catch {
        return { ok: false, error: `엑셀 파일을 읽지 못했어요. ${src.label}에서 내려받은 .xlsx 파일인지 확인해 주세요` };
    }
    const sheet = wb.Sheets[src.sheet] ?? wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return { ok: false, error: '시트를 찾지 못했어요' };
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true, blankrows: false });

    let headerAt = -1;
    for (let i = 0; i < Math.min(grid.length, 10); i++) {
        const cells = (grid[i] ?? []).map(cellText);
        if (cells.includes(TOGLE_HEADERS.order) && cells.includes(TOGLE_HEADERS.tracking)) {
            headerAt = i;
            break;
        }
    }
    if (headerAt < 0) return { ok: false, error: `"운송장번호"와 "주문번호" 열을 찾지 못했어요. ${src.label}에서 내려받은 송장 파일인지 확인해 주세요` };
    const header = (grid[headerAt] ?? []).map(cellText);
    const iOrder = header.indexOf(TOGLE_HEADERS.order);
    const iTracking = header.indexOf(TOGLE_HEADERS.tracking);
    const iCarrier = src.carrier ? -1 : header.indexOf(TOGLE_HEADERS.carrier); // optional (TOGLE)

    const byOrder = new Map<string, UploadRow>();
    const others: UploadRow[] = [];
    for (let i = headerAt + 1; i < grid.length; i++) {
        const r = grid[i] ?? [];
        const orderNo = cellText(r[iOrder]);
        const trackingNo = cellText(r[iTracking]);
        const carrier = src.carrier ?? (iCarrier >= 0 ? cellText(r[iCarrier]) : '');
        if (!orderNo && !trackingNo) continue;
        const row: UploadRow = { line: i + 1, orderNo: orderNo || '-', method: METHOD_COURIER, carrier, trackingNo, anyCarrier: true };
        // Another seller's parcel in the same courier file: shown as "skipped", never an error.
        if (!OUR_ORDER_RE.test(orderNo)) {
            others.push({ ...row, foreign: true });
            continue;
        }
        const prev = byOrder.get(orderNo);
        if (!prev) {
            byOrder.set(orderNo, row);
        } else if (!prev.trackingNo && trackingNo) {
            prev.trackingNo = trackingNo;
        } else if (trackingNo && normalizeTracking(trackingNo) !== normalizeTracking(prev.trackingNo)) {
            prev.conflict = `한 주문에 운송장번호가 여러 개예요 (${prev.trackingNo}, ${trackingNo})`;
        }
        if (byOrder.size + others.length > MAX_UPLOAD_ROWS) return { ok: false, error: `한 번에 ${MAX_UPLOAD_ROWS.toLocaleString('ko-KR')}행까지 올릴 수 있어요` };
    }
    const rows = [...byOrder.values(), ...others].sort((x, y) => x.line - y.line);
    if (rows.length === 0) return { ok: false, error: '처리할 행이 없어요' };
    return { ok: true, rows };
}

/** @deprecated kept for callers/tests: same as parseWaybillUpload(data, 'togle'). */
export function parseTogleUpload(data: Uint8Array): ParseResult {
    return parseWaybillUpload(data, 'togle');
}

// ---- carrier names / validation -----------------------------------------------------------------------------------

const ALIASES: Record<string, string> = {
    cj: 'CJ대한통운',
    cj대한통운: 'CJ대한통운',
    대한통운: 'CJ대한통운',
    cj택배: 'CJ대한통운',
    씨제이대한통운: 'CJ대한통운',
    롯데: '롯데택배',
    롯데택배: '롯데택배',
    롯데글로벌로지스: '롯데택배',
    한진: '한진택배',
    한진택배: '한진택배',
    우체국: '우체국택배',
    우체국택배: '우체국택배',
    로젠: '로젠택배',
    로젠택배: '로젠택배',
};

/** Standard carrier name for what a person typed, or null when it is not a registered carrier. */
export function normalizeCarrier(raw: string): string | null {
    const key = raw.replace(/\s+/g, '').toLowerCase();
    const name = ALIASES[key];
    if (name && CARRIERS.some((c) => c.name === name)) return name;
    return CARRIERS.find((c) => c.name.replace(/\s+/g, '').toLowerCase() === key)?.name ?? null;
}

export function normalizeTracking(raw: string): string {
    return raw.replace(/[^0-9A-Za-z]/g, '').slice(0, 30);
}

export type RowState = 'ok' | 'already' | 'error' | 'skip';

export interface CheckedRow extends UploadRow {
    state: RowState;
    message: string;
    /** What will be stored when the row is applied. */
    carrierName: string | null;
    tracking: string | null;
    orderStatus: string | null;
}

export interface OrderLite {
    orderNo: string;
    status: string;
    carrier: string | null;
    trackingNo: string | null;
}

/** Pure validation of upload rows against the orders found in the database. */
export function checkRows(rows: UploadRow[], orders: Map<string, OrderLite>): CheckedRow[] {
    const seen = new Set<string>();
    return rows.map((row) => {
        const base: CheckedRow = { ...row, state: 'ok', message: '', carrierName: null, tracking: null, orderStatus: null };
        const fail = (message: string): CheckedRow => ({ ...base, state: 'error', message });

        if (row.foreign) return { ...base, state: 'skip', message: '다른 판매처 주문이에요 (참오트케어 주문번호가 아님)' };
        if (row.conflict) return fail(row.conflict);
        if (seen.has(row.orderNo)) return fail('파일 안에서 주문번호가 중복돼요');
        seen.add(row.orderNo);

        const order = orders.get(row.orderNo);
        if (!order) return fail('주문번호를 찾을 수 없어요');
        base.orderStatus = order.status;

        if (!(METHODS as readonly string[]).includes(row.method)) {
            return fail(`배송방법이 올바르지 않아요 (${METHODS.join(' / ')})`);
        }
        if (row.method === METHOD_COURIER) {
            let carrierName = normalizeCarrier(row.carrier);
            if (row.anyCarrier) {
                // TOGLE: keep whatever the file says (or a generic name); never reject the row for it
                carrierName ??= row.carrier.trim().slice(0, 20) || UNKNOWN_CARRIER;
            } else {
                if (!row.carrier) return fail('택배사를 입력해 주세요');
                if (!carrierName) return fail(`등록되지 않은 택배사예요 (${row.carrier})`);
            }
            const tracking = normalizeTracking(row.trackingNo);
            if (!tracking) return fail('송장번호를 입력해 주세요');
            if (tracking.length < 5) return fail('송장번호가 너무 짧아요');
            base.carrierName = carrierName;
            base.tracking = tracking;
        } else {
            // 퀵서비스 / 방문수령 / 직접전달: no carrier and no tracking number.
            base.carrierName = row.method;
            base.tracking = null;
        }

        switch (order.status) {
            case 'paid':
            case 'preparing':
                return base;
            case 'shipped':
                return { ...base, state: 'already', message: `이미 발송 처리된 주문이에요 (${order.carrier ?? ''} ${order.trackingNo ?? ''})`.trim() };
            case 'canceled':
                return fail('취소된 주문이에요');
            case 'delivered':
                return fail('이미 배송 완료된 주문이에요');
            default:
                return fail('결제가 완료되지 않은 주문이에요');
        }
    });
}

export function buildErrorWorkbook(rows: CheckedRow[]): Uint8Array {
    const aoa = [
        [...UPLOAD_HEADERS, '오류사유'],
        ...rows.filter((r) => r.state === 'error').map((r) => [r.orderNo, r.method, r.carrier, r.trackingNo, r.message]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, UPLOAD_SHEET);
    return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}
