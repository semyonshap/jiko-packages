export type ConsoleMethod = 'log' | 'info' | 'debug' | 'warn' | 'error' | 'trace'

export const CONSOLE_METHODS: readonly ConsoleMethod[] = [
  'log',
  'info',
  'debug',
  'warn',
  'error',
  'trace',
]

export type ConsoleState = Record<ConsoleMethod, unknown>

/** Snapshot the current `console.*` methods so they can be restored later. */
export function captureConsoleState(): ConsoleState {
  return Object.fromEntries(
    CONSOLE_METHODS.map((method) => [method, console[method]]),
  ) as ConsoleState
}

/** Restore `console.*` methods from a snapshot taken by `captureConsoleState`. */
export function restoreConsoleState(state: ConsoleState): void {
  const target = console as unknown as Record<string, unknown>
  for (const method of CONSOLE_METHODS) {
    target[method] = state[method]
  }
}
