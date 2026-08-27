import { NextResponse, type NextRequest } from 'next/server'

import { patchConsoleEdge } from '@with-jiko/next-logger-logtape/edge'
import { emitLog } from '@/lib/utils'
import type { LogLevel, Transport } from '@/types'

// Patch console inside the middleware (Edge) bundle so that console.* arguments
// are captured BEFORE the Edge runtime flattens them into a single string.
patchConsoleEdge()

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isServerAction = Boolean(request.headers.get('next-action'))

  if (pathname === '/logger' && request.method === 'POST' && !isServerAction) {
    let body: { transport?: string; level?: string; message?: string; context?: string } = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const transport: Transport = body.transport === 'logger' ? 'logger' : 'console'
    const level = (body.level ?? 'info') as LogLevel
    const message = body.message ?? ''
    const context = body.context || undefined
    emitLog(transport, level, message, {
      from: 'middleware',
      context,
      transport,
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
