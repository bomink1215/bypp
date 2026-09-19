import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { requireReviewToken, reviewsForPlace } from '@/lib/review/service';

/**
 * 한 가게의 공개 후기. `?token=`을 주면 내가 쓴 것에 표시가 붙는다(지우기 버튼용).
 * 토큰이 없거나 이상해도 후기는 보여준다 — 보는 데 신원은 필요 없다.
 */
export async function GET(request: NextRequest, ctx: RouteContext<'/api/reviews/place/[placeId]'>) {
  try {
    const { placeId } = await ctx.params;
    let author = null;
    try {
      author = { token: requireReviewToken(request.nextUrl.searchParams.get('token')), userId: null };
    } catch {
      author = null;
    }
    return Response.json({ reviews: await reviewsForPlace(placeId, author) });
  } catch (e) {
    return toErrorResponse(e);
  }
}
