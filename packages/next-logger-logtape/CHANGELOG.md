# @with-jiko/next-logger-logtape

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
