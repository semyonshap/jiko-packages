import { readFileSync } from 'node:fs'
import type { ZodType } from 'zod'
import { interpolateEnv, applyEnvOverrides } from '../utils/env'
import { generateEnvOverrides } from '../utils/schema'
import { EnvOverrides } from '../types'

export function loadJsonConfig(path: string): Record<string, unknown> {
  try {
    const content = readFileSync(path, 'utf-8')
    return JSON.parse(content)
  } catch {
    return {}
  }
}

export interface LoadConfigOptions {
  path: string
  env?: Record<string, string | undefined>
  overrides?: EnvOverrides
}

export function loadConfig<T>(schema: ZodType<T>, options: LoadConfigOptions): T {
  const { path, env = process.env, overrides } = options
  const raw = loadJsonConfig(path)
  const interpolated = interpolateEnv(raw)
  const overridden = applyEnvOverrides(interpolated, env, overrides ?? generateEnvOverrides(schema))
  const parsed = schema.safeParse(overridden)
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid config at ${path}:\n${message}`)
  }
  return parsed.data
}
