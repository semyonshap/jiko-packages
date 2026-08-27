import { dispatchContext } from './context'
import { getBaseLogger, logAt } from './utils'
import {
  ORIGINAL_CONSOLE,
  ORIGINAL_CONSOLE_METHOD,
  consoleMethods,
  type NextLoggerPatchOptions,
  type TaggedFn,
} from './types'

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

export function patchConsole(options: NextLoggerPatchOptions = {}): () => void {
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
