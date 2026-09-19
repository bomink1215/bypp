import 'server-only';

/**
 * 브라우저가 보낸 Supabase 액세스 토큰이 진짜인지 Supabase에 물어 user id를 얻는다.
 *
 * 우리 서버는 로그인 세션을 들고 있지 않는다(CLAUDE.md: `@supabase/ssr`과 proxy를 쓰지 않는다).
 * 후기를 로그인한 계정에 묶을 때만 필요해서, 그때 한 번 토큰을 검증한다. 토큰을 우리가
 * 직접 해석하지 않고 Supabase에 되묻는 건 서명 검증을 직접 구현하지 않기 위해서다.
 *
 * 검증에 실패하면 null이다. 로그인은 선택이므로, 실패해도 게스트로 계속 동작해야 한다.
 */
export async function verifyAccessToken(accessToken: unknown): Promise<string | null> {
  if (typeof accessToken !== 'string' || accessToken.length < 20) return null;

  const url = process.env.SUPABASE_URL;
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !apikey) return null;

  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string };
    return typeof user.id === 'string' ? user.id : null;
  } catch {
    return null;
  }
}
