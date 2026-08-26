import { createRequire } from "node:module";
import { format } from "node:util";
import ansiRegex from "ansi-regex";
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

function logAt(
  logger: Logger,
  level: "info" | "debug" | "warn" | "error" | "trace",
  message: string,
  properties?: Record<string, unknown>,
) {
  switch (level) {
    case "debug":
      logger.debug(message, properties);
      break;
    case "warn":
      logger.warn(message, properties);
      break;
    case "error":
      logger.error(message, properties);
      break;
    case "trace":
      logger.trace(message, properties);
      break;
    default:
      logger.info(message, properties);
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
      logAt(
        consoleLogger,
        level,
        format(...args.map((value) => clean(value, stripAnsi))),
      );
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
  const logPath = require.resolve("next/dist/build/output/log");
  require(logPath);
  const mod = require.cache[logPath];
  if (!mod) return () => {};

  const nextLogger = getBaseLogger(options).getChild("next");
  const original = mod.exports;
  const exports = { ...(mod.exports as Record<string, unknown>) };

  for (const method of nextMethods) {
    exports[method] = (...message: unknown[]) => {
      logAt(
        nextLogger,
        nextLevels[method] ?? "info",
        format(...message.map((value) => clean(value, stripAnsi))),
        { prefix: method },
      );
    };
  }

  mod.exports = exports;
  return () => {
    mod.exports = original;
  };
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
