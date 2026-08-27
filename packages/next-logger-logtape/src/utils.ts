import {
  type NextLoggerPatchOptions,
  type MessageFormatOptions,
  DEFAULT_FORMAT_OPTIONS,
  GUARDED,
} from './types.js'

import ansiRegex from 'ansi-regex'
import { getLogger, type Logger } from '@logtape/logtape'

import { dispatchContext } from './context'

function format(...args: unknown[]): string {
  return args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ')
}

function guardLoggerDispatch(logger: Logger): Logger {
  const target = logger as unknown as Record<string, unknown>
  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const
  for (const level of levels) {
    const original = target[level] as ((...args: unknown[]) => unknown) | undefined
    if (typeof original !== 'function') continue
    if ((original as { [GUARDED]?: boolean })[GUARDED]) continue
    const wrapped = (...args: unknown[]): unknown => {
      return dispatchContext.run(() => original.call(logger, ...args))
    }
    ;(wrapped as { [GUARDED]?: boolean })[GUARDED] = true
    target[level] = wrapped
  }
  return logger
}

export function getBaseLogger(options?: NextLoggerPatchOptions): Logger {
  return guardLoggerDispatch(getLogger(options?.category ?? ['app']))
}

function clean(value: unknown, stripAnsi: boolean): unknown {
  return stripAnsi && typeof value === 'string' ? value.replace(ansiRegex(), '') : value
}

function isStructuredValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toLogTapeMessage(
  args: readonly unknown[],
  formatOptions?: MessageFormatOptions,
): { template: string; properties: Record<string, unknown> } {
  const { stripAnsi, replaceNewlines } = {
    ...DEFAULT_FORMAT_OPTIONS,
    ...formatOptions,
  }

  const properties: Record<string, unknown> = {}
  const cleaned = args.map((v) => clean(v, stripAnsi))

  const primitives = cleaned.filter((v) => !isStructuredValue(v))
  const objects = cleaned.filter((v) => isStructuredValue(v))

  let template = format(...primitives)

  for (const obj of objects) {
    Object.assign(properties, obj)
  }

  if (replaceNewlines) {
    template = template.replace(/\n/g, ' ').replace(/\s+/g, ' ')
  }

  return { template, properties }
}

export function logAt(
  logger: Logger,
  level: 'info' | 'debug' | 'warn' | 'error' | 'trace',
  args: readonly unknown[],
  formatOptions?: MessageFormatOptions,
): void {
  const { template, properties } = toLogTapeMessage(args, formatOptions)
  dispatchContext.run(() => {
    logger[level](template, properties)
  })
}
