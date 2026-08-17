import type { ReactNode } from "react";

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CtaFill({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="oc-cta-fill" href={href}>
      {children}
    </a>
  );
}

export function CtaLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="oc-cta-link" href={href}>
      {children}
      <ArrowIcon />
    </a>
  );
}

export function CtaOutline({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="oc-cta-outline" href={href}>
      {children}
    </a>
  );
}

export function Nav() {
  return (
    <header className="oc-nav">
      <a href="/" className="oc-nav__brand">
        <img src="/assets/favicon-192.png" alt="" />
        <span>OatCare 오트케어</span>
      </a>
      <nav className="oc-nav__links">
        <a className="oc-nav__link" href="#product-line">맛 둘러보기</a>
        <a className="oc-nav__link" href="#how-it-works">이용 방법</a>
        <a className="oc-nav__link" href="#bundles">세트 구성</a>
        <a className="oc-nav__link" href="#content">레시피</a>
      </nav>
      <CtaFill href="#bundles">지금 구매하기</CtaFill>
    </header>
  );
}

export function PainPoint() {
  return (
    <section className="oc-section oc-pain" id="pain-point">
      <div>
        <p className="oc-eyebrow">Every busy morning</p>
        <h2>바쁜 아침, 챙길 시간이 없다면</h2>
        <p>
          출근 준비, 등굣길 채비로 정신없는 아침. 대충 때우거나 아예 거르기 쉽지만,
          오트케어는 물만 부으면 30초 만에 균형 잡힌 한 끼가 됩니다.
        </p>
      </div>
      <div className="oc-pain__plate">
        <img src="/assets/plate-grain-texture.webp" alt="오트케어 곡물 클로즈업" loading="lazy" />
      </div>
    </section>
  );
}

const PRODUCTS = [
  { flavor: "그레인", tag: "다이어트 · 든든한 한끼", img: "/assets/product-grain.webp", price: 2900, listPrice: 3900, lead: true },
  { flavor: "고구마", tag: "아이간식 · 저칼로리", img: "/assets/product-goguma.webp", price: 2900, listPrice: 3900 },
  { flavor: "단백질", tag: "고단백 · 운동인", img: "/assets/product-protein.webp", price: 2900, listPrice: 3900 },
  { flavor: "서리태", tag: "고소한맛 · 시그니처", img: "/assets/product-seoritae.webp", price: 2900, listPrice: 3900 },
  { flavor: "초코", tag: "디저트대용 · 아이간식", img: "/assets/product-choco.webp", price: 2900, listPrice: 3900 },
];

export function ProductGrid() {
  return (
    <section className="oc-section" id="product-line">
      <p className="oc-eyebrow">5 flavors, one pouch</p>
      <h2 style={{ fontSize: "clamp(2rem,4vw,3.2rem)", letterSpacing: "-0.02em", margin: "0.6rem 0 2rem" }}>
        다섯 가지 맛, 질리지 않는 아침
      </h2>
      <div className="oc-product-grid">
        {PRODUCTS.map((p) => (
          <a key={p.flavor} href="#bundles" className={`oc-product-card${p.lead ? " oc-product-card--lead" : ""}`}>
            <img src={p.img} alt={`오트케어 ${p.flavor}`} loading="lazy" />
            <span className="oc-product-card__flavor">오트케어 {p.flavor}</span>
            <span className="oc-product-card__tag">{p.tag}</span>
            <span className="oc-product-card__price">
              <span className="oc-num">{p.price.toLocaleString("ko-KR")}원</span>
              <s className="oc-num">{p.listPrice.toLocaleString("ko-KR")}원</s>
            </span>
          </a>
        ))}
      </div>
      <p style={{ marginTop: "1.75rem" }}>
        <CtaLink href="#bundles">맛 둘러보기</CtaLink>
      </p>
    </section>
  );
}

const STEPS = [
  { title: "뜯어요", body: "50g 한 봉지를 뜯어 그릇이나 컵에 담아요." },
  { title: "부어요", body: "따뜻한 물 또는 우유 180ml를 붓습니다." },
  { title: "저어요", body: "30초간 잘 저으면 완성. 그대로 즐기세요." },
];

