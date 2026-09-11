import { db } from "@/lib/db";
import { defaults, settingsSchema } from "@/lib/policies";
export async function getSettings() {
  const row = await db.appSetting.findUnique({ where: { key: "operational" } });
  return row ? settingsSchema.parse(row.value) : defaults;
}
