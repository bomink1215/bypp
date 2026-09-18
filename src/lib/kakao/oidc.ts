import 'server-only';

/**
 * 카카오 OpenID Connect 로그인.
 *
 * Supabase의 카카오 provider를 쓰지 않고 인가 요청을 직접 만드는 이유는 하나다.
 * **Supabase는 scope에 `account_email`을 하드코딩해서 보내고 우리가 뺄 수 없다.**
 * 그런데 `account_email`은 개인 개발자 앱에서 기본 제공되지 않아(비즈 앱 전환 + 승인 필요)
 * `KOE205`로 거절당한다. 우리는 이메일이 필요하지도 않다.
 *
 * 그래서 인가 URL을 직접 만들어 `openid profile_nickname`만 요청하고, 받은 `id_token`을
 * `supabase.auth.signInWithIdToken({ provider: 'kakao' })`에 넘긴다. 세션 관리는 여전히
 * Supabase가 한다 — 우리가 만드는 건 토큰을 가져오는 앞부분뿐이다.
 *
 * 카카오 콘솔에서 **OpenID Connect 활성화**가 켜져 있어야 `id_token`이 내려온다.
 */

const AUTHORIZE = 'https://kauth.kakao.com/oauth/authorize';
const TOKEN = 'https://kauth.kakao.com/oauth/token';

/** 콜백 경로. 카카오 콘솔의 Redirect URI에 origin까지 붙여 그대로 등록해야 한다. */
export const CALLBACK_PATH = '/api/auth/kakao/callback';

export class KakaoAuthError extends Error {}

function restKey(): string {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) throw new KakaoAuthError('KAKAO_REST_API_KEY가 없습니다.');
  return key;
}

export function buildAuthorizeUrl(origin: string, state: string): string {
  const url = new URL(AUTHORIZE);
  url.searchParams.set('client_id', restKey());
  url.searchParams.set('redirect_uri', origin + CALLBACK_PATH);
  url.searchParams.set('response_type', 'code');
  // openid가 있어야 id_token이 내려온다. 이메일은 요청하지 않는다.
  url.searchParams.set('scope', 'openid profile_nickname');
  url.searchParams.set('state', state);
  return url.toString();
}

/** 인가 코드를 id_token으로 바꾼다. client_secret이 필요하므로 반드시 서버에서만. */
export async function exchangeCodeForIdToken(code: string, origin: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: restKey(),
    redirect_uri: origin + CALLBACK_PATH,
    code,
  });

  // 새로 만든 REST 키는 클라이언트 시크릿이 켜진 상태로 추가된다. 켜져 있으면 필수다.
  const secret = process.env.KAKAO_CLIENT_SECRET;
  if (secret) body.set('client_secret', secret);

  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body,
    signal: AbortSignal.timeout(5000),
  });

  const data = (await res.json()) as { id_token?: string; error?: string; error_description?: string };

  if (!res.ok) {
    throw new KakaoAuthError(data.error_description ?? data.error ?? `카카오 토큰 요청 실패 (${res.status})`);
  }
  if (!data.id_token) {
    throw new KakaoAuthError(
      'id_token이 없습니다. 카카오 콘솔에서 OpenID Connect 활성화를 켰는지 확인하세요.',
    );
  }

  return data.id_token;
}
