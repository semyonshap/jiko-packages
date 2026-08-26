import { configure, getConsoleSink, getJsonLinesFormatter, getLogger } from '@logtape/logtape'

await configure({
  sinks: {
    console: getConsoleSink({
      console: globalThis.console,
      formatter: getJsonLinesFormatter({
        properties: 'flatten',
      }),
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
})

export const logger = getLogger(['app'])
