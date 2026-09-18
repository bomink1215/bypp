import { KakaoApiError } from './kakao/client';
import { BadRequestError } from './params';

/** 라우트 핸들러 공통 에러 변환. route.ts는 HTTP 메서드만 export할 수 있어 여기 둔다. */
export function toErrorResponse(e: unknown): Response {
  if (e instanceof BadRequestError) {
    return Response.json({ error: e.message }, { status: 400 });
  }
  if (e instanceof KakaoApiError) {
    return Response.json({ error: e.message }, { status: e.status });
  }

  console.error(e);
  return Response.json({ error: '알 수 없는 오류가 발생했습니다.' }, { status: 500 });
}