export function HowItWorks() {
  return (
    <section className="oc-section" id="how-it-works">
      <p className="oc-eyebrow">3 steps, 30 seconds</p>
      <h2 style={{ fontSize: "clamp(2rem,4vw,3.2rem)", letterSpacing: "-0.02em", margin: "0.6rem 0 2.5rem" }}>
        뜯고, 붓고, 저어요
      </h2>
      <div className="oc-steps">
        {STEPS.map((s) => (
          <div className="oc-step" key={s.title}>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const NUTRITION = [
  { flavor: "그레인", kcal: 203, stat: "귀리 16%" },
  { flavor: "고구마", kcal: 186, stat: "귀리 20%" },
  { flavor: "단백질", kcal: 213, stat: "단백질 17g" },
  { flavor: "서리태", kcal: 198, stat: "서리태 12%" },
  { flavor: "초코", kcal: 199, stat: "코코아분말 6.9%" },
];

export function Nutrition() {
  return (
    <section className="oc-section" id="nutrition">
      <div className="oc-nutrition">
        <div className="oc-nutrition__plate">
          <img src="/assets/plate-paper-linen.webp" alt="" aria-hidden="true" />
        </div>
        <div className="oc-nutrition__inner">
          <p className="oc-eyebrow" style={{ color: "var(--oc-gold)" }}>Ingredients, in plain numbers</p>
          <h2>숨기지 않는 영양 정보</h2>
          <div className="oc-nutrition__grid">
            {NUTRITION.map((n) => (
              <div className="oc-nutrition__stat" key={n.flavor}>
                <span className="oc-num">{n.kcal}kcal</span>
                <span className="flavor">오트케어 {n.flavor} · {n.stat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const BUNDLES = [
  { name: "5종 골고루 맛보기 세트", desc: "다섯 가지 맛을 1개씩, 부담 없이 취향을 찾아보는 세트", price: 13500, listPrice: 19500 },
  { name: "든든 20개입 박스", desc: "맛 자유 선택 · 한 달 아침 대용식으로 충분한 구성", price: 54000, listPrice: 78000, highlight: true },
  { name: "대용량 30개입 박스", desc: "가장 알뜰한 1개당 단가 · 정기적으로 챙겨 드시는 분께", price: 75000, listPrice: 108000 },
];

export function Bundles() {
  return (
    <section className="oc-section" id="bundles">
      <p className="oc-eyebrow">Pick your set</p>
      <h2 style={{ fontSize: "clamp(2rem,4vw,3.2rem)", letterSpacing: "-0.02em", margin: "0.6rem 0 2.5rem" }}>
        세트로 더 알차게
      </h2>
      <div className="oc-bundles">
        {BUNDLES.map((b) => (
          <div className={`oc-bundle-card${b.highlight ? " oc-bundle-card--highlight" : ""}`} key={b.name}>
            <h3>{b.name}</h3>
            <p className="desc">{b.desc}</p>
            <div className="price">
              <span className="oc-num">{b.price.toLocaleString("ko-KR")}원</span>
              <s className="oc-num">{b.listPrice.toLocaleString("ko-KR")}원</s>
            </div>
            <CtaOutline href="#">세트로 담기</CtaOutline>
          </div>
        ))}
      </div>
    </section>
  );
}

const POSTS = [
  { title: "오트밀 아침식사 완전 정복 가이드", excerpt: "오트밀을 왜, 어떻게 먹어야 할까? 기본부터 정리했어요." },
  { title: "다이어트 간식으로 오트밀이 좋은 이유", excerpt: "포만감과 맛을 동시에 챙기는 법." },
  { title: "오버나이트 오트밀 레시피", excerpt: "전날 밤 5분이면 다음날 아침이 편해집니다." },
];

export function ContentTeaser() {
  return (
    <section className="oc-section" id="content">
      <p className="oc-eyebrow">From the journal</p>
      <h2 style={{ fontSize: "clamp(2rem,4vw,3.2rem)", letterSpacing: "-0.02em", margin: "0.6rem 0 2.5rem" }}>
        오트케어의 아침 이야기
      </h2>
      <div className="oc-content-grid">
        {POSTS.map((p, i) => (
          <article className="oc-content-card" key={p.title}>
            <div className="oc-content-card__plate">
              <img
                src={i % 2 === 0 ? "/assets/plate-grain-texture.webp" : "/assets/plate-paper-linen.webp"}
                alt=""
                loading="lazy"
              />
            </div>
            <div className="oc-content-card__body">
              <h3>{p.title}</h3>
              <p>{p.excerpt}</p>
            </div>
          </article>
        ))}
      </div>
      <p style={{ marginTop: "1.75rem" }}>
        <CtaLink href="#product-line">레시피 더 보기</CtaLink>
      </p>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="oc-section" id="final-cta">
      <div className="oc-final-cta">
        <p className="oc-eyebrow" style={{ color: "var(--oc-gold)" }}>Start tomorrow morning</p>
        <h2>당신의 아침을,<br />오트케어와 함께</h2>
        <CtaFill href="#bundles">지금 구매하기</CtaFill>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="oc-footer">
      <span>© 2026 OatCare. 오트케어는 OEM 생산 제품을 소분 판매하는 자체 브랜드입니다.</span>
      <span>문의: jgdglobal001@gmail.com</span>
    </footer>
  );
}
