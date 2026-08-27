export interface MessageFormatOptions {
  stripAnsi?: boolean
  replaceNewlines?: boolean
}

export interface NextLoggerPatchOptions {
  category?: string[]
  format?: MessageFormatOptions
  debug?: boolean
}

export const ORIGINAL_CONSOLE = Symbol.for('next-logger-logtape.originalConsole')
export const ORIGINAL_CONSOLE_METHOD = Symbol.for('next-logger-logtape.original-console-method')
export const GUARDED = Symbol.for('next-logger-logtape.guarded')

export type TaggedFn = ((...args: unknown[]) => void) & {
  [ORIGINAL_CONSOLE_METHOD]?: (...args: unknown[]) => void
}

export const consoleMethods = [
  ['log', 'info'],
  ['info', 'info'],
  ['debug', 'debug'],
  ['warn', 'warn'],
  ['error', 'error'],
  ['trace', 'trace'],
] as const

export type ConsoleMethod = 'log' | 'info' | 'debug' | 'warn' | 'error' | 'trace'

export const nextMethods = [
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

export const nextLevels: Record<string, 'error' | 'warn' | 'trace' | 'info'> = {
  error: 'error',
  warn: 'warn',
  trace: 'trace',
}

export const DEFAULT_FORMAT_OPTIONS: Required<MessageFormatOptions> = {
  stripAnsi: true,
  replaceNewlines: true,
}
