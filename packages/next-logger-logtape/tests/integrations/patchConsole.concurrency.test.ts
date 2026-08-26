import { getLogger } from '@logtape/logtape'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { patchConsole } from '@/console'

import { setupConsoleTest, type ConsoleTestHarness } from '../utils/logger'
import { captureConsoleState, restoreConsoleState, type ConsoleState } from '../utils/console'

/**
 * These tests exercise the same setup as a real Next.js app that uses a
 * console sink:
 *
 *   sink: getConsoleSink(...)  →  writes through the (patched) console
 *   patch: patchConsole(...)   →  intercepts console.* and routes to `app.console`
 *
 * The recursion guard (AsyncLocalStorage dispatch context) must keep records
 * intact even when many requests run concurrently and interleave async work.
 */

const REQUEST_COUNT = 25

describe('patchConsole concurrency', () => {
  let harness: ConsoleTestHarness
  let originalConsole: ConsoleState

  beforeEach(async () => {
    originalConsole = captureConsoleState()
    harness = await setupConsoleTest()
  })

  afterEach(() => {
    restoreConsoleState(originalConsole)
  })

  it('drops undefined args from the message without a loop', () => {
    // Regression test for the observed `message: "undefined"` records, which
    // come from real `console.log(undefined)` calls emitted by the Next.js
    // runtime. The patch must filter `undefined` out of the message and produce
    // exactly ONE app.console record. If the sink re-entered the patch (loop),
    // the message would instead be a nested JSON record.
    const restorePatch = patchConsole({ category: ['app'] })

    console.log(undefined)
    console.log('hello', undefined)

    restorePatch()

    const records = harness.written.map((w) => JSON.parse(String(w.args[0])))
    expect(records).toHaveLength(2)

    // Standalone `undefined` → empty, readable message.
    const undefinedRec = records.find((r) => r.logger === 'app.console' && r.level === 'INFO')
    expect(undefinedRec.message).toBe('')

    // `undefined` mixed with a message leaves the message intact.
    const mixedRec = records.find((r) => r.message === 'hello')
    expect(mixedRec).toBeDefined()
    expect(mixedRec.logger).toBe('app.console')
    expect(mixedRec.level).toBe('INFO')

    // No record may carry a nested JSON record as its message — that would mean
    // the sink re-entered the patched console (recursion / loop).
    for (const r of records) {
      expect(typeof r.message).toBe('string')
      expect(r.message.startsWith('{')).toBe(false)
    }
  })

  it('does not recurse, duplicate, or lose records under concurrent requests', async () => {
    const restorePatch = patchConsole({ category: ['app'] })
    const logger = getLogger(['app'])

    // Simulate concurrent Next.js requests: each mixes direct logger.* calls
    // with console.* calls (which the runtime/libraries also emit), interleaved
    // with async work so the async contexts overlap.
    const runRequest = async (id: number): Promise<void> => {
      logger.info(`req-${id}:start`, { requestId: id })
      await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 5)))
      console.log(`req-${id}:console`, { requestId: id })
      await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 5)))
      logger.debug(`req-${id}:end`, { requestId: id })
    }

    await Promise.all(Array.from({ length: REQUEST_COUNT }, (_, i) => runRequest(i)))

    restorePatch()

    const records = harness.written.map((w) => JSON.parse(String(w.args[0])))

    // Exactly one record per call: no recursion, no duplication through the sink.
    expect(records).toHaveLength(REQUEST_COUNT * 3)

    for (let i = 0; i < REQUEST_COUNT; i++) {
      // Direct logger.info → clean "app" record with its own requestId.
      const start = records.find((r) => r.message === `req-${i}:start`)
      expect(start).toBeDefined()
      expect(start.logger).toBe('app')
      expect(start.requestId).toBe(i)

      // console.log → "app.console" record; object goes to properties only.
      const consoleRec = records.find((r) => r.message === `req-${i}:console`)
      expect(consoleRec).toBeDefined()
      expect(consoleRec.logger).toBe('app.console')
      expect(consoleRec.requestId).toBe(i)

      // Direct logger.debug → clean "app" record.
      const end = records.find((r) => r.message === `req-${i}:end`)
      expect(end).toBeDefined()
      expect(end.logger).toBe('app')
      expect(end.requestId).toBe(i)
    }

    // No record may carry a nested JSON record as its message — that would mean
    // the console sink re-entered the patched console (recursion / loop).
    const nested = records.filter(
      (r) =>
        typeof r.message === 'string' &&
        r.message.trim().startsWith('{') &&
        r.message.includes('"logger"'),
    )
    expect(nested).toHaveLength(0)

    // No unexplained "undefined" messages and no missing messages.
    for (const r of records) {
      expect(r.message).toBeTypeOf('string')
      expect(r.message).not.toBe('undefined')
    }
  })
})
