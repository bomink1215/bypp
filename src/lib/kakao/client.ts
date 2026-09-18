import 'server-only';

import type { KakaoSearchResponse } from './types';

/**
 * 카카오 로컬 API 호출 래퍼.
 *
 * `server-only`를 import하는 이유: REST 키에는 카카오 콘솔의 도메인(Referer) 제한이
 * 걸리지 않는다. 브라우저로 새어나가면 누구나 우리 쿼터를 태울 수 있다.
 * 이 파일이 클라이언트 번들에 딸려 들어가면 **런타임이 아니라 빌드 때** 실패한다.
 *
 * axios를 쓰지 않는 이유는 CLAUDE.md 참조. 내장 fetch에 없는 두 가지를 여기서 메운다.
 *   - 4xx/5xx에서 throw하지 않음 → `res.ok` 검사
 *   - 타임아웃 없음 → `AbortSignal.timeout()`
 */
const BASE = 'https://dapi.kakao.com/v2/local/search';
const TIMEOUT_MS = 5000;

export class KakaoApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'KakaoApiError';
  }
}

type FetchOptions = {
  /** 초 단위. 생략하면 캐시하지 않는다. */
  revalidate?: number;
};

export async function kakaoFetch(
  path: 'category' | 'keyword',
  params: Record<string, string | number>,
  { revalidate }: FetchOptions = {},
): Promise<KakaoSearchResponse> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    throw new KakaoApiError(500, 'KAKAO_REST_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요.');
  }

  const url = new URL(`${BASE}/${path}.json`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...(revalidate === undefined ? { cache: 'no-store' as const } : { next: { revalidate } }),
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') {
      throw new KakaoApiError(504, '카카오 API 응답이 느립니다. 잠시 후 다시 시도해주세요.');
    }
    throw e;
  }

  if (!res.ok) {
    throw new KakaoApiError(res.status, `카카오 API ${res.status}`);
  }

  return res.json() as Promise<KakaoSearchResponse>;
}
