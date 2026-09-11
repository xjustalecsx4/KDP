"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
export async function setStoreLanguage(form: FormData) {
  const locale = form.get("locale");
  if (locale !== "en" && locale !== "ro") return;
  (await cookies()).set("bookstore-language", locale, {
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.APP_URL?.startsWith("https://"),
    path: "/",
    maxAge: 31536000,
  });
  revalidatePath("/", "layout");
}
