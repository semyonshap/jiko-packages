import { format } from 'node:util'
import ansiRegex from 'ansi-regex'
import { createRequire } from 'node:module'
import { AsyncLocalStorage } from 'node:async_hooks'
import { getLogger, type Logger } from '@logtape/logtape'

const require = createRequire(process.cwd() + '/')

const DEFAULT_FORMAT_OPTIONS: Required<MessageFormatOptions> = {
  stripAnsi: true,
  replaceNewlines: true,
}

interface MessageFormatOptions {
  stripAnsi?: boolean
  replaceNewlines?: boolean
}

export interface NextLoggerPatchOptions {
  logger?: Logger
  category?: string[]
  format?: MessageFormatOptions
}

const consoleMethods = [
  ['log', 'info'],
  ['info', 'info'],
  ['debug', 'debug'],
  ['warn', 'warn'],
  ['error', 'error'],
  ['trace', 'trace'],
] as const

const nextMethods = [
  'bootstrap',
  'error',
  'event',
  'info',
  'ready',
  'trace',
  'wait',
  'warn',
  'warnOnce',
] as const

const nextLevels: Record<string, 'error' | 'warn' | 'trace' | 'info'> = {
  error: 'error',
  warn: 'warn',
  trace: 'trace',
}

function getBaseLogger(options?: NextLoggerPatchOptions): Logger {
  return guardLoggerDispatch(options?.logger ?? getLogger(options?.category ?? ['app']))
}

// AsyncLocalStorage flag to prevent infinite recursion from console sink
const dispatchContext = new AsyncLocalStorage<true>()

function isDispatching(): boolean {
  return dispatchContext.getStore() === true
}

function runInDispatchContext<T>(fn: () => T): T {
  return dispatchContext.run(true, fn)
}

const guardedSymbol = Symbol('next-logger-logtape.guarded')

// Wrap logger methods to mark async context as dispatching
function guardLoggerDispatch(logger: Logger): Logger {
  const target = logger as unknown as Record<string, unknown>
  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const
  for (const level of levels) {
    const original = target[level] as ((...args: unknown[]) => unknown) | undefined
    if (typeof original !== 'function') continue
    if ((original as { [guardedSymbol]?: boolean })[guardedSymbol]) continue
    const wrapped = (...args: unknown[]): unknown => {
      return runInDispatchContext(() => original.call(logger, ...args))
    }
    ;(wrapped as { [guardedSymbol]?: boolean })[guardedSymbol] = true
    target[level] = wrapped
  }
  return logger
}

function clean(value: unknown, stripAnsi: boolean): unknown {
  return stripAnsi && typeof value === 'string' ? value.replace(ansiRegex(), '') : value
}

function isStructuredValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// Build message template and structured properties from console args
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

  // Separate primitive values from structured objects
  const primitives = cleaned.filter((v) => !isStructuredValue(v) && v !== undefined)
  const objects = cleaned.filter((v) => isStructuredValue(v))

  // Build template:
  let template = format(...primitives)

  // Merge all structured objects into properties
  for (const obj of objects) {
    Object.assign(properties, obj)
  }

  // Optional: collapse newlines and multiple spaces
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
  properties?: Record<string, unknown>,
): void {
  const { template, properties: structured } = toLogTapeMessage(args, formatOptions)
  const record = { ...properties, ...structured }
  runInDispatchContext(() => {
    switch (level) {
      case 'debug':
        logger.debug(template, record)
        break
      case 'warn':
        logger.warn(template, record)
        break
      case 'error':
        logger.error(template, record)
        break
      case 'trace':
        logger.trace(template, record)
        break
      default:
        logger.info(template, record)
    }
  })
}

/**
 * Patch console.* to route through LogTape.
 * Returns restore function.
 */
export function patchConsole(options: NextLoggerPatchOptions = {}): () => void {
  const consoleLogger = getBaseLogger(options).getChild('console')
  const target = console as unknown as Record<string, unknown>
  const original = new Map<string, (...args: unknown[]) => void>()

  for (const [method, level] of consoleMethods) {
    original.set(method, target[method] as (...args: unknown[]) => void)
    target[method] = (...args: unknown[]) => {
      // If already dispatching, call original console to avoid recursion
      if (isDispatching()) {
        original.get(method)?.(...args)
        return
      }
      logAt(consoleLogger, level, args, options.format)
    }
  }

  return () => {
    for (const [method, fn] of original) target[method] = fn
  }
}

/**
 * Patch Next.js internal logger (next/dist/build/output/log).
 * Returns restore function.
 */
export function patchNextLogging(options: NextLoggerPatchOptions = {}): () => void {
  try {
    const logPath = require.resolve('next/dist/build/output/log')
    require(logPath)
    const mod = require.cache[logPath]
    if (!mod) {
      console.warn('[next-logger-logtape] Next.js log module not found')
      return () => {}
    }

    const nextLogger = getBaseLogger(options).getChild('next')
    const original = mod.exports
    const exports = { ...(mod.exports as Record<string, unknown>) }

    for (const method of nextMethods) {
      exports[method] = (...message: unknown[]) => {
        logAt(nextLogger, nextLevels[method] ?? 'info', message, options.format, {
          prefix: method,
        })
      }
    }

    mod.exports = exports
    return () => {
      mod.exports = original
    }
  } catch (err) {
    console.warn('[next-logger-logtape] Failed to patch Next.js logger:', err)
    return () => {}
  }
}

/**
 * Patch both console and Next.js logger.
 * Returns combined restore function.
 */
export function patchNextLogger(options: NextLoggerPatchOptions = {}): () => void {
  const restoreConsole = patchConsole(options)
  const restoreNext = patchNextLogging(options)
  return () => {
    restoreConsole()
    restoreNext()
  }
}
