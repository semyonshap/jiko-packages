import type { NextLoggerPatchOptions } from './types.js'

import { getBaseLogger, logAt } from './utils.js'

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

/**
 * Patch Next.js internal logger (next/dist/build/output/log).
 * Returns restore function (async).
 */
export async function patchNextLogging(options: NextLoggerPatchOptions = {}): Promise<() => void> {
  const { createRequire } = await import('node:module')
  const require = createRequire(process.cwd() + '/')

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
 * Returns combined restore function (async).
 */
export async function patchNextLogger(options: NextLoggerPatchOptions = {}): Promise<() => void> {
  const { patchConsole } = await import('./console.js')
  const restoreConsole = patchConsole(options)
  const restoreNext = await patchNextLogging(options)
  return () => {
    restoreConsole()
    restoreNext()
  }
}
