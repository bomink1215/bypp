import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { authorFrom } from '@/lib/review/request';
import { deleteVisit } from '@/lib/review/service';

/** 방문한 가게에서 빼기. 내 것만 지워진다. */
export async function DELETE(request: NextRequest, ctx: RouteContext<'/api/visits/[id]'>) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as Record<string, unknown>;
    await deleteVisit(id, await authorFrom(body));
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
