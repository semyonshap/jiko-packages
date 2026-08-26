import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { LogLevel } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const Log: Record<
  LogLevel,
  (message: string, data?: Record<string, unknown>) => void
> = {
  debug: (message, data) => console.debug(message, data),
  info: (message, data) => console.info(message, data),
  warn: (message, data) => console.warn(message, data),
  error: (message, data) => console.error(message, data),
}
