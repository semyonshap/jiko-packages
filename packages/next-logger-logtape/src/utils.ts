import {
  type NextLoggerPatchOptions,
  type MessageFormatOptions,
  DEFAULT_FORMAT_OPTIONS,
} from './types'

import ansiRegex from 'ansi-regex'
import { getLogger, type Logger } from '@logtape/logtape'

function format(...args: unknown[]): string {
  return args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ')
}

export function getBaseLogger(options?: NextLoggerPatchOptions): Logger {
  return getLogger(options?.category ?? ['app'])
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

  const primitives: unknown[] = []

  for (const v of cleaned) {
    if (isStructuredValue(v)) {
      Object.assign(properties, v)
    } else if (v !== undefined && v !== null && !(typeof v === 'string' && v === 'undefined')) {
      primitives.push(v)
    }
  }

  let template = format(...primitives)

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
  logger[level](template, properties)
}
