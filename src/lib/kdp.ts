import { z } from "zod";
export const kdpSchema = z
  .object({
    kdpDescription: z.string().trim().max(10000),
    kdpDownloadUrl: z.union([
      z.literal(""),
      z
        .url()
        .max(2048)
        .refine((value) => {
          const url = new URL(value);
          return url.protocol === "https:" && !url.username && !url.password;
        }, "Use an HTTPS download URL without embedded credentials"),
    ]),
    kdpPublic: z.boolean(),
  })
  .refine(
    (data) =>
      !data.kdpPublic || (!!data.kdpDescription && !!data.kdpDownloadUrl),
    {
      message: "Add a description and download link before publishing",
      path: ["kdpPublic"],
    },
  );
