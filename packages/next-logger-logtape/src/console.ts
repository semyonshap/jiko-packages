import type { NextLoggerPatchOptions } from './types.js'

import { getBaseLogger, logAt, isDispatching } from './utils.js'

const consoleMethods = [
  ['log', 'info'],
  ['info', 'info'],
  ['debug', 'debug'],
  ['warn', 'warn'],
  ['error', 'error'],
  ['trace', 'trace'],
] as const

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
