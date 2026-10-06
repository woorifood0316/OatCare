export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

export const dt = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleString('ko-KR', {
              timeZone: 'Asia/Seoul',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
          })
        : '-';

export const day = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }) : '-';

export const PROVIDER_KO: Record<string, string> = { kakao: '카카오', naver: '네이버', google: '구글' };
