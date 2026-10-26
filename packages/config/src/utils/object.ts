export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  let current = target
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    if (!isPlainObject(current[key])) {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }
  current[parts[parts.length - 1]] = value
}
