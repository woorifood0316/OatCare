import { getCurrentUser } from '../../../lib/current-user';
import { listAddresses } from '../../../lib/addresses';
import { listPaymentMethods } from '../../../lib/payment-methods';
import { PageHead } from '../../../components/mypage/ComingSoon';
import { AddressManager } from '../../../components/mypage/AddressManager';
import { PaymentMethodManager } from '../../../components/mypage/PaymentMethodManager';

export const runtime = 'edge';

export default async function PaymentPage() {
    const user = await getCurrentUser();
    const [addresses, methods] = await Promise.all([listAddresses(user.id), listPaymentMethods(user.id)]);

    return (
        <>
            <PageHead title="결제수단·배송지" desc="정기결제에 사용할 카드와 배송지를 관리해요." />
            <PaymentMethodManager initial={methods} />
            <AddressManager initial={addresses} />
        </>
    );
}
