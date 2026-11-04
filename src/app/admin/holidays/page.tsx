import { listShipOverrides } from '../../../lib/ship-calendar';
import { addDays, todayKst } from '../../../lib/dates';
import { HolidayCalendar } from '../../../components/admin/HolidayCalendar';

export const runtime = 'edge';

export default async function AdminHolidays() {
    const rows = await listShipOverrides(addDays(todayKst(), -62), addDays(todayKst(), 730));
    return (
        <>
            <h1 className="adm-h1">휴무일 지정</h1>
            <p className="adm-muted" style={{ marginTop: '-0.5rem', marginBottom: '0.9rem' }}>
                평일 오후 1시까지 결제된 주문은 당일 발송돼요. 주말과 법정공휴일(설·추석·대체공휴일 포함)은 자동으로 쉬고,
                선거일·임시공휴일·택배 없는 날처럼 따로 쉬는 날만 여기서 지정하면 사이트의 출발일 안내에 바로 반영돼요.
            </p>
            <HolidayCalendar initial={rows} />
        </>
    );
}
