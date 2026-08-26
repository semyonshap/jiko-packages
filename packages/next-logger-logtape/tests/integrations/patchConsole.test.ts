import { getLogger } from '@logtape/logtape'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { patchConsole } from '@/next-logger'

import { setupLogTape, setupConsoleTest } from '../utils/logger'
import { captureConsoleState, restoreConsoleState, type ConsoleState } from '../utils/console'

describe('patchConsole integration', () => {
  let capturedOutput: string[]
  let restoreLogTape: () => void
  let originalConsole: ConsoleState

  beforeEach(async () => {
    originalConsole = captureConsoleState()
    const result = await setupLogTape()
    capturedOutput = result.capturedOutput
    restoreLogTape = result.restore
  })

  afterEach(() => {
    restoreLogTape()
    restoreConsoleState(originalConsole)
  })

  it('should redirect console.log and console.info to LogTape as INFO', () => {
    const restorePatch = patchConsole({ category: ['app'] })

    console.log('log message')
    console.info('info message')
    restorePatch()

    const lines = capturedOutput.map((line) => JSON.parse(line))
    const logLine = lines.find((l) => l.message === 'log message')
    const infoLine = lines.find((l) => l.message === 'info message')

    expect(logLine).toBeDefined()
    expect(logLine.level).toBe('INFO')
    expect(logLine.logger).toBe('app.console')

    expect(infoLine).toBeDefined()
    expect(infoLine.level).toBe('INFO')
  })

  it('should map console methods to correct log levels', () => {
    const restorePatch = patchConsole({ category: ['app'] })

    console.debug('debug message')
    console.warn('warn message')
    console.error('error message')
    console.trace('trace message')
    restorePatch()

    const lines = capturedOutput.map((line) => JSON.parse(line))
    expect(lines.find((l) => l.message === 'debug message').level).toBe('DEBUG')
    expect(lines.find((l) => l.message === 'warn message').level).toBe('WARN')
    expect(lines.find((l) => l.message === 'error message').level).toBe('ERROR')
    expect(lines.find((l) => l.message === 'trace message').level).toBe('TRACE')
  })

  it('should format multiple arguments and keep objects structured', () => {
    const restorePatch = patchConsole({ category: ['app'] })

    console.log('count: %d', 5)
    console.log('value:', { a: 1 })
    restorePatch()

    const lines = capturedOutput.map((line) => JSON.parse(line))
    // Check first log: count
    const countLine = lines.find((l) => l.message?.includes('count'))
    expect(countLine).toBeDefined()
    expect(countLine.message).toBe('count: 5')

    // Check second log: object should be flattened into properties,
    // not duplicated into the message
    const objLine = lines.find((l) => l.logger === 'app.console' && l.a === 1)
    expect(objLine).toBeDefined()
    expect(objLine.message).toBe('value:')
    expect(objLine.a).toBe(1)
    expect(objLine.arg0).toBeUndefined()
  })

  it('should preserve a standalone object as structured properties', () => {
    const restorePatch = patchConsole({ category: ['app'] })

    console.log({ method: 'GET', status: 200 })
    restorePatch()

    const lines = capturedOutput.map((l) => JSON.parse(l))
    const line = lines.find(
      (l) => l.logger === 'app.console' && l.method === 'GET' && l.status === 200,
    )
    expect(line).toBeDefined()
    // The object goes only into properties, not into the message
    expect(line.message).toBe('')
    // Properties should be at top level
    expect(line.method).toBe('GET')
    expect(line.status).toBe(200)
    expect(line.arg0).toBeUndefined()
  })

  it('should strip ANSI escape codes by default', () => {
    const restorePatch = patchConsole({ category: ['app'] })

    console.log('\u001b[31mred\u001b[0m')
    restorePatch()

    const line = capturedOutput.map((l) => JSON.parse(l)).find((l) => l.message?.includes('red'))
    expect(line).toBeDefined()
    expect(line.message).toBe('red')
  })

  it('should keep ANSI escape codes when stripAnsi is false', () => {
    const restorePatch = patchConsole({
      category: ['app'],
      format: {
        stripAnsi: false,
      },
    })

    console.log('\u001b[31mred\u001b[0m')
    restorePatch()

    const line = capturedOutput.map((l) => JSON.parse(l)).find((l) => l.message?.includes('red'))
    expect(line).toBeDefined()
    expect(line.message).toBe('\u001b[31mred\u001b[0m')
  })

  it('should restore original console methods after calling restore', () => {
    const originalLog = console.log

    const restorePatch = patchConsole({ category: ['app'] })
    expect(console.log).not.toBe(originalLog)

    restorePatch()
    expect(console.log).toBe(originalLog)
  })

  it('should not patch itself when LogTape writes to a console sink', async () => {
    const { written, restore } = await setupConsoleTest()

    const restorePatch = patchConsole({ category: ['app'] })

    console.log('hello')
    console.info('world')
    console.warn('careful')
    console.error('boom')

    restorePatch()
    restore() // restore original console and LogTape config

    // Each console.* call must produce exactly one LogTape record printed
    // once via the original console method — no recursion, no duplicates.
    expect(written).toHaveLength(4)

    const hello = written.find((w) => w.method === 'info' && String(w.args[0]).includes('hello'))
    expect(hello).toBeDefined()
    const helloRecord = JSON.parse(String(hello!.args[0]))
    expect(helloRecord.message).toBe('hello')
    expect(helloRecord.level).toBe('INFO')
    expect(helloRecord.logger).toBe('app.console')

    const careful = written.find((w) => w.method === 'warn')
    expect(JSON.parse(String(careful!.args[0])).level).toBe('WARN')

    const boom = written.find((w) => w.method === 'error')
    expect(JSON.parse(String(boom!.args[0])).level).toBe('ERROR')
  })

  it('should not re-log direct logger calls when console is patched', async () => {
    const { written, restore } = await setupConsoleTest()

    const restorePatch = patchConsole({ category: ['app'] })

    // A direct LogTape call must not be re-routed through the patched console
    // (which would mangle the record) nor recurse.
    const logger = getLogger(['app'])
    logger.info('direct message', { from: 'logger' })

    restorePatch()
    restore()

    expect(written).toHaveLength(1)
    const record = JSON.parse(String(written[0].args[0]))
    expect(record.message).toBe('direct message')
    expect(record.logger).toBe('app')
    expect(record.from).toBe('logger')
  })
})
