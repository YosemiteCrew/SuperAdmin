import { NextRequest, NextResponse } from 'next/server';

function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('sAccessToken')?.value;
  const isAuthenticated = !!token && isTokenValid(token);

  const isPublicPath = pathname.startsWith('/auth') || pathname.startsWith('/api/');

  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  if (pathname === '/') {
    const destination = isAuthenticated ? '/dashboard' : '/auth';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (isAuthenticated && pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|json|txt|xml|css|js|map|woff|woff2|ttf|eot)).*)',
  ],
};
