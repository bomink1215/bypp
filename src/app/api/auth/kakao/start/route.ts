import { NextResponse, type NextRequest } from 'next/server';

import { buildAuthorizeUrl } from '@/lib/kakao/oidc';

const STATE_COOKIE = 'kakao_oauth_state';
const NEXT_COOKIE = 'kakao_oauth_next';

/**
 * 카카오 인가 화면으로 보낸다.
 *
 * `state`는 CSRF 방어다. 쿠키에 심어두고 콜백에서 대조해, 우리가 시작하지 않은 콜백을
 * 걸러낸다. 돌아갈 주소도 같이 저장한다 — URL에 실어 보내면 조작될 수 있다.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const state = crypto.randomUUID();

  const next = request.nextUrl.searchParams.get('next') ?? '/';
  // 같은 사이트 안으로만 돌아간다. 외부 주소가 오면 홈으로.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  const res = NextResponse.redirect(buildAuthorizeUrl(origin, state));
  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: origin.startsWith('https://'),
    path: '/',
    maxAge: 600, // 10분. 로그인 한 번에 충분하다.
  };
  res.cookies.set(STATE_COOKIE, state, options);
  res.cookies.set(NEXT_COOKIE, safeNext, options);
  return res;
}
