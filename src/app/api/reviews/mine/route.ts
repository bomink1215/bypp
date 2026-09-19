import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { authorFrom } from '@/lib/review/request';
import { listMine } from '@/lib/review/service';

/**
 * 내 먹로그. 함께한 사람까지 들어 있는 본인 전용 응답이다.
 * 토큰을 주소창(GET 쿼리)에 싣지 않으려고 POST로 받는다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    return Response.json({ reviews: await listMine(await authorFrom(body)) });
  } catch (e) {
    return toErrorResponse(e);
  }
}
