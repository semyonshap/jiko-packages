import { NextResponse, type NextRequest } from 'next/server'

import { logger } from '@/lib/logger'

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/logger')) {
    logger.info('Middleware invoked', {
      method: request.method,
      path: request.nextUrl.pathname,
      search: request.nextUrl.search || undefined,
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
