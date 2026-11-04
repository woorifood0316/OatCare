import { listShipOverrides } from '../../../lib/ship-calendar';

export const runtime = 'edge';

/** Public: the operator's shipping-day overrides, used by the "언제 출발해요" notice. */
export async function GET() {
    try {
        const rows = await listShipOverrides();
        return Response.json(
            {
                closed: rows.filter((r) => r.kind === 'closed').map((r) => r.day),
                open: rows.filter((r) => r.kind === 'open').map((r) => r.day),
            },
            { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } },
        );
    } catch {
        // The notice falls back to the automatic holidays only.
        return Response.json({ closed: [], open: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }
}
