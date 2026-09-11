import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function key() {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw || !/^[a-fA-F0-9]{64}$/.test(raw))
    throw new Error("Configure a 32-byte hexadecimal APP_ENCRYPTION_KEY");
  return Buffer.from(raw, "hex");
}
export function sealSecret(value: string, context: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}
export function openSecret(value: string, context: string) {
  const [version, iv, tag, data, ...rest] = value.split(".");
  if (version !== "v1" || !iv || !tag || !data || rest.length)
    throw new Error("Invalid encrypted credential");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
