import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { patchNextLogger } from "@/next-logger";
import { setupLogTape } from "../utils/logger";
import { loadNextLog, clearNextLogCache } from "../utils/nextjs";
import {
  captureConsoleState,
  restoreConsoleState,
  type ConsoleState,
} from "../utils/console";

describe("patchNextLogger integration", () => {
  let capturedOutput: string[];
  let restoreLogTape: () => void;
  let originalConsole: ConsoleState;

  beforeEach(async () => {
    originalConsole = captureConsoleState();
    const result = await setupLogTape();
    capturedOutput = result.capturedOutput;
    restoreLogTape = result.restore;
  });

  afterEach(() => {
    restoreLogTape();
    restoreConsoleState(originalConsole);
    clearNextLogCache();
  });

  it("should route both console and Next.js logger to LogTape", () => {
    const restorePatch = patchNextLogger({ category: ["app"] });

    const nextLog = loadNextLog();
    nextLog.info("next info message");
    console.log("console message");
    restorePatch();

    const lines = capturedOutput.map((line) => JSON.parse(line));
    expect(lines.find((l) => l.message === "next info message").logger).toBe(
      "app.next",
    );
    expect(lines.find((l) => l.message === "console message").logger).toBe(
      "app.console",
    );
  });

  it("should map levels for both patched targets", () => {
    const restorePatch = patchNextLogger({ category: ["app"] });
    const nextLog = loadNextLog();

    nextLog.error("next error");
    console.error("console error");
    restorePatch();

    const lines = capturedOutput.map((line) => JSON.parse(line));
    expect(lines.find((l) => l.message === "next error").level).toBe("ERROR");
    expect(lines.find((l) => l.message === "console error").level).toBe(
      "ERROR",
    );
  });

  it("should strip ANSI codes from both targets by default", () => {
    const restorePatch = patchNextLogger({ category: ["app"] });
    const nextLog = loadNextLog();

    nextLog.info("\u001b[32mgreen\u001b[0m");
    console.log("\u001b[32mgreen\u001b[0m");
    restorePatch();

    const lines = capturedOutput.map((line) => JSON.parse(line));
    expect(lines.find((l) => l.logger === "app.next").message).toBe("green");
    expect(lines.find((l) => l.logger === "app.console").message).toBe("green");
  });

  it("should restore both console and Next.js logger after calling restore", () => {
    const originalLog = console.log;
    const originalNext = loadNextLog();

    const restorePatch = patchNextLogger({ category: ["app"] });
    expect(console.log).not.toBe(originalLog);
    expect(loadNextLog().info).not.toBe(originalNext.info);

    restorePatch();

    expect(console.log).toBe(originalLog);
    expect(loadNextLog().info).toBe(originalNext.info);
  });
});

describe("patchNextLogger with custom category", () => {
  let capturedOutput: string[];
  let originalConsole: ConsoleState;

  beforeEach(async () => {
    originalConsole = captureConsoleState();
    const result = await setupLogTape({ categories: [["app"], ["api"]] });
    capturedOutput = result.capturedOutput;
  });

  afterEach(() => {
    restoreConsoleState(originalConsole);
    clearNextLogCache();
  });

  it("should use the provided category for both targets", () => {
    const restorePatch = patchNextLogger({ category: ["api"] });
    const nextLog = loadNextLog();

    nextLog.info("api next message");
    console.info("api console message");
    restorePatch();

    const lines = capturedOutput.map((line) => JSON.parse(line));
    expect(lines.find((l) => l.message === "api next message").logger).toBe(
      "api.next",
    );
    expect(lines.find((l) => l.message === "api console message").logger).toBe(
      "api.console",
    );
  });
});
