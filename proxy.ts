import { NextRequest, NextResponse } from 'next/server';

const STATIC_ASSET_REGEX = /\.(.*)$/;
const APP_PROTECTED_PREFIXES = ['/admin', '/staff', '/resident'];
const PUBLIC_PATHS = ['/', '/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];
const PUBLIC_API_PREFIXES = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/verify',
  '/api/v1/auth/resend-verification',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/logout',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml') ||
    STATIC_ASSET_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  const userId = request.cookies.get('x-user-id')?.value;
  const role = request.cookies.get('x-user-role')?.value;
  const tenantId = request.cookies.get('x-tenant-id')?.value ?? 'default';
  const hasAuthHeader = Boolean(request.headers.get('authorization'));
  const hasSessionCookie = Boolean(request.cookies.get('sb-access-token')?.value);
  const isAuthenticated = hasSessionCookie;

  const isPublicApi = PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (pathname.startsWith('/api/v1') && !isPublicApi && !hasAuthHeader && !hasSessionCookie) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'AUTH_UNAUTHORIZED', message: 'Authentication required' },
      },
      { status: 401 }
    );
  }

  const isProtectedPage = APP_PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isPublicPage = PUBLIC_PATHS.includes(pathname);
  if (isProtectedPage && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  if (isPublicPage && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = role === 'admin' ? '/admin/dashboard' : role === 'staff' ? '/staff/dashboard' : '/resident/dashboard';
    return NextResponse.redirect(url);
  }

  const headers = new Headers(request.headers);
  if (userId) headers.set('x-user-id', userId);
  if (role) headers.set('x-user-role', role);
  if (tenantId) headers.set('x-tenant-id', tenantId);

  return NextResponse.next({
    request: {
      headers,
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
