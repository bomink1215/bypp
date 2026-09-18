import { NextResponse, type NextRequest } from 'next/server';

import { exchangeCodeForIdToken } from '@/lib/kakao/oidc';

const STATE_COOKIE = 'kakao_oauth_state';
const NEXT_COOKIE = 'kakao_oauth_next';

/**
 * 카카오가 돌려준 인가 코드를 id_token으로 바꿔 앱으로 넘긴다.
 *
 * id_token은 **URL 프래그먼트(#)로** 전달한다. 프래그먼트는 서버로 전송되지 않아
 * 로그·리퍼러에 남지 않는다. 브라우저의 `useAuth`가 이걸 주워서 Supabase 세션으로 바꾼다.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const params = request.nextUrl.searchParams;

  const next = request.cookies.get(NEXT_COOKIE)?.value ?? '/';
  const fail = (reason: string) => {
    const url = new URL(next, origin);
    url.searchParams.set('login_error', reason);
    return NextResponse.redirect(url);
  };

  const error = params.get('error');
  if (error) return fail(params.get('error_description') ?? error);

  const code = params.get('code');
  const state = params.get('state');
  const expected = request.cookies.get(STATE_COOKIE)?.value;

  if (!code) return fail('인가 코드가 없어요.');
  if (!state || !expected || state !== expected) {
    return fail('로그인 요청이 만료됐어요. 다시 시도해주세요.');
  }

  let idToken: string;
  try {
    idToken = await exchangeCodeForIdToken(code, origin);
  } catch (e) {
    console.error(e);
    return fail(e instanceof Error ? e.message : '카카오 로그인에 실패했어요.');
  }

  const target = new URL(next, origin);
  target.hash = `kakao_id_token=${encodeURIComponent(idToken)}`;

  const res = NextResponse.redirect(target);
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(NEXT_COOKIE);
  return res;
}
