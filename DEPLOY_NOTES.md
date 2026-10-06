# 배포 전 확인 사항 (장바구니·결제·정기구독·관리자)

> 이 파일은 커밋하지 않은 작업 메모입니다. 배포할 때 위에서부터 순서대로 확인하세요.

## 1. 데이터베이스 (Neon)
- 개발과 운영이 **같은 Neon DB**를 씁니다. 아래 변경은 **이미 적용돼 있고**, 기존 데이터는 건드리지 않는 추가 전용 변경입니다.
  - `users`: `marketing_updated_at`, `role`, `toss_customer_key` 컬럼 추가
  - 새 테이블: `carts`, `addresses`, `payment_methods`, `subscriptions`, `orders`, `billing_attempts`, `notifications`
- 다른 DB(예: 운영 전용)를 새로 만들면 `db/schema.sql` → `db/commerce.sql` 순서로 실행하세요.
- **권장:** 정식 오픈 전에 운영 전용 Neon 브랜치/DB를 분리하세요. 지금은 개발 테스트가 운영 DB를 쓰고 있습니다.

## 2. Cloudflare Pages 환경변수 (Production)
**Secret(암호화)**

| 이름 | 설명 |
|---|---|
| `BILLING_ENC_KEY` | 카드 결제키 암호화 키 (base64 32바이트). `openssl rand -base64 32`로 새로 생성. **한 번 정하면 바꾸면 저장된 카드를 복호화할 수 없음** |
| `CRON_SECRET` | 스케줄러가 청구 API를 호출할 때 쓰는 비밀값 (`openssl rand -hex 24`) |
| `TOSS_API_SECRET_KEY` | 토스 개별 연동 시크릿 키 (정기결제용) |
| `TOSS_WIDGET_SECRET_KEY` | 토스 결제위젯 시크릿 키 (1회성 결제용) |

**Text (빌드 시점에 코드에 들어감 → 값 변경 후 반드시 재배포)**

| 이름 | 설명 |
|---|---|
| `NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY` | 결제위젯 클라이언트 키 |
| `NEXT_PUBLIC_TOSS_API_CLIENT_KEY` | 개별 연동 클라이언트 키 (카드 등록 창) |

**선택 (없으면 해당 알림은 '건너뜀'으로 기록됨)**

