export type FormValues = {
  message: string
  level: LogLevel
  context: string
  transport: Transport
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export const Levels: LogLevel[] = ['debug', 'info', 'warn', 'error']

export type Transport = 'console' | 'logger'

export const Transports: Transport[] = ['console', 'logger']
