import 'server-only';

/**
 * Supabase REST(PostgREST) 얇은 래퍼.
 *
 * `@supabase/supabase-js`를 쓰지 않는 이유는 카카오에서 axios를 안 쓴 것과 같다 —
 * 우리가 필요한 건 서버에서의 CRUD 몇 개뿐이고, 내장 fetch로 충분하다.
 * (로그인이 붙으면 그때는 `@supabase/ssr`이 필요해진다. 세션 쿠키 처리는 직접 할 일이 아니다.)
 *
 * `server-only`를 import하는 이유: secret 키는 **RLS를 통째로 우회한다.** 브라우저로
 * 새어나가면 모든 방과 참가자를 읽고 쓸 수 있다. 카카오 REST 키보다 더 위험하다.
 */
const TIMEOUT_MS = 5000;

export class SupabaseError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new SupabaseError(500, 'SUPABASE_URL / SUPABASE_SECRET_KEY가 설정되지 않았습니다.');
  }
  return { url, key };
}

type QueryOptions = {
  /** PostgREST 쿼리 문자열. 예: { select: '*', code: 'eq.ABC123' } */
  params?: Record<string, string>;
  /** 반환 형태. 'representation'이면 쓴 행을 돌려준다. */
  prefer?: string;
};

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  table: string,
  body: unknown,
  { params, prefer }: QueryOptions = {},
): Promise<T> {
  const { url, key } = config();

  const target = new URL(`${url}/rest/v1/${table}`);
  for (const [k, v] of Object.entries(params ?? {})) target.searchParams.set(k, v);

  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;

  let res: Response;
  try {
    res = await fetch(target, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store', // 방 상태는 매번 최신이어야 한다
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') {
      throw new SupabaseError(504, '데이터베이스 응답이 느립니다. 잠시 후 다시 시도해주세요.');
    }
    throw e;
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new SupabaseError(res.status, `Supabase ${res.status}: ${detail.slice(0, 200)}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const db = {
  select: <T>(table: string, params: Record<string, string>) =>
    request<T[]>('GET', table, undefined, { params }),

  insert: <T>(table: string, row: unknown) =>
    request<T[]>('POST', table, row, { prefer: 'return=representation' }),

  /** 있으면 갱신, 없으면 삽입. PK 충돌 시 병합한다. */
  upsert: <T>(table: string, row: unknown) =>
    request<T[]>('POST', table, row, {
      prefer: 'resolution=merge-duplicates,return=representation',
    }),

  update: <T>(table: string, params: Record<string, string>, patch: unknown) =>
    request<T[]>('PATCH', table, patch, { params, prefer: 'return=representation' }),

  remove: (table: string, params: Record<string, string>) =>
    request<void>('DELETE', table, undefined, { params }),
};
