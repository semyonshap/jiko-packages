# @with-jiko/next-logger-logtape

## 1.1.4

### Patch Changes

- refactor: remove Edge-specific patch and dispatch context
  feat: add isLogTapeJsonLine to detect internal logtape console writes
  feat: add createRawConsoleProxy for safe original console access in sink
  refactor: simplify logAt by removing dispatchContext wrapper
  fix: improve filtering of undefined and null values in message formatting
  chore: remove patchConsoleEdge and storeRawConsole exports

## 1.1.3

### Patch Changes

- 9940d75: feat: add separate entry points for console and node modules

## 1.1.2

### Patch Changes

- feat: add format option object to consolidate stripAnsi and replaceNewlines
  feat: filter out undefined values from log message arguments
  fix: prevent "undefined" string from appearing in log messages
  test: add concurrency test for AsyncLocalStorage dispatch context
  test: add regression test for console.log(undefined) handling
  refactor: pass format options object instead of separate flags
  refactor: simplify template building by always using format(...primitives)

## 1.1.1

### Patch Changes

- feat: add replaceNewlines option to sanitize log messages
  feat: implement AsyncLocalStorage-based dispatch context to prevent infinite recursion
  feat: add guardLoggerDispatch to wrap logger methods
  fix: skip patched console redirect when dispatching
  refactor: simplify message formatting and properties extraction
  refactor: flatten structured objects into properties instead of arg0
  test: add integration tests for recursion prevention and direct logger calls
  test: refactor tests to use shared setupConsoleTest utility
  test: update tests to expect flattened properties

## 1.1.0

### Minor Changes

- 771e2b0: feat: preserve objects as structured `argN` properties in JSON logs (instead of collapsing to strings)
  feat: support custom categories in `setupLogTape` test utility
  refactor: simplify argument processing – use direct `{argN}` placeholders, remove token-based approach
  refactor: use `process.cwd()` for `createRequire` to improve monorepo compatibility
  test: add full integration tests for `patchConsole`, `patchNextLogging`, and `patchNextLogger`
  test: add demo test (`pnpm test:demo`) for visual JSON output inspection
  test: add `captureConsoleState` / `restoreConsoleState` utilities for console state management
  test: add `loadNextLog` / `clearNextLogCache` helpers for Next.js log module isolation
  fix: set `reset: true` in LogTape configuration to avoid "Already configured" errors
  chore: add `test:integrations` and `test:demo` npm scripts
  chore: configure `@` alias for imports in tests and TypeScript
  chore: update Vitest config with `fileURLToPath` for ESM compatibility

## 1.0.0

- Initial release.
- `patchConsole` / `patchNextLogging` / `patchNextLogger` to route Next.js and console output through a LogTape logger.
