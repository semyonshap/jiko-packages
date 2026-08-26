import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { patchNextLogging } from "@/next-logger";

import { setupLogTape } from "../utils/logger";
import { loadNextLog, clearNextLogCache } from "../utils/nextjs";

describe("Integration with real Next.js logger", () => {
  let capturedOutput: string[];
  let restoreLogTape: () => void;

  beforeEach(async () => {
    const result = await setupLogTape();
    capturedOutput = result.capturedOutput;
    restoreLogTape = result.restore;
  });

  afterEach(() => {
    restoreLogTape();
    clearNextLogCache();
  });

  it("should redirect Next.js internal logger to LogTape with JSON format", () => {
    const restorePatch = patchNextLogging({ category: ["app"] });

    const nextLog = loadNextLog();

    nextLog.info("Hello from Next.js logger");
    restorePatch();

    const jsonLine = capturedOutput.find((line) =>
      line.includes("Hello from Next.js logger"),
    );
    expect(jsonLine).toBeDefined();

    const logEntry = JSON.parse(jsonLine!);
    expect(logEntry.message).toBe("Hello from Next.js logger");
    expect(logEntry.level).toBe("INFO");
    expect(logEntry.prefix).toBe("info");
    expect(logEntry.logger).toBe("app.next");
    expect(logEntry["@timestamp"]).toBeDefined();
  });

  it("should correctly map different log levels", () => {
    const restorePatch = patchNextLogging({ category: ["app"] });
    const nextLog = loadNextLog();

    nextLog.error("Error message");
    nextLog.warn("Warning");
    nextLog.ready("Server ready");
    restorePatch();

    const lines = capturedOutput.map((line) => JSON.parse(line));
    expect(lines.find((l) => l.message === "Error message").level).toBe(
      "ERROR",
    );
    expect(lines.find((l) => l.message === "Warning").level).toBe("WARN");
    expect(lines.find((l) => l.message === "Server ready").level).toBe("INFO");
    expect(lines.find((l) => l.message === "Server ready").prefix).toBe(
      "ready",
    );
  });

  it("should restore original logger methods after calling restore", () => {
    const originalLog = loadNextLog();
    const originalInfo = originalLog.info;

    const restorePatch = patchNextLogging();

    // После патча модуль из кэша отдаёт пропатченные методы
    const patchedLog = loadNextLog();
    expect(patchedLog.info).not.toBe(originalInfo);

    restorePatch();

    const restoredLog = loadNextLog();
    expect(restoredLog.info).toBe(originalInfo);
  });
});
