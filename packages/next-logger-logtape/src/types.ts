import type { Logger } from '@logtape/logtape'

export interface MessageFormatOptions {
  stripAnsi?: boolean
  replaceNewlines?: boolean
}

export interface NextLoggerPatchOptions {
  logger?: Logger
  category?: string[]
  format?: MessageFormatOptions
}
