import { getSql } from './db';
import { addDays, todayKst } from './dates';

export interface ShipCalendarRow {
    day: string; // YYYY-MM-DD
    kind: 'closed' | 'open';
    memo: string;
}

/** Operator overrides of the shipping calendar between two dates (inclusive). */
export async function listShipOverrides(from = addDays(todayKst(), -31), to = addDays(todayKst(), 400)): Promise<ShipCalendarRow[]> {
    const rows = await getSql()`
        select to_char(day, 'YYYY-MM-DD') as day, kind, memo
        from ship_calendar where day between ${from} and ${to} order by day`;
    return rows as ShipCalendarRow[];
}
