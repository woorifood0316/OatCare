import { jsonError, sessionUserId } from '../../../lib/api';
import { getReferralCode } from '../../../lib/referrals';

export const runtime = 'edge';

/** The signed-in member's invitation code (for their share links). */
export async function GET() {
    const userId = await sessionUserId();
    if (!userId) return jsonError('로그인이 필요해요', 401);
    try {
        return Response.json({ code: await getReferralCode(userId) });
    } catch {
        return jsonError('초대 링크를 만들지 못했어요', 503);
    }
}
