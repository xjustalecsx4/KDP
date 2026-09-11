export const templateCatalog = [
  {
    id: "pinterest-preview",
    name: "Pinterest Book Preview",
    platform: "PINTEREST",
    format: "IMAGE",
    description: "Cover and page previews, a headline, and a subtle CTA.",
  },
  {
    id: "pinterest-focus",
    name: "Pinterest Page Focus",
    platform: "PINTEREST",
    format: "IMAGE",
    description: "A page takes center stage with a clear headline.",
  },
  {
    id: "tiktok-carousel",
    name: "TikTok Photo Carousel",
    platform: "TIKTOK",
    format: "CAROUSEL",
    description:
      "Four to seven vertical slides with a hook and ending question.",
  },
  {
    id: "cozy-reveal",
    name: "Cozy Page Reveal Video",
    platform: "TIKTOK",
    format: "VIDEO",
    description:
      "A 16-second vertical video with gentle motion and a cover reveal.",
  },
  {
    id: "fact-explainer",
    name: "Fact Explainer",
    platform: "TIKTOK",
    format: "VIDEO",
    description:
      "A question-led video. Supply reviewed facts in your book description.",
  },
] as const;
export const defaultStyle = {
  background: "#f4f0e7",
  foreground: "#243832",
  accent: "#316c57",
};
