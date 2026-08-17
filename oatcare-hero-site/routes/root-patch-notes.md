# __root.tsx 수정 내역

`app/src/routes/__root.tsx`는 힉스필드 템플릿이 기본 제공하는 대형 공용
파일이라 전체를 옮기지 않고, 저희 사이트에 맞게 바꾼 부분만 정리합니다.

1. `<html lang="en" data-theme="default-dark" style={{ colorScheme: "dark" }}>`
   → `<html lang="ko" data-theme="oatcare-light">`
   (기본 템플릿은 강제 다크모드 + 영어였는데, 한국어 + 밝은 크림 배경 브랜드로 변경)

2. `const DEFAULT_TITLE = "Higgsfield App";`
   → `const DEFAULT_TITLE = "OatCare 오트케어";`

3. `const DEFAULT_DESCRIPTION = "Higgsfield Generated Project";`
   → `const DEFAULT_DESCRIPTION = "바쁜 아침을 위한 5가지 맛 오트밀, 한 봉지 50g 오트케어.";`

4. `<body className="bg-q-background-primary text-q-text-primary">`
   → `<body>`
   (힉스필드 전용 색상 클래스 대신, styles.css에 추가한 오트케어 브랜드
   CSS 규칙이 body 배경/글자색을 처리하도록 변경)
