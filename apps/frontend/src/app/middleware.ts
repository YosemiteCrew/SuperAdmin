import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  if (!token && request.nextUrl.pathname.startsWith('/Pages/AdminDashboard')) {
    return NextResponse.redirect(new URL('/Auth/Login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/Pages/AdminDashboard/:path*'],
};
