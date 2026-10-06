import { getSql } from './db';
import type { Address } from './validate';

export async function listAddresses(userId: string): Promise<Address[]> {
    const rows = await getSql()`
        select id, label, recipient, phone, zipcode, address1, address2, is_default, created_at
        from addresses where user_id = ${userId}
        order by is_default desc, created_at asc
    `;
    return rows.map((r) => ({
        id: r.id as string,
        label: (r.label as string | null) ?? null,
        recipient: r.recipient as string,
        phone: r.phone as string,
        zipcode: (r.zipcode as string | null) ?? null,
        address1: r.address1 as string,
        address2: (r.address2 as string | null) ?? null,
        isDefault: Boolean(r.is_default),
        createdAt: new Date(r.created_at as string).toISOString(),
    }));
}

export async function getAddress(userId: string, id: string): Promise<Address | null> {
    return (await listAddresses(userId)).find((a) => a.id === id) ?? null;
}
