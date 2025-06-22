import { NextResponse } from 'next/server';

export function middleware(request) {
  const ip = request.headers.get('x-forwarded-for') || '';
  console.log('Client IP:', ip);

  const allowed = ip.startsWith('2402:e280') || ip.startsWith('58.84'); // your café IPs

  if (!allowed) {
    return NextResponse.redirect(new URL('/wifi-required', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/table/:path*'],
};
