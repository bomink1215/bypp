import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { authorFrom } from '@/lib/review/request';
import { listVisits } from '@/lib/review/service';

/** 내 방문한 가게(후기 대기). 함께한 사람이 들어 있어 본인 전용이고, 토큰을 주소에 싣지 않으려 POST로 받는다. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    return Response.json({ visits: await listVisits(await authorFrom(body)) });
  } catch (e) {
    return toErrorResponse(e);
  }
}
