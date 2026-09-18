import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { requireCode, requireToken } from '@/lib/room/request';
import { castPlaceVote } from '@/lib/room/service';

export async function POST(request: NextRequest, ctx: RouteContext<'/api/rooms/[code]/place-vote'>) {
  try {
    const { code } = await ctx.params;
    const payload = (await request.json()) as Record<string, unknown>;
    await castPlaceVote(requireCode(code), requireToken(payload), String(payload.placeId ?? ''));
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
