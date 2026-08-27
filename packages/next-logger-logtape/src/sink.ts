import { getConsoleSink, type ConsoleSinkOptions, type Sink } from '@logtape/logtape'

import { ORIGINAL_CONSOLE } from './types'

function readStoredConsole(): Console | undefined {
  const globalRegistry = globalThis as unknown as Record<symbol, unknown>
  const consoleRegistry = console as unknown as Record<symbol, unknown>
  return (globalRegistry[ORIGINAL_CONSOLE] ?? consoleRegistry[ORIGINAL_CONSOLE]) as
    Console | undefined
}

function createRawConsoleProxy(): Console {
  return new Proxy({} as Console, {
    get(_target, prop) {
      const stored = readStoredConsole() ?? globalThis.console
      const value = (stored as unknown as Record<PropertyKey, unknown>)[prop]
      return typeof value === 'function' ? value.bind(stored) : value
    },
  })
}

export function getRawConsoleSink(
  options: Omit<ConsoleSinkOptions, 'console'> = {},
): Sink | (Sink & Disposable) {
  return getConsoleSink({ ...options, console: createRawConsoleProxy() })
}
