// Same-day shipping rule: orders PAID by 13:00 KST on a shipping day leave the same day;
// later payments (and weekends / public holidays, when the couriers don't run) leave on the next shipping day.
// All calculations are done in Korea time, whatever the visitor's device clock zone is.

export const SHIP_CUTOFF_HOUR = 13;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * Korean public holidays (관공서 공휴일), including the lunar holidays, election days and substitute holidays
 * (대체공휴일: 설·추석 overlapping a Sunday/another holiday; 어린이날 on a weekend/holiday;
 * 3·1절·광복절·개천절·한글날·부처님오신날·성탄절 on a weekend). 신정·현충일 have no substitute day.
 * ⚠ Extend this list before it runs out (last year below). Newly announced temporary holidays must be added by hand.
 */
const HOLIDAYS = new Set<string>([
    // 2026
    '2026-01-01',
    '2026-02-16', '2026-02-17', '2026-02-18', // 설날
    '2026-03-01', '2026-03-02', // 삼일절 (일) + 대체
    '2026-05-05',
    '2026-05-24', '2026-05-25', // 부처님오신날 (일) + 대체
    '2026-06-03', // 지방선거
    '2026-06-06',
    '2026-08-15', '2026-08-17', // 광복절 (토) + 대체
    '2026-09-24', '2026-09-25', '2026-09-26', // 추석
    '2026-10-03', '2026-10-05', // 개천절 (토) + 대체
    '2026-10-09',
    '2026-12-25',
    // 2027
    '2027-01-01',
    '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09', // 설날 (일 겹침) + 대체
    '2027-03-01',
    '2027-05-05',
    '2027-05-13', // 부처님오신날
    '2027-06-06',
    '2027-08-15', '2027-08-16', // 광복절 (일) + 대체
    '2027-09-14', '2027-09-15', '2027-09-16', // 추석
    '2027-10-03', '2027-10-04', // 개천절 (일) + 대체
    '2027-10-09', '2027-10-11', // 한글날 (토) + 대체
    '2027-12-25', '2027-12-27', // 성탄절 (토) + 대체
    // 2028
    '2028-01-01',
    '2028-01-26', '2028-01-27', '2028-01-28', // 설날
    '2028-03-01',
    '2028-04-12', // 국회의원 선거
    '2028-05-02', // 부처님오신날
    '2028-05-05',
    '2028-06-06',
    '2028-08-15',
    '2028-10-02', '2028-10-03', '2028-10-04', '2028-10-05', // 추석 (개천절 겹침) + 대체
    '2028-10-09',
    '2028-12-25',
    // 2029
    '2029-01-01',
    '2029-02-12', '2029-02-13', '2029-02-14', // 설날
    '2029-03-01',
    '2029-05-05', '2029-05-07', // 어린이날 (토) + 대체
    '2029-05-20', '2029-05-21', // 부처님오신날 (일) + 대체
    '2029-06-06',
    '2029-08-15',
    '2029-09-21', '2029-09-22', '2029-09-23', '2029-09-24', // 추석 (일 겹침) + 대체
    '2029-10-03',
    '2029-10-09',
    '2029-12-25',
]);

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

/** A Date whose UTC fields read as the Korea-time calendar/clock. */
const toKst = (d: Date) => new Date(d.getTime() + KST_OFFSET_MS);
const key = (k: Date) =>
    `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, '0')}-${String(k.getUTCDate()).padStart(2, '0')}`;

/** k is a KST-shifted date (see toKst). */
export function isShippingDay(k: Date): boolean {
    const dow = k.getUTCDay();
    return dow !== 0 && dow !== 6 && !HOLIDAYS.has(key(k));
}

export interface ShipEstimate {
    /** Paid now, it leaves today. */
    sameDay: boolean;
    /** Milliseconds until today's 13:00 cut-off (only when sameDay). */
    msLeft: number;
    /** Calendar days from today (KST) to the shipping day: 0 today, 1 tomorrow… */
    daysAhead: number;
    /** e.g. "오늘", "내일(목)", "11/9(월)" */
    label: string;
}

export function shipEstimate(now: Date = new Date()): ShipEstimate {
    const k = toKst(now);
    if (isShippingDay(k) && k.getUTCHours() < SHIP_CUTOFF_HOUR) {
        const cutoff = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate(), SHIP_CUTOFF_HOUR) - KST_OFFSET_MS;
        return { sameDay: true, msLeft: Math.max(0, cutoff - now.getTime()), daysAhead: 0, label: '오늘' };
    }
    const d = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()));
    let days = 0;
    do {
        d.setUTCDate(d.getUTCDate() + 1);
        days += 1;
    } while (!isShippingDay(d) && days < 30);
    const wd = WEEKDAY_KO[d.getUTCDay()];
    const label = days === 1 ? `내일(${wd})` : `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${wd})`;
    return { sameDay: false, msLeft: 0, daysAhead: days, label };
}

/** "2시간 15분" / "45분" (rounded up to the minute). */
export function formatLeft(ms: number): string {
    const totalMin = Math.max(1, Math.ceil(ms / 60000));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m}분`;
    return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}
