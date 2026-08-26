import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { patchConsole } from "@/next-logger";
import { setupLogTape } from "../utils/logger";
import {
  captureConsoleState,
  restoreConsoleState,
  type ConsoleState,
} from "../utils/console";

describe("patchConsole integration", () => {
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
  });

  it("should redirect console.log and console.info to LogTape as INFO", () => {
    const restorePatch = patchConsole({ category: ["app"] });

    console.log("log message");
    console.info("info message");
    restorePatch();

    const lines = capturedOutput.map((line) => JSON.parse(line));
    const logLine = lines.find((l) => l.message === "log message");
    const infoLine = lines.find((l) => l.message === "info message");

    expect(logLine).toBeDefined();
    expect(logLine.level).toBe("INFO");
    expect(logLine.logger).toBe("app.console");

    expect(infoLine).toBeDefined();
    expect(infoLine.level).toBe("INFO");
  });

  it("should map console methods to correct log levels", () => {
    const restorePatch = patchConsole({ category: ["app"] });

    console.debug("debug message");
    console.warn("warn message");
    console.error("error message");
    console.trace("trace message");
    restorePatch();

    const lines = capturedOutput.map((line) => JSON.parse(line));
    expect(lines.find((l) => l.message === "debug message").level).toBe(
      "DEBUG",
    );
    expect(lines.find((l) => l.message === "warn message").level).toBe("WARN");
    expect(lines.find((l) => l.message === "error message").level).toBe(
      "ERROR",
    );
    expect(lines.find((l) => l.message === "trace message").level).toBe(
      "TRACE",
    );
  });

  it("should format multiple arguments and keep objects structured", () => {
    const restorePatch = patchConsole({ category: ["app"] });

    console.log("count: %d", 5);
    console.log("value:", { a: 1 });
    restorePatch();

    const lines = capturedOutput.map((line) => JSON.parse(line));
    expect(lines.find((l) => l.message?.includes("count"))?.message).toBe(
      "count: 5",
    );

    const objLine = lines.find((l) => l.logger === "app.console" && l.arg0);
    expect(objLine).toBeDefined();
    expect(objLine.message).toBe('value: {"a":1}');
    expect(objLine.arg0).toEqual({ a: 1 });
  });

  it("should preserve a standalone object as structured properties", () => {
    const restorePatch = patchConsole({ category: ["app"] });

    console.log({ method: "GET", status: 200 });
    restorePatch();

    const line = capturedOutput
      .map((l) => JSON.parse(l))
      .find((l) => l.logger === "app.console" && l.arg0);
    expect(line).toBeDefined();
    expect(line.message).toBe('{"method":"GET","status":200}');
    expect(line.arg0).toEqual({ method: "GET", status: 200 });
  });

  it("should strip ANSI escape codes by default", () => {
    const restorePatch = patchConsole({ category: ["app"] });

    console.log("\u001b[31mred\u001b[0m");
    restorePatch();

    const line = capturedOutput
      .map((l) => JSON.parse(l))
      .find((l) => l.message?.includes("red"));
    expect(line).toBeDefined();
    expect(line.message).toBe("red");
  });

  it("should keep ANSI escape codes when stripAnsi is false", () => {
    const restorePatch = patchConsole({
      category: ["app"],
      stripAnsi: false,
    });

    console.log("\u001b[31mred\u001b[0m");
    restorePatch();

    const line = capturedOutput
      .map((l) => JSON.parse(l))
      .find((l) => l.message?.includes("red"));
    expect(line).toBeDefined();
    expect(line.message).toBe("\u001b[31mred\u001b[0m");
  });

  it("should restore original console methods after calling restore", () => {
    const originalLog = console.log;

    const restorePatch = patchConsole({ category: ["app"] });
    expect(console.log).not.toBe(originalLog);

    restorePatch();
    expect(console.log).toBe(originalLog);
  });
});
