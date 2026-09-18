import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * 브라우저용 Supabase 클라이언트. 로그인과 내 프로필 읽기/쓰기에만 쓴다.
 *
 * **publishable 키는 노출되어도 되는 키다.** 권한이 낮고 RLS의 제약을 받는다.
 * 서버용 secret 키(`./client.ts`)와 헷갈리지 말 것 — 그쪽은 RLS를 통째로 우회한다.
 *
 * `@supabase/ssr`과 proxy(구 middleware)를 쓰지 않는 이유:
 * 우리가 로그인으로 하려는 건 "내 취향을 기기 간에 유지"뿐이고, 그 데이터는 RLS로 보호되어
 * 브라우저가 직접 다루면 된다. 서버가 세션을 알 필요가 없으니 세션 쿠키도, 토큰 갱신용
 * proxy도 필요 없다. Next 16 문서도 proxy는 "다른 방법이 없을 때의 최후 수단"이라고 못박는다.
 * 방 데이터는 익명 참가자 때문에 여전히 서버 라우트 + secret 키로 간다.
 */
let cached: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase 공개 설정이 없습니다. NEXT_PUBLIC_SUPABASE_* 를 확인하세요.');
  }

  cached = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // OAuth 리다이렉트로 돌아왔을 때 URL의 코드를 알아서 세션으로 바꿔준다.
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
  return cached;
}

/** 로그인 기능을 쓸 수 있는 환경인지. 키가 없으면 버튼 자체를 숨긴다. */
export function authAvailable(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