| 이름 | 설명 |
|---|---|
| `SITE_URL` | 알림 속 링크 기준 주소 (기본값 https://chamoatcare.com) |
| `ADMIN_WEBHOOK_URL` | 운영자 알림용 웹훅 (슬랙·디스코드 호환) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | 운영자 텔레그램 알림 |
| `RESEND_API_KEY`, `EMAIL_FROM` | 고객 이메일 발송 (resend.com) |

기존 로그인 키(`AUTH_*`, `DATABASE_URL`)는 그대로 둡니다. `TOSS_SECURITY_KEY`는 현재 코드에서 쓰지 않습니다.

그리고 **Settings → Compatibility flags**에 `nodejs_compat`이 Production에 있는지 확인하세요.

## 3. 정기 청구 스케줄러 (Cloudflare Worker)
Pages는 cron을 직접 못 돌려서 작은 Worker가 대신 호출합니다. 폴더: `workers/billing-cron`
```
cd workers/billing-cron
npx wrangler login
npx wrangler deploy
npx wrangler secret put CRON_SECRET     # 사이트의 CRON_SECRET과 같은 값
```
- 매일 09:00(KST): 결제일이 된 구독 청구 + 결제 2일 전 안내
- 10분마다: 대기 중인 알림 발송
- 배포 전에는 `/admin` 의 **오늘 결제 실행 / 알림 발송** 버튼으로 수동 실행할 수 있습니다. (실제 카드 결제가 진행되니 주의)

## 4. 토스 관련
- 지금 키는 **테스트 키**입니다. 위젯 키는 토스 공개 샘플 키(`docs`)라, 상점 키가 나오면 위 4개 값을 교체하세요.
- **정기결제 테스트 한계:** 토스 테스트 서버에서 빌링키로 결제하면 `NOT_SUPPORTED_CARD_TYPE`(지원되지 않는 카드 종류)가 반환됩니다. 샘플 상점의 제한으로 보이며, 계약된 상점 테스트 키로 다시 확인해야 합니다. (카드 등록 → 빌링키 발급, 결제 취소, 위젯 승인 오류 처리는 실서버로 확인함)
- 아직 **웹훅은 없습니다.** 결제 확정은 성공 페이지 리다이렉트 + 정기 청구 작업으로 처리합니다. 사용자가 결제 직후 창을 닫는 경우를 대비해 토스 웹훅(`PAYMENT_STATUS_CHANGED`) 수신 라우트를 추가하는 것을 권장합니다.
- 계약 완료 후 live 키로 바꾼 뒤, 소액으로 실결제 → 취소 한 번씩 점검하세요.

## 5. 임시로 정한 정책값 (사업 정책에 맞게 확인)
| 항목 | 현재 값 | 위치 |
|---|---|---|
| 정기구독 할인 | 5% | `src/lib/catalog.ts` `SUBSCRIPTION_DISCOUNT_RATE` |
| 배송 주기 선택 | 10~60일, 5일 단위 (기본: 20개입 20일, 30개입 30일) | `CYCLE_MIN/MAX/STEP` |
| 배송비 | 세트 포함 시 무료, 단품만이면 3,000원 (30,000원 이상 무료) | `SHIPPING_FEE`, `FREE_SHIPPING_MIN` |
| 결제 실패 재시도 | 3일 간격, 3회 실패 시 구독 정지 | `src/lib/subscription-types.ts` |
| 20·30개입 맛 구성 | 맛은 5개 단위, 합계가 정확히 20/30개 | `MIX_UNIT` |
| 직접 취소 가능 시점 | 결제 완료(발송 전)까지 | `src/lib/order-status.ts` |

화면에 보이는 가격 문구(`Sections.tsx`)와 `catalog.ts`의 가격은 아직 따로 관리됩니다. 가격을 바꿀 때는 두 곳을 같이 고치세요.

## 6. 개인정보처리방침·이용약관
`LegalPage.tsx`에 정기구독, 결제(토스페이먼츠), 국외 이전(Neon·Cloudflare), 탈퇴 시 처리, 이메일 발송 업체를 추가했습니다. **실제로 쓰는 업체와 일치하는지**(이메일 발송 업체 등) 확인하고 법률 검토를 받으세요.

## 7. 관리자
- 관리자는 DB의 `users.role = 'admin'` 으로 판단합니다. 현재 운영자님 구글 가입 계정에 설정돼 있습니다.
- 관리자 추가: `update users set role = 'admin' where id = '<회원 id>';`
- 접속: `/admin` (일반 회원에게는 404로 보임)

## 8. 로컬 테스트 도구 (`.devtools/`, git 제외)
- `node .devtools/mock-toss.mjs` : 토스 흉내 서버(포트 4010)
- `TOSS_API_BASE=http://localhost:4010 npm run dev` 로 개발 서버를 띄우고 `test-billing.mjs`, `test-once.mjs`, `test-admin.mjs`, `test-withdraw.mjs` 실행
- `test-real-toss.mjs` 는 토스 테스트 서버로 직접 (모의 서버 없이 개발 서버 실행)
- `ui-check.mjs <출력폴더>` : 브라우저로 화면을 직접 조작하고 스크린샷 저장
- 테스트용 계정은 `provider_account_id`가 `test-`로 시작합니다. 테스트 후 지워 두었습니다.

## 9. 아직 없는 것
- 토스 웹훅 수신, 카카오 알림톡 발송기, 상품·가격 관리 화면, 후기, 쿠폰/적립금, 부분 환불
