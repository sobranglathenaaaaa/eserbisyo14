import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/contracts';

export async function POST(request: NextRequest) {
  const response = ok({ loggedOut: true });
  const isProduction = process.env.NODE_ENV === 'production';

  response.cookies.set('x-user-id', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: 0,
  });
  response.cookies.set('x-user-role', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: 0,
  });
  response.cookies.set('sb-access-token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: 0,
  });

  return response;
}

