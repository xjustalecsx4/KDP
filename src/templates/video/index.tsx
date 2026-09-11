import React from "react";
import { Composition, registerRoot } from "remotion";
import { BookVideo } from "./Composition";
function Root() {
  return (
    <Composition
      id="BookReveal"
      component={BookVideo}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={480}
      defaultProps={{
        input: {
          bookTitle: "Book preview",
          concept: {
            hook: "Book preview",
            caption: "",
            cta: "",
            hashtags: [],
            slideTexts: [""],
            endingQuestion: "",
          },
          fileIds: [],
          template: "cozy-reveal",
          platform: "TIKTOK",
          format: "VIDEO",
          configuration: {
            background: "#f4f0e7",
            foreground: "#243832",
            accent: "#316c57",
          },
        },
        images: [],
      }}
    />
  );
}
registerRoot(Root);
