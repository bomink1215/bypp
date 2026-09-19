import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { authorFrom } from '@/lib/review/request';
import { deleteReview } from '@/lib/review/service';

/** 내 후기 지우기. 남의 것은 조건에 걸리지 않아 지워지지 않는다. */
export async function DELETE(request: NextRequest, ctx: RouteContext<'/api/reviews/[id]'>) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as Record<string, unknown>;
    await deleteReview(id, await authorFrom(body));
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
