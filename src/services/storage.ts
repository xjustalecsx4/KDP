import path from "node:path";
import {
  readdir,
  lstat,
  realpath,
  unlink,
  mkdir,
  writeFile,
  rm,
  readFile,
} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { ActionError } from "@/lib/policies";
import { getSettings } from "./settings";
import { logEvent } from "./events";

export const storageRoot = () =>
  path.resolve(
    /* turbopackIgnore: true */ process.env.STORAGE_PATH ?? "storage",
  );
export function resolveStorageKey(root: string, key: string) {
  if (
    !/^(books|generated|renders|temp)\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(
      key,
    ) ||
    key.split("/").some((p) => p === ".." || p === "." || !p)
  )
    throw new ActionError("Invalid storage key.");
  const target = path.resolve(root, key);
  if (!target.startsWith(path.resolve(root) + path.sep))
    throw new ActionError("Invalid storage path.");
  return target;
}
export interface StorageProvider {
  remove(key: string): Promise<void>;
  read(key: string): Promise<Buffer>;
  write(key: string, data: Buffer): Promise<void>;
}
export class LocalStorage implements StorageProvider {
  async read(key: string) {
    const root = storageRoot();
    const target = resolveStorageKey(root, key);
    let current = root;
    if ((await lstat(root)).isSymbolicLink())
      throw new ActionError("Storage root cannot be a link.");
    for (const part of key.split("/")) {
      current = path.join(/* turbopackIgnore: true */ current, part);
      if ((await lstat(current)).isSymbolicLink())
        throw new ActionError("Linked files cannot be read.");
    }
    const canonicalRoot = await realpath(/* turbopackIgnore: true */ root);
    const canonical = await realpath(/* turbopackIgnore: true */ target);
    if (!canonical.startsWith(canonicalRoot + path.sep))
      throw new ActionError("Invalid storage path.");
    return readFile(/* turbopackIgnore: true */ canonical);
  }
  async write(key: string, data: Buffer) {
    const root = storageRoot();
    const target = resolveStorageKey(root, key);
    const parent = path.dirname(target);
    if (
      (await lstat(root)).isSymbolicLink() ||
      (await lstat(parent)).isSymbolicLink()
    )
      throw new ActionError("Linked storage directories are not allowed.");
    const canonicalRoot = await realpath(/* turbopackIgnore: true */ root);
    const canonicalParent = await realpath(/* turbopackIgnore: true */ parent);
    if (!canonicalParent.startsWith(canonicalRoot + path.sep))
      throw new ActionError("Invalid storage directory.");
    await writeFile(target, data, { flag: "wx" });
  }
  async remove(key: string) {
    const root = storageRoot();
    const target = resolveStorageKey(root, key);
    const canonicalRoot = await realpath(/* turbopackIgnore: true */ root);
    // Reject symlinks/junctions at every component, including the root.
    if ((await lstat(root)).isSymbolicLink())
      throw new ActionError("Storage root cannot be a link.");
    let current = root;
    for (const part of key.split("/")) {
      current = path.join(/* turbopackIgnore: true */ current, part);
      try {
        if ((await lstat(current)).isSymbolicLink())
          throw new ActionError("Linked files cannot be cleaned.");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
        throw error;
      }
    }
    const canonical = await realpath(/* turbopackIgnore: true */ target);
    if (!canonical.startsWith(canonicalRoot + path.sep))
      throw new ActionError("Storage path escaped its root.");
    await unlink(target);
  }
}
export async function storageUsage(): Promise<
  Record<string, number> & { total: number }
> {
  const root = storageRoot();
  if ((await lstat(root)).isSymbolicLink())
    throw new Error("Linked storage root");
  const totals: Record<string, number> = {
    books: 0,
    generated: 0,
    renders: 0,
    temp: 0,
    other: 0,
  };
  async function walk(dir: string, bucket?: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      const info = await lstat(file);
      if (info.isSymbolicLink()) throw new Error("Linked storage entry");
      const group =
        bucket ?? (Object.hasOwn(totals, entry.name) ? entry.name : "other");
      if (info.isDirectory()) await walk(file, group);
      else if (info.isFile()) totals[group] += info.size;
    }
  }
  await walk(root);
  return { ...totals, total: Object.values(totals).reduce((a, b) => a + b, 0) };
}
export async function probeStorage() {
  const root = storageRoot();
  if ((await lstat(root)).isSymbolicLink()) throw new Error("Linked root");
  const probe = path.join(root, `.health-${randomUUID()}`);
  try {
    await writeFile(probe, "", { flag: "wx" });
  } finally {
    await rm(probe, { force: true });
  }
}
export async function initializeStorage() {
  for (const directory of ["books", "generated", "renders", "temp"])
    await mkdir(
      path.join(/* turbopackIgnore: true */ storageRoot(), directory),
      { recursive: true },
    );
}
export async function cleanupStorage(
  kind: "temp" | "failed" | "unreferenced",
  actorId: string,
) {
  const settings = await getSettings();
  const cutoff = new Date(
    Date.now() - settings.temporaryRetentionHours * 3600_000,
  );
  const candidates = await db.storedFile.findMany({
    where: {
      references: { none: {} },
      createdAt: { lt: cutoff },
      ...(kind === "temp"
        ? { category: "TEMP" }
        : kind === "failed"
          ? {
              state: { in: ["FAILED", "DELETING"] },
              category: { in: ["IMAGE", "VIDEO"] },
            }
          : { category: { in: ["IMAGE", "VIDEO"] } }),
    },
    select: { id: true },
    take: 250,
  });
  let removed = 0;
  let failed = 0;
  for (const candidate of candidates) {
    // The migration's reference trigger locks this same row and prohibits attaching DELETING files.
    const file = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "StoredFile" WHERE id = ${candidate.id} FOR UPDATE`;
      if (await tx.fileReference.count({ where: { fileId: candidate.id } }))
        return null;
      return tx.storedFile.update({
        where: { id: candidate.id },
        data: { state: "DELETING" },
        select: { id: true, key: true },
      });
    });
    if (!file) continue;
    try {
      await new LocalStorage().remove(file.key);
      await db.storedFile.delete({ where: { id: file.id } });
      removed++;
    } catch {
      failed++;
    } // Retain tombstone for safe retry after a filesystem failure.
  }
  await logEvent("STORAGE_CLEANED", {
    actorId,
    level: failed ? "WARNING" : "INFO",
  });
  return { removed, failed };
}
