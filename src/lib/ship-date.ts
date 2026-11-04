// Same-day shipping rule: orders PAID by 13:00 KST on a shipping day leave the same day;
// later payments (and weekends / public holidays, when the couriers don't run) leave on the next shipping day.
// All calculations are done in Korea time, whatever the visitor's device clock zone is.
//
// Public holidays are computed automatically for any year (fixed-date days, lunar days via the Korean
// "dangi" calendar built into Intl, and substitute holidays by rule). What can't be computed (election
// days, temporary holidays, courier days off) is set by the operator in /admin/holidays as overrides:
//   closed: no shipping that day      open: ship even though it is an automatic holiday

export const SHIP_CUTOFF_HOUR = 13;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export interface ShipOverrides {
    closed: ReadonlySet<string>;
    open: ReadonlySet<string>;
}
export const NO_OVERRIDES: ShipOverrides = { closed: new Set(), open: new Set() };

// ---- dates as "YYYY-MM-DD" keys on a UTC-midnight Date (calendar maths only) ----
const ymd = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const plus = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);
export const parseKey = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return utc(y, m, d);
};

// ---- lunar dates (설날 1/1, 부처님오신날 4/8, 추석 8/15) ----

// Fallback when the browser has no Korean lunar calendar: [설날, 부처님오신날, 추석] (solar MM-DD).
const LUNAR_FALLBACK: Record<number, [string, string, string]> = {
    2024: ['02-10', '05-15', '09-17'],
    2025: ['01-29', '05-05', '10-06'],
    2026: ['02-17', '05-24', '09-25'],
    2027: ['02-07', '05-13', '09-15'],
    2028: ['01-27', '05-02', '10-03'],
    2029: ['02-13', '05-20', '09-22'],
    2030: ['02-03', '05-09', '09-12'],
};

let dangi: Intl.DateTimeFormat | null | undefined;
function lunarFormatter(): Intl.DateTimeFormat | null {
    if (dangi !== undefined) return dangi;
    try {
        const f = new Intl.DateTimeFormat('en-u-ca-dangi', { timeZone: 'UTC', month: 'numeric', day: 'numeric' });
        dangi = f.resolvedOptions().calendar === 'dangi' ? f : null;
    } catch {
        dangi = null;
    }
    return dangi;
}

/** Solar date of lunar month/day (non-leap) in the given solar year, searched within [from, to]. */
function findLunar(year: number, lm: number, ld: number, from: [number, number], to: [number, number]): Date | null {
    const f = lunarFormatter();
    if (!f) return null;
    const end = utc(year, to[0], to[1]).getTime();
    for (let d = utc(year, from[0], from[1]); d.getTime() <= end; d = plus(d, 1)) {
        const parts = f.formatToParts(d);
        const m = parts.find((p) => p.type === 'month')?.value;
        const day = parts.find((p) => p.type === 'day')?.value;
        if (m === String(lm) && day === String(ld)) return d;
    }
    return null;
}

function lunarDays(year: number): { seollal: Date; buddha: Date; chuseok: Date } | null {
    const seollal = findLunar(year, 1, 1, [1, 15], [2, 25]);
    const buddha = findLunar(year, 4, 8, [4, 15], [6, 15]);
    const chuseok = findLunar(year, 8, 15, [8, 25], [10, 15]);
    if (seollal && buddha && chuseok) return { seollal, buddha, chuseok };
    const fb = LUNAR_FALLBACK[year];
    if (!fb) return null;
    const at = (md: string) => parseKey(`${year}-${md}`);
    return { seollal: at(fb[0]), buddha: at(fb[1]), chuseok: at(fb[2]) };
}

// ---- legal public holidays of a year ----

const cache = new Map<number, Map<string, string>>();

