import { createRequire } from 'node:module'

import { patchConsole } from './console'
import { getBaseLogger, logAt } from './utils.js'
import { nextLevels, nextMethods, type NextLoggerPatchOptions } from './types.js'

export function patchNextLogger(options: NextLoggerPatchOptions = {}): () => void {
  const restoreConsole = patchConsole(options)
  const restoreNext = patchNextLogging(options)
  return () => {
    restoreConsole()
    restoreNext()
  }
}

export function patchNextLogging(options: NextLoggerPatchOptions = {}): () => void {
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

    const originalMethods = new Map<string, (...args: unknown[]) => void>()
    for (const method of nextMethods) {
      if (typeof original[method] === 'function') {
        originalMethods.set(method, original[method] as (...args: unknown[]) => void)
      }
    }

    for (const method of nextMethods) {
      exports[method] = (...message: unknown[]) => {
        if (options.debug) {
          const origFn = originalMethods.get(method)
          if (origFn) {
            const debugMessage = [...message, { debug: true, source: 'nextjs' }]
            origFn(...debugMessage)
          }
        }

        logAt(nextLogger, nextLevels[method] ?? 'info', message, options.format)
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
