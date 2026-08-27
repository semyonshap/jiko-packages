export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@/lib/logger')
    const { patchNextLogger } = await import('@with-jiko/next-logger-logtape')
    patchNextLogger({ debug: true })
    console.log('[instrumentation] logger patched')
  }
}
