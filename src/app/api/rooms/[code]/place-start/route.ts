import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { requireCode, requireToken } from '@/lib/room/request';
import { startPlaceVoting } from '@/lib/room/service';

/** "가게도 정할까요?" — 메뉴가 정해진 방에서 가게 투표를 연다. */
export async function POST(request: NextRequest, ctx: RouteContext<'/api/rooms/[code]/place-start'>) {
  try {
    const { code } = await ctx.params;
    const payload = (await request.json()) as Record<string, unknown>;
    await startPlaceVoting(requireCode(code), requireToken(payload));
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
