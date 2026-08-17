# OatCare design brief

## Design read
Busy Korean 20s-40s professionals/students who skip breakfast or grab
low-nutrition convenience food. OatCare (오트케어) is a warm, efficient morning
ritual: tear one 50g pouch, pour water or milk, stir 30 seconds, done. Feels
caring and competent, never clinical, never diet-culture austere.

## Concept spine
"The pour line" - the whole site plays as one continuous pour: good grains
flow into a single pouch, the pouch travels to your table, then pours into
your cup. Everything on the page (hero film, icon motifs, section dividers)
restates this fill/pour motion.

## Delivery tier
cinema (Lenis+GSAP, Tier-1 scroll-scrub hero, scroll chapters).

## Locked palette
- #7A2331 maroon - ink / primary accent
- #3B2A20 brown - secondary ink, dark surfaces
- #C9963C gold - accent, CTAs, highlights
- #F7F1E4 cream - page background
Defense: this is OatCare's OWN shipped brand, already printed on real
packaging and live on the brand's existing storefront. Per the precedence
rule (the user's own assets always win) and the explicit brand-color
override clause, this palette is carried over verbatim rather than replaced
with a generated alternative, even though cream+gold+maroon sits near the
generically-banned beige/brass family - here it is the user's real,
already-manufactured brand, not an AI default reach.

## Locked type
Display + body: Pretendard (Korean grotesk, same spirit as Satoshi/Geist,
CDN, font-display swap). Numerals/stats (kcal, g, won, %): IBM Plex Mono.
No serif - everyday-convenience food brand, not heritage/editorial.

## Animation mode: animated-website
Journey shape: single-shot - ONE continuous ~15s take, no cuts.

### Journey (chapters over the one film)
1. 아홉 가지 좋은 곡물 (0-25%) - camera opens on the real Grain pouch, whole
   grains (oats, brown rice, black soybean, barley, black rice, wheat,
   non-glutinous rice, glutinous brown rice, white soybean) orbit and settle
   around it; pouch stays sharp and unchanged, label readable.
2. 매일 아침, 우리 집 식탁으로 (25-55%) - the pouch travels to a warm, softly
   lit home breakfast table (morning window light, cream linens, no people -
   product-centric, not literal family).
3. 물만 부어, 저어서 (55-85%) - the pouch tears, contents pour into a ceramic
   cup, milk pours in, a spoon stirs; motion settles.
4. 완벽한 한 끼, 오트케어 (85-100%) - finished cup, gentle steam, closing
   beauty frame. START state (loose grains) must not equal END state
   (finished cup) - the payoff.

World grammar: warm 35mm-macro product-film look, shallow depth of field,
morning key light camera-left, cream/maroon/gold grade throughout, one
continuous push-in/rise/orbit, no hard cuts, no on-screen text.
Mobile framing: subject kept center-safe; vertical-safe crop.
Delivery budget: <=32 MiB desktop clips, <=16 MiB mobile clips.

## Section plan (8 sections, >=4 layout families, anchors vary)
1. Hero - the scroll-scrub journey itself (chapters overlaid on the film).
2. Pain point - asymmetric split, headline left / atmospheric plate right
   (바쁜 아침, 챙길 시간이 없다면).
3. Product line - bento-style grid, 5 flavor cards (real product photos).
4. How it works - horizontal step-rail, 3 steps (뜯고 - 붓고 - 저어요).
5. Nutrition/ingredients - editorial data band, per-flavor kcal/protein,
   generated icon set, macro ingredient bars.
6. Bundles and pricing - 3-card comparison (트라이얼 5 / 20개입 / 30개입).
7. Content teaser - poster-stacked cards -> 3 real blog posts.
8. Final CTA - full-bleed banner, bespoke CTA, restates the pour motif.

Eyebrow budget: ceil(8/3) = 3 max.

## Asset plan
- Hero: single-shot scroll-scrub film (user's own Higgsfield generation,
  anchored to the real Grain product) + its exact-frame posters.
- Section plates: 2 atmospheric textures (grain macro / warm paper-linen)
  for sections 2 and 5.
- Product imagery: 5 flavor pouches - REAL product photos uploaded by the
  user (not AI-generated), swapped in after the first draft used fabricated
  packaging by mistake.
- Custom icon set: one sheet, 8 glyphs (곡물/단백질/칼로리/포장/조리/배송/영양/시간),
  2px stroke, maroon-on-cream, sliced + background-removed.
- Logo/monogram: OatCare wordmark + monogram (no existing digital logo file)
  generated once, reused for favicon/head kit.
- OG card + head kit: 1200x630 + favicon set, generated from the monogram.

## CTA inventory (each its own component, own interaction identity)
- 지금 구매하기 - hero + final CTA, filled maroon pill, grain-pour hover
  micro-interaction.
- 맛 둘러보기 - product section, underlined inline link + arrow.
- 세트로 담기 - bundle cards, framed outline block.
- 레시피 더 보기 - content teaser, oversized headline + tiny CTA hint.

One label per intent, reused consistently in nav + sections + footer.
