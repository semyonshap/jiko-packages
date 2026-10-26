import type { ZodType } from 'zod'
import type { EnvOverrides } from '../types'

interface ZodDef {
  typeName?: string
  innerType?: ZodType
  pipe?: ZodType[]
}

function unwrapEffects(schema: ZodType): ZodType {
  let current = schema
  const seen = new Set<ZodType>()
  while (!seen.has(current)) {
    seen.add(current)
    const def = current.def as ZodDef
    const typeName = def.typeName
    if (
      (typeName === 'ZodDefault' ||
        typeName === 'ZodEffects' ||
        typeName === 'ZodOptional' ||
        typeName === 'ZodNullable' ||
        typeName === 'ZodReadonly' ||
        typeName === 'ZodLazy') &&
      def.innerType
    ) {
      current = def.innerType
      continue
    }
    if (typeName === 'ZodPipe' && def.pipe && def.pipe.length > 0) {
      current = def.pipe[0]
      continue
    }
    break
  }
  return current
}

function getObjectShape(schema: ZodType): Record<string, ZodType> | null {
  const unwrapped = unwrapEffects(schema)
  if ((unwrapped.def as ZodDef).typeName !== 'ZodObject') return null
  return (unwrapped as unknown as { shape: Record<string, ZodType> }).shape ?? null
}

export function toEnvName(path: string): string {
  return path
    .split('.')
    .map((part) => part.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase())
    .join('_')
}

export function generateEnvOverrides(schema: ZodType): EnvOverrides {
  const out: EnvOverrides = {}
  collectEnvOverrides(schema, '', out)
  return out
}

function collectEnvOverrides(schema: ZodType, prefixPath: string, out: EnvOverrides): void {
  const shape = getObjectShape(schema)
  if (!shape) return
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const path = prefixPath ? `${prefixPath}.${key}` : key
    const def = unwrapEffects(fieldSchema).def as ZodDef
    const typeName = def.typeName
    if (typeName === 'ZodObject') {
      collectEnvOverrides(fieldSchema, path, out)
    } else if (
      typeName === 'ZodArray' ||
      typeName === 'ZodRecord' ||
      typeName === 'ZodMap' ||
      typeName === 'ZodSet'
    ) {
      continue
    } else {
      out[toEnvName(path)] = path
    }
  }
}

export type { EnvOverrides }
