import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import type { RenderInput } from "../../lib/content";
export type VideoProps = { input: RenderInput; images: string[] };
export function BookVideo({ input, images }: VideoProps) {
  const frame = useCurrentFrame();
  const progress = frame / 480;
  const pageIndex =
    frame < 60 ? 1 : frame < 150 ? 1 : frame < 240 ? 2 : frame < 330 ? 3 : 0;
  const source = images[Math.min(pageIndex, images.length - 1)];
  const local =
    frame < 60
      ? frame
      : frame < 150
        ? frame - 60
        : frame < 240
          ? frame - 150
          : frame < 330
            ? frame - 240
            : frame - 330;
  const opacity = interpolate(local, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });
  const scale = 1 + (local / 160) * 0.06;
  const headline =
    frame < 60
      ? input.concept.hook
      : frame >= 420
        ? input.concept.endingQuestion
        : frame >= 330
          ? input.bookTitle
          : input.concept.slideTexts[
              Math.min(pageIndex - 1, input.concept.slideTexts.length - 1)
            ];
  return (
    <AbsoluteFill
      style={{
        backgroundColor: input.configuration.background,
        color: input.configuration.foreground,
        fontFamily: "Arial, sans-serif",
        padding: "180px 100px 260px",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontSize: headline.length > 140 ? 36 : headline.length > 95 ? 44 : headline.length > 65 ? 52 : 62,
          lineHeight: 1.15,
          fontWeight: 700,
          textAlign: "center",
          height: 250,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
        }}
      >
        {headline}
      </div>
      <div
        style={{
          width: 880,
          height: 1080,
          overflow: "hidden",
          borderRadius: 24,
          marginTop: 45,
          background: "white",
          boxShadow: "0 12px 40px #00000018",
          opacity,
        }}
      >
        <Img
          src={source}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: `scale(${scale}) translateX(${Math.sin(progress * Math.PI * 2) * 5}px)`,
          }}
        />
      </div>
      <div
        style={{
          fontSize: 32,
          lineHeight: 1.2,
          textAlign: "center",
          marginTop: 35,
          color: input.configuration.accent,
        }}
      >
        {frame >= 420 ? input.concept.cta : input.bookTitle}
      </div>
      <div
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          bottom: 230,
          height: 4,
          background: "#00000010",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: input.configuration.accent,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}
