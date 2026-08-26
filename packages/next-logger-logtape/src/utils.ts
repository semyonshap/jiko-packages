import type { NextLoggerPatchOptions, MessageFormatOptions } from './types.js'

import { format } from 'node:util'
import ansiRegex from 'ansi-regex'
import { AsyncLocalStorage } from 'node:async_hooks'
import { getLogger, type Logger } from '@logtape/logtape'

const DEFAULT_FORMAT_OPTIONS: Required<MessageFormatOptions> = {
  stripAnsi: true,
  replaceNewlines: true,
}

const guardedSymbol = Symbol('next-logger-logtape.guarded')

const dispatchContext = new AsyncLocalStorage<true>()

export function isDispatching(): boolean {
  return dispatchContext.getStore() === true
}

function runInDispatchContext<T>(fn: () => T): T {
  return dispatchContext.run(true, fn)
}

function guardLoggerDispatch(logger: Logger): Logger {
  const target = logger as unknown as Record<string, unknown>
  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const
  for (const level of levels) {
    const original = target[level] as ((...args: unknown[]) => unknown) | undefined
    if (typeof original !== 'function') continue
    if ((original as { [guardedSymbol]?: boolean })[guardedSymbol]) continue
    const wrapped = (...args: unknown[]): unknown => {
      return runInDispatchContext(() => original.call(logger, ...args))
    }
    ;(wrapped as { [guardedSymbol]?: boolean })[guardedSymbol] = true
    target[level] = wrapped
  }
  return logger
}

export function getBaseLogger(options?: NextLoggerPatchOptions): Logger {
  return guardLoggerDispatch(options?.logger ?? getLogger(options?.category ?? ['app']))
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

  const primitives = cleaned.filter((v) => !isStructuredValue(v) && v !== undefined)
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
  properties?: Record<string, unknown>,
): void {
  const { template, properties: structured } = toLogTapeMessage(args, formatOptions)
  const record = { ...properties, ...structured }
  runInDispatchContext(() => {
    switch (level) {
      case 'debug':
        logger.debug(template, record)
        break
      case 'warn':
        logger.warn(template, record)
        break
      case 'error':
        logger.error(template, record)
        break
      case 'trace':
        logger.trace(template, record)
        break
      default:
        logger.info(template, record)
    }
  })
}
