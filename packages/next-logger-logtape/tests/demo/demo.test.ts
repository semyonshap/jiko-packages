import { describe, it, expect } from "vitest";
import { patchConsole, patchNextLogging } from "@/next-logger";
import { setupLogTape } from "../utils/logger";
import { loadNextLog, clearNextLogCache } from "../utils/nextjs";

/**
 * Demo test: intercepts calls to `console.*` and the internal Next.js logger,
 * then explicitly prints the result to the console.
 *
 * Useful for visually inspecting how arguments (especially objects) are
 * converted into structured `properties` (`arg0`, `arg1`, ...) and how the
 * resulting JSON output looks.
 *
 * Run with: `pnpm test:demo` (this test is also part of the general `pnpm test` run).
 */
describe("demo: logs in the console", () => {
  it("intercepts console & Next.js logs and prints the JSON output", async () => {
    const { capturedOutput, restore } = await setupLogTape();

    // --- console.* ---
    const restoreConsole = patchConsole({ category: ["app"] });
    console.log("Plain message");
    console.log("User logged in", { userId: 42, role: "admin" });
    console.log("Order", { id: "ord-1", total: 12.5 }, { items: 3 });
    console.info("Server ready", { port: 3000 });
    console.debug("Debug message", { flag: true });
    console.warn("Cache miss", { key: "users:1" });
    console.error("Failed request", { status: 500, path: "/api" });
    console.trace("Trace message");
    restoreConsole();

    // --- Next.js internal logger ---
    const restoreNext = patchNextLogging({ category: ["app"] });
    const nextLog = loadNextLog();
    nextLog.ready("Server started");
    nextLog.warn("Deprecated route", { route: "/old" });
    nextLog.error("Build failed", { error: "ENOENT" });
    restoreNext();
    clearNextLogCache();

    restore();

    console.log("\n===================== JSON lines =====================");
    for (const line of capturedOutput) {
      console.log(line.trim());
    }
    console.log("======================================================\n");

    console.log("=============== Pretty (properties) =================");
    for (const line of capturedOutput) {
      console.log(JSON.stringify(JSON.parse(line), null, 2));
    }
    console.log("=====================================================\n");

    expect(capturedOutput.length).toBeGreaterThan(0);
  });
});
