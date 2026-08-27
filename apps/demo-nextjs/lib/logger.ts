import { configure, getJsonLinesFormatter, getLogger } from '@logtape/logtape'
import { getRawConsoleSink } from '@with-jiko/next-logger-logtape/sink'

await configure({
  sinks: {
    console: getRawConsoleSink({
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
