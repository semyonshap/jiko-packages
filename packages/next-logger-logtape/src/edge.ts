import { getLogger, type Logger } from '@logtape/logtape'
import ansiRegex from 'ansi-regex'
import {
  GUARDED,
  ORIGINAL_CONSOLE,
  ORIGINAL_CONSOLE_METHOD,
  DEFAULT_FORMAT_OPTIONS,
  consoleMethods,
  type MessageFormatOptions,
  type NextLoggerPatchOptions,
  type TaggedFn,
} from './types'

// ── Edge-safe dispatch guard ────────────────────────────────────────────────
// This module must stay importable from Edge/middleware bundles. That is why
// the dispatch guard is a plain boolean (no `node:async_hooks`) and this file
// does NOT import `./context` or `./utils` (they pull `node:*` builtins into
// the Edge bundle).
let isInside = false
const dispatchContext = {
  isDispatching: () => isInside,
  run: <T>(fn: () => T): T => {
    if (isInside) return fn()
    isInside = true
    try {
      return fn()
    } finally {
      isInside = false
    }
  },
}

function guardLoggerDispatch(logger: Logger): Logger {
  const target = logger as unknown as Record<string, unknown>
  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const
  for (const level of levels) {
    const original = target[level] as ((...args: unknown[]) => unknown) | undefined
    if (typeof original !== 'function') continue
    if ((original as { [GUARDED]?: boolean })[GUARDED]) continue
    const wrapped = (...args: unknown[]): unknown => {
      return dispatchContext.run(() => original.call(logger, ...args))
    }
    ;(wrapped as { [GUARDED]?: boolean })[GUARDED] = true
    target[level] = wrapped
  }
  return logger
}

function getBaseLogger(options?: NextLoggerPatchOptions): Logger {
  return guardLoggerDispatch(getLogger(options?.category ?? ['app']))
}

function format(...args: unknown[]): string {
  return args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ')
}

function clean(value: unknown, stripAnsi: boolean): unknown {
  return stripAnsi && typeof value === 'string' ? value.replace(ansiRegex(), '') : value
}

function isStructuredValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toLogTapeMessage(
  args: readonly unknown[],
  formatOptions?: MessageFormatOptions,
): { template: string; properties: Record<string, unknown> } {
  const { stripAnsi, replaceNewlines } = {
    ...DEFAULT_FORMAT_OPTIONS,
    ...formatOptions,
  }

  const properties: Record<string, unknown> = {}
  const cleaned = args.map((v) => clean(v, stripAnsi))

  const primitives = cleaned.filter((v) => !isStructuredValue(v) && v !== undefined)
  const objects = cleaned.filter((v) => isStructuredValue(v))

  let template = format(...primitives)

  for (const obj of objects) {
    Object.assign(properties, obj)
  }

  if (replaceNewlines) {
    template = template.replace(/\n/g, ' ').replace(/\s+/g, ' ')
  }

  return { template, properties }
}

function logAt(
  logger: Logger,
  level: 'info' | 'debug' | 'warn' | 'error' | 'trace',
  args: readonly unknown[],
  formatOptions?: MessageFormatOptions,
): void {
  const { template, properties } = toLogTapeMessage(args, formatOptions)
  dispatchContext.run(() => {
    logger[level](template, properties)
  })
}

export function storeRawConsole(): void {
  const globalRegistry = globalThis as unknown as Record<symbol, unknown>
  const consoleRegistry = console as unknown as Record<symbol, unknown>

  if (globalRegistry[ORIGINAL_CONSOLE] || consoleRegistry[ORIGINAL_CONSOLE]) return

  const native = {} as Console
  const target = console as unknown as Record<string, unknown>

  function isObjectOrFunction(value: unknown): value is object {
    return (typeof value === 'object' && value !== null) || typeof value === 'function'
  }

  for (const [method] of consoleMethods) {
    const current = target[method]
    let trueOriginal: unknown = current

    if (isObjectOrFunction(current) && ORIGINAL_CONSOLE_METHOD in current) {
      trueOriginal = current[ORIGINAL_CONSOLE_METHOD] ?? current
    }

    if (typeof trueOriginal === 'function') {
      native[method] = trueOriginal.bind(console)
    }
  }

  globalRegistry[ORIGINAL_CONSOLE] = native
  consoleRegistry[ORIGINAL_CONSOLE] = native
}

/**
 * Edge-runtime-safe variant of `patchConsole` for use inside Next.js
 * middleware (Edge bundle). Captures `console.*` arguments BEFORE the Edge
 * runtime flattens them into a single string, and feeds them to LogTape.
 */
export function patchConsoleEdge(options: NextLoggerPatchOptions = {}): () => void {
  storeRawConsole()

  const consoleLogger = getBaseLogger(options).getChild('console')
  const target = console as unknown as Record<string, TaggedFn>
  const original = new Map<string, (...args: unknown[]) => void>()

  for (const [method, level] of consoleMethods) {
    const current = target[method]

    const trueOriginal = current?.[ORIGINAL_CONSOLE_METHOD] ?? current
    original.set(method, trueOriginal)

    const wrapped: TaggedFn = (...args: unknown[]) => {
      if (dispatchContext.isDispatching()) {
        trueOriginal(...args)
        return
      }
      if (options.debug) {
        trueOriginal(...args, { debug: true, source: 'console', level, args })
      }
      logAt(consoleLogger, level, args, options.format)
    }
    wrapped[ORIGINAL_CONSOLE_METHOD] = trueOriginal
    target[method] = wrapped
  }

  return () => {
    for (const [method, fn] of original) target[method] = fn
  }
}
