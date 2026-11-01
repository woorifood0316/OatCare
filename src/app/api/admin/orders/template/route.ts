import { jsonError, requireAdmin } from '../../../../../lib/api';
import { buildTemplateWorkbook } from '../../../../../lib/shipping-excel';

export const runtime = 'edge';

/** Blank 송장번호 일괄 업로드 form (header only, sheet "발송처리"). */
export async function GET() {
    if (!(await requireAdmin())) return jsonError('Forbidden', 403);
    const filename = '송장번호_일괄업로드_양식.xlsx';
    return new Response(buildTemplateWorkbook(), {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="tracking_upload_template.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
            'Cache-Control': 'no-store',
        },
    });
}
