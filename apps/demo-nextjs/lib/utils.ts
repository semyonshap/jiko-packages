import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { LogLevel, Transport } from '@/types'
import { logger } from './logger'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function emitLog(
  transport: Transport,
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (transport === 'logger') {
    if (level === 'debug') logger.debug(message, data)
    else if (level === 'warn') logger.warn(message, data)
    else if (level === 'error') logger.error(message, data)
    else logger.info(message, data)
    return
  } else if (transport === 'console') {
    if (level === 'debug') console.debug(message, data)
    else if (level === 'warn') console.warn(message, data)
    else if (level === 'error') console.error(message, data)
    else console.info(message, data)
    return
  }
  return
}
