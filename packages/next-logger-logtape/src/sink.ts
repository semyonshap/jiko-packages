import { getConsoleSink, type ConsoleSinkOptions, type Sink } from '@logtape/logtape'

import { ORIGINAL_CONSOLE } from './types'

function readStoredConsole(): Console | undefined {
  const globalRegistry = globalThis as unknown as Record<symbol, unknown>
  const consoleRegistry = console as unknown as Record<symbol, unknown>
  return (globalRegistry[ORIGINAL_CONSOLE] ?? consoleRegistry[ORIGINAL_CONSOLE]) as
    Console | undefined
}

export function getRawConsoleSink(
  options: Omit<ConsoleSinkOptions, 'console'> = {},
): Sink | (Sink & Disposable) {
  return getConsoleSink({ ...options, console: readStoredConsole() ?? console })
}
