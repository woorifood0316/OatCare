// 내 정보 changes. Server only.
import { getSql } from './db';
import { sendEmail } from './cron';
import { layout } from './email-template';
import { PROFILE_FRESH_MS, checkEmail, checkName, checkPhone } from './profile-rules';

/** True when the login is recent enough to change the name or phone. */
export function freshLogin(authAt: number | undefined): boolean {
    return Boolean(authAt && Date.now() - authAt < PROFILE_FRESH_MS);
}

export async function saveName(uid: string, raw: string): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
    const c = checkName(raw);
    if (!c.ok) return c;
    await getSql()`update users set name = ${c.name}, name_edited_at = now() where id = ${uid}`;
    return c;
}

export async function savePhone(uid: string, raw: string): Promise<{ ok: true; phone: string } | { ok: false; error: string }> {
    const c = checkPhone(raw);
    if (!c.ok) return c;
    await getSql()`update users set phone = ${c.phone} where id = ${uid}`;
    return c;
}

const CODE_MINUTES = 10;
const MAX_TRIES = 5;
const RESEND_SECONDS = 60;

async function hashCode(uid: string, code: string): Promise<string> {
    const data = new TextEncoder().encode(`${uid}:${code}:${process.env.AUTH_SECRET ?? ''}`);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Send a 6-digit code to the new address. */
export async function startEmailChange(uid: string, raw: string): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
    const c = checkEmail(raw);
    if (!c.ok) return c;
    const sql = getSql();
    const me = await sql`select email from users where id = ${uid}`;
    if ((me[0]?.email as string | null)?.toLowerCase() === c.email) return { ok: false, error: '지금 등록된 이메일과 같아요.' };
    const taken = await sql`
        select 1 from users where lower(email) = ${c.email} and id <> ${uid}
        union all select 1 from accounts where lower(email) = ${c.email} and user_id <> ${uid}
        limit 1
    `;
    if (taken.length > 0) return { ok: false, error: '다른 회원이 쓰고 있는 이메일이에요. 다른 주소를 적어 주세요.' };
    const recent = await sql`select 1 from email_verifications where user_id = ${uid} and created_at > now() - make_interval(secs => ${RESEND_SECONDS})`;
    if (recent.length > 0) return { ok: false, error: '인증번호를 방금 보냈어요. 1분 뒤에 다시 받을 수 있어요.' };

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
    await sql`
        insert into email_verifications (user_id, email, code_hash, attempts, expires_at, created_at)
        values (${uid}, ${c.email}, ${await hashCode(uid, code)}, 0, now() + make_interval(mins => ${CODE_MINUTES}), now())
        on conflict (user_id) do update set email = excluded.email, code_hash = excluded.code_hash, attempts = 0,
            expires_at = excluded.expires_at, created_at = excluded.created_at
    `;
    const html = layout({
        title: '이메일 인증번호',
        lead: ['참오트케어 내 정보에서 이 주소를 알림 받을 이메일로 등록하려고 해요. 아래 인증번호를 화면에 입력해 주세요.'],
        meta: [['인증번호', code], ['유효 시간', `${CODE_MINUTES}분`]],
        note: '직접 요청하지 않았다면 이 메일은 무시해 주세요. 이메일은 바뀌지 않아요.',
    });
    const text = `참오트케어 이메일 인증번호: ${code}\n${CODE_MINUTES}분 안에 내 정보 화면에 입력해 주세요. 직접 요청하지 않았다면 무시해 주세요.`;
    const sent = await sendEmail(c.email, `[참오트케어] 이메일 인증번호 ${code}`, text, html);
    if (sent !== 'sent') {
        await sql`delete from email_verifications where user_id = ${uid}`;
        console.error('[profile] verification mail', sent);
        return { ok: false, error: '인증 메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.' };
    }
    return { ok: true, email: c.email };
}

/** Check the code; on success the new address becomes the member's email. */
export async function confirmEmailChange(uid: string, raw: string): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
    const code = raw.replace(/\D/g, '');
    const sql = getSql();
    const rows = await sql`select email, code_hash, attempts, expires_at < now() as expired from email_verifications where user_id = ${uid}`;
    const v = rows[0];
    if (!v) return { ok: false, error: '인증번호를 먼저 받아 주세요.' };
    if (v.expired) return { ok: false, error: '인증번호 유효 시간이 지났어요. 다시 받아 주세요.' };
    if ((v.attempts as number) >= MAX_TRIES) return { ok: false, error: '여러 번 틀려서 이 인증번호는 더 쓸 수 없어요. 다시 받아 주세요.' };
    if (code.length !== 6 || (await hashCode(uid, code)) !== v.code_hash) {
        await sql`update email_verifications set attempts = attempts + 1 where user_id = ${uid}`;
        const left = MAX_TRIES - (v.attempts as number) - 1;
        return { ok: false, error: left > 0 ? `인증번호가 맞지 않아요. (${left}번 더 시도할 수 있어요)` : '여러 번 틀려서 이 인증번호는 더 쓸 수 없어요. 다시 받아 주세요.' };
    }
    const email = v.email as string;
    await sql.transaction([sql`update users set email = ${email} where id = ${uid}`, sql`delete from email_verifications where user_id = ${uid}`]);
    return { ok: true, email };
}

