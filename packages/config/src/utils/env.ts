import { EnvOverrides } from '../types'
import { isPlainObject, setPath } from './object'

function interpolateValue(value: unknown): unknown {
  if (typeof value === 'string') {
    const match = value.match(/^\${([^}]+)}$/)
    if (!match) return value
    const varName = match[1].trim()
    const envValue = process.env[varName]
    return envValue !== undefined ? envValue : value
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolateValue(item))
  }

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = interpolateValue(val)
    }
    return result
  }

  return value
}

export function interpolateEnv(config: Record<string, unknown>): Record<string, unknown> {
  return interpolateValue(config) as Record<string, unknown>
}

export function applyEnvOverrides(
  config: Record<string, unknown>,
  env: Record<string, string | undefined>,
  overrides: EnvOverrides
): Record<string, unknown> {
  const result = { ...config }
  for (const [envKey, path] of Object.entries(overrides)) {
    const value = env[envKey]
    if (value !== undefined) setPath(result, path, value)
  }
  return result
}
