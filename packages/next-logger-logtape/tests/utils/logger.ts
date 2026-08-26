import { configure, getJsonLinesFormatter } from '@logtape/logtape'

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

export async function setupLogTape(
  options: LogTapeSetupOptions = {},
): Promise<LogTapeTestHarness> {
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
