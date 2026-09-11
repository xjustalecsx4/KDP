import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access } from "node:fs/promises";
import { db } from "@/lib/db";
import { workerIsActive } from "@/lib/policies";
import { probeStorage } from "./storage";
const exec = promisify(execFile);
export async function getHealth() {
  const results = await Promise.allSettled([
    db.$queryRaw`SELECT 1`,
    db.workerHeartbeat.findFirst({ orderBy: { lastSeenAt: "desc" } }),
    (async () =>
      exec(process.env.FFMPEG_PATH ?? "ffmpeg", ["-version"], {
        timeout: 5000,
        windowsHide: true,
        maxBuffer: 64 * 1024,
      }))(),
    (async () => {
      const executable = process.env.REMOTION_BROWSER_EXECUTABLE;
      if (!executable) throw new Error("Renderer browser not configured");
      await access(executable);
      const { openBrowser } = await import("@remotion/renderer");
      const browser = await openBrowser("chrome", {
        logLevel: "error",
        browserExecutable: executable,
      });
      await browser.close({ silent: true });
    })(),
    probeStorage(),
  ]);
  const heartbeat = results[1].status === "fulfilled" ? results[1].value : null;
  return {
    web: "Healthy",
    database: results[0].status === "fulfilled" ? "Healthy" : "Error",
    worker: workerIsActive(heartbeat?.lastSeenAt) ? "Healthy" : "Offline",
    ffmpeg: results[2].status === "fulfilled" ? "Available" : "Missing",
    remotion: results[3].status === "fulfilled" ? "Available" : "Error",
    storage: results[4].status === "fulfilled" ? "Available" : "Error",
    version: process.env.APP_VERSION ?? "0.1.0",
    commit: process.env.GIT_COMMIT?.slice(0, 12) ?? null,
    checkedAt: new Date().toISOString(),
  };
}
