import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { authorFrom } from '@/lib/review/request';
import { createReview, ratingsFor } from '@/lib/review/service';
import type { RatingsResponse } from '@/lib/review/types';

/** 후기 쓰기. 로그인 없이도 된다(브라우저 토큰이 작성자). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const author = await authorFrom(body);
    await createReview(author, {
      nickname: body.nickname,
      place: body.place,
      menuId: body.menuId,
      rating: body.rating,
      body: body.body,
      roomCode: body.roomCode,
      visitId: body.visitId,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}

/** 가게 목록에 붙일 별점 요약. `?placeIds=1,2,3` */
export async function GET(request: NextRequest) {
  try {
    const ids = (request.nextUrl.searchParams.get('placeIds') ?? '').split(',').filter(Boolean);
    const res: RatingsResponse = { ratings: await ratingsFor(ids) };
    return Response.json(res);
  } catch (e) {
    return toErrorResponse(e);
  }
}
