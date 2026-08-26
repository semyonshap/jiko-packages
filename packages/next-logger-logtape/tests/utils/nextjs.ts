import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export function clearNextLogCache(): void {
  const logPath = require.resolve('next/dist/build/output/log')
  delete require.cache[logPath]
}

export function loadNextLog(): Record<string, (...args: unknown[]) => void> {
  return require('next/dist/build/output/log')
}
