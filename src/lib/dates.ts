// Calendar helpers. Billing dates are Korean (KST) calendar days.

/** YYYY-MM-DD for "today" in Korea, optionally shifted by whole days. */
export function todayKst(offsetDays = 0): string {
    const d = new Date(Date.now() + 9 * 3600 * 1000 + offsetDays * 86400 * 1000);
    return d.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}
