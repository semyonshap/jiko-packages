import { format } from "node:util";
import ansiRegex from "ansi-regex";
import { createRequire } from "node:module";
import { getLogger, type Logger } from "@logtape/logtape";

const require = createRequire(process.cwd() + "/");

export interface NextLoggerPatchOptions {
  /** The LogTape logger to route logs to. */
  logger?: Logger;
  /** The category used when no logger is provided. Defaults to `['app']`. */
  category?: string[];
  /** Strip ANSI escape codes from messages. Defaults to `true`. */
  stripAnsi?: boolean;
}

const consoleMethods = [
  ["log", "info"],
  ["info", "info"],
  ["debug", "debug"],
  ["warn", "warn"],
  ["error", "error"],
  ["trace", "trace"],
] as const;

const nextMethods = [
  "bootstrap",
  "error",
  "event",
  "info",
  "ready",
  "trace",
  "wait",
  "warn",
  "warnOnce",
] as const;

const nextLevels: Record<string, "error" | "warn" | "trace" | "info"> = {
  error: "error",
  warn: "warn",
  trace: "trace",
};

function getBaseLogger(options?: NextLoggerPatchOptions): Logger {
  return options?.logger ?? getLogger(options?.category ?? ["app"]);
}

function clean(value: unknown, stripAnsi: boolean): unknown {
  return stripAnsi && typeof value === "string"
    ? value.replace(ansiRegex(), "")
    : value;
}

function isStructuredValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Build a LogTape message template and structured `properties` from
 * console-like arguments.
 */
function toLogTapeMessage(
  args: readonly unknown[],
  stripAnsi: boolean,
): { template: string; properties: Record<string, unknown> } {
  const properties: Record<string, unknown> = {};
  let argIndex = 0;

  const formattedArgs = args.map((value) => {
    const cleaned = clean(value, stripAnsi);
    if (isStructuredValue(cleaned)) {
      const key = `arg${argIndex}`;
      properties[key] = cleaned;
      argIndex++;
      return `{${key}}`;
    }
    return cleaned;
  });

  return { template: format(...formattedArgs), properties };
}

function logAt(
  logger: Logger,
  level: "info" | "debug" | "warn" | "error" | "trace",
  args: readonly unknown[],
  stripAnsi: boolean,
  properties?: Record<string, unknown>,
): void {
  const { template, properties: structured } = toLogTapeMessage(
    args,
    stripAnsi,
  );
  const record = { ...properties, ...structured };
  switch (level) {
    case "debug":
      logger.debug(template, record);
      break;
    case "warn":
      logger.warn(template, record);
      break;
    case "error":
      logger.error(template, record);
      break;
    case "trace":
      logger.trace(template, record);
      break;
    default:
      logger.info(template, record);
  }
}

/**
 * Route `console.*` calls to a LogTape logger.
 *
 * @param options Patch options.
 * @returns A function that restores the original `console` methods.
 */
export function patchConsole(options: NextLoggerPatchOptions = {}): () => void {
  const { stripAnsi = true } = options;
  const consoleLogger = getBaseLogger(options).getChild("console");
  const target = console as unknown as Record<string, unknown>;
  const original = new Map<string, unknown>();

  for (const [method, level] of consoleMethods) {
    original.set(method, target[method]);
    target[method] = (...args: unknown[]) => {
      logAt(consoleLogger, level, args, stripAnsi);
    };
  }

  return () => {
    for (const [method, fn] of original) target[method] = fn;
  };
}

/**
 * Route Next.js's internal logger (`next/dist/build/output/log`) to a LogTape
 * logger.
 *
 * @param options Patch options.
 * @returns A function that restores the original module exports.
 */
export function patchNextLogging(
  options: NextLoggerPatchOptions = {},
): () => void {
  const { stripAnsi = true } = options;
  try {
    const logPath = require.resolve("next/dist/build/output/log");
    require(logPath);
    const mod = require.cache[logPath];
    if (!mod) {
      console.warn("[next-logger-logtape] Next.js log module not found");
      return () => {};
    }

    const nextLogger = getBaseLogger(options).getChild("next");
    const original = mod.exports;
    const exports = { ...(mod.exports as Record<string, unknown>) };

    for (const method of nextMethods) {
      exports[method] = (...message: unknown[]) => {
        logAt(nextLogger, nextLevels[method] ?? "info", message, stripAnsi, {
          prefix: method,
        });
      };
    }

    mod.exports = exports;
    return () => {
      mod.exports = original;
    };
  } catch (err) {
    console.warn("[next-logger-logtape] Failed to patch Next.js logger:", err);
    return () => {};
  }
}

/**
 * Patch both the Next.js internal logger and `console`.
 *
 * @param options Patch options.
 * @returns A function that restores both patches.
 */
export function patchNextLogger(
  options: NextLoggerPatchOptions = {},
): () => void {
  const restoreConsole = patchConsole(options);
  const restoreNext = patchNextLogging(options);
  return () => {
    restoreConsole();
    restoreNext();
  };
}
