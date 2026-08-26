import { configure, getConsoleSink, getJsonLinesFormatter } from '@logtape/logtape'
import { CONSOLE_METHODS, type ConsoleMethod } from './console'

export interface LogTapeTestHarness {
  capturedOutput: string[]
  restore: () => void
}

export interface LogTapeSetupOptions {
  /**
   * Categories to route to the capture sink.
   * Defaults to `[["app"]]`.
   */
  categories?: string[][]
}

export async function setupLogTape(options: LogTapeSetupOptions = {}): Promise<LogTapeTestHarness> {
  const { categories = [['app']] } = options
  const capturedOutput: string[] = []
  const formatter = getJsonLinesFormatter({ properties: 'flatten' })

  await configure({
    sinks: {
      // Custom sink: formats the record as JSON and collects it into an array.
      // This way we verify the actual LogTape formatting without relying on
      // intercepting process.stdout/console.
      test: (record) => {
        capturedOutput.push(formatter(record))
      },
    },
    loggers: categories.map((category) => ({
      category,
      lowestLevel: 'trace',
      sinks: ['test'],
    })),
    reset: true,
  })

  return {
    capturedOutput,
    restore: () => {},
  }
}

export interface ConsoleTestHarness {
  written: Array<{ method: ConsoleMethod; args: unknown[] }>
  restore: () => void
}

export async function setupConsoleTest(): Promise<ConsoleTestHarness> {
  // 1. Save original console methods
  const originalConsole = Object.fromEntries(CONSOLE_METHODS.map((m) => [m, console[m]])) as Record<
    ConsoleMethod,
    (...args: unknown[]) => void
  >

  // 2. Create recorders
  const written: Array<{ method: ConsoleMethod; args: unknown[] }> = []
  const recorders = Object.fromEntries(
    CONSOLE_METHODS.map((method) => [
      method,
      (...args: unknown[]) => {
        written.push({ method, args })
      },
    ]),
  ) as Record<ConsoleMethod, (...args: unknown[]) => void>

  // 3. Replace global console with recorders
  const target = console as unknown as Record<string, unknown>
  for (const method of CONSOLE_METHODS) {
    target[method] = recorders[method]
  }

  // 4. Configure LogTape with a console sink (which will use the replaced console)
  await configure({
    sinks: {
      console: getConsoleSink({
        formatter: getJsonLinesFormatter({ properties: 'flatten' }),
      }),
    },
    loggers: [
      {
        category: 'app',
        lowestLevel: 'trace',
        sinks: ['console'],
      },
      {
        category: ['logtape', 'meta'],
        lowestLevel: 'warning',
        sinks: ['console'],
      },
    ],
    reset: true,
  })

  // 5. Return harness with restore function
  return {
    written,
    restore: () => {
      // Restore original console
      for (const method of CONSOLE_METHODS) {
        target[method] = originalConsole[method]
      }
      // Optionally reset LogTape configuration (not strictly needed for these tests)
    },
  }
}
