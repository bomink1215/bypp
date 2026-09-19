import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { authorFrom } from '@/lib/review/request';
import { createVisit } from '@/lib/review/service';

/** "여기로 정했어요" — 고른 가게를 먹로그의 방문한 가게에 담는다. 같은 날 두 번 눌러도 하나만 남는다. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    await createVisit(await authorFrom(body), {
      place: body.place,
      menuId: body.menuId,
      roomCode: body.roomCode,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