/** Korean public holidays of `year` (관공서 공휴일 + 대체공휴일): key "YYYY-MM-DD" → name. */
export function legalHolidays(year: number): Map<string, string> {
    const hit = cache.get(year);
    if (hit) return hit;

    // date key → names (one date can carry two holidays, e.g. 어린이날 = 부처님오신날 in 2025)
    const names = new Map<string, string[]>();
    const add = (d: Date, name: string) => {
        const k = ymd(d);
        names.set(k, [...(names.get(k) ?? []), name]);
    };
    // holidays that get a substitute day when they fall on a weekend (or on another holiday)
    const weekendSub: Date[] = [];

    add(utc(year, 1, 1), '신정');
    for (const [m, d, name] of [
        [3, 1, '삼일절'],
        [5, 5, '어린이날'],
        [8, 15, '광복절'],
        [10, 3, '개천절'],
        [10, 9, '한글날'],
        [12, 25, '성탄절'],
    ] as const) {
        add(utc(year, m, d), name);
        weekendSub.push(utc(year, m, d));
    }
    add(utc(year, 6, 6), '현충일');

    const blocks: Date[][] = [];
    const lunar = lunarDays(year);
    if (lunar) {
        const s = [plus(lunar.seollal, -1), lunar.seollal, plus(lunar.seollal, 1)];
        s.forEach((d) => add(d, '설날 연휴'));
        const c = [plus(lunar.chuseok, -1), lunar.chuseok, plus(lunar.chuseok, 1)];
        c.forEach((d) => add(d, '추석 연휴'));
        blocks.push(s, c);
        add(lunar.buddha, '부처님오신날');
        weekendSub.push(lunar.buddha);
    }

    // Which days need a substitute (one per overlapping day).
    const needs: { after: Date }[] = [];
    const seen = new Set<string>();
    for (const d of weekendSub) {
        const k = ymd(d);
        if (seen.has(k)) continue;
        const dow = d.getUTCDay();
        if (dow === 0 || dow === 6 || (names.get(k)?.length ?? 0) > 1) {
            seen.add(k);
            needs.push({ after: d });
        }
    }
    for (const block of blocks) {
        for (const d of block) {
            const k = ymd(d);
            if (seen.has(k)) continue;
            // 설·추석: only Sunday or another holiday counts (a Saturday doesn't)
            if (d.getUTCDay() === 0 || (names.get(k)?.length ?? 0) > 1) {
                seen.add(k);
                needs.push({ after: block[block.length - 1] });
            }
        }
    }

    const result = new Map<string, string>();
    names.forEach((n, k) => result.set(k, n.join(' · ')));
    needs.sort((a, b) => a.after.getTime() - b.after.getTime());
    for (const { after } of needs) {
        let d = plus(after, 1);
        while (d.getUTCDay() === 0 || d.getUTCDay() === 6 || result.has(ymd(d))) d = plus(d, 1);
        result.set(ymd(d), '대체공휴일');
    }

    cache.set(year, result);
    return result;
}

export function holidayName(key: string): string | undefined {
    return legalHolidays(Number(key.slice(0, 4))).get(key);
}

/** d is a UTC-midnight calendar date. */
export function isShippingDay(d: Date, o: ShipOverrides = NO_OVERRIDES): boolean {
    const k = ymd(d);
    if (o.closed.has(k)) return false;
    if (o.open.has(k)) return true;
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) return false;
    return !legalHolidays(d.getUTCFullYear()).has(k);
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

export function shipEstimate(now: Date = new Date(), o: ShipOverrides = NO_OVERRIDES): ShipEstimate {
    const k = new Date(now.getTime() + KST_OFFSET_MS); // UTC fields read as Korea time
    const today = utc(k.getUTCFullYear(), k.getUTCMonth() + 1, k.getUTCDate());
    if (isShippingDay(today, o) && k.getUTCHours() < SHIP_CUTOFF_HOUR) {
        const cutoff = today.getTime() + SHIP_CUTOFF_HOUR * 3600 * 1000 - KST_OFFSET_MS;
        return { sameDay: true, msLeft: Math.max(0, cutoff - now.getTime()), daysAhead: 0, label: '오늘' };
    }
    let d = today;
    let days = 0;
    do {
        d = plus(d, 1);
        days += 1;
    } while (!isShippingDay(d, o) && days < 60);
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

/** Today's date key in Korea time. */
export function todayKey(now: Date = new Date()): string {
    return ymd(new Date(now.getTime() + KST_OFFSET_MS));
}
