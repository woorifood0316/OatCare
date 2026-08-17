import { createFileRoute } from "@tanstack/react-router";

import { ScrollScrub } from "@/components/scroll-scrub/scroll-scrub";
import { scrollScrubScenes, scrollScrubTheme } from "@/scroll-scrub-scenes";
import "@/components/site/site.css";
import {
  Bundles,
  ContentTeaser,
  Footer,
  FinalCta,
  HowItWorks,
  Nav,
  Nutrition,
  PainPoint,
  ProductGrid,
} from "@/components/site/sections";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main style={{ background: "var(--oc-cream)" }}>
      <Nav />
      <ScrollScrub scenes={scrollScrubScenes} theme={scrollScrubTheme} />
      <PainPoint />
      <ProductGrid />
      <HowItWorks />
      <Nutrition />
      <Bundles />
      <ContentTeaser />
      <FinalCta />
      <Footer />
    </main>
  );
}
