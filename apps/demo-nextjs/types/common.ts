export type FormValues = {
  message: string
  level: LogLevel
  context: string
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export const Levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
