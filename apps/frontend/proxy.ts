import { NextRequest, NextResponse } from 'next/server'

// '/' is the public landing page — always accessible without auth
const PUBLIC_PATHS = ['/', '/login', '/onboarding']

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  const token = req.cookies.get('crossmint-jwt')?.value

  if (!isPublic && !token) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  // Already logged in, send directly to the app instead of showing login
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/app', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
}
