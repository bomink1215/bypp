import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { requireCode, requireNickname, requireToken } from '@/lib/room/request';
import { joinRoom } from '@/lib/room/service';

export async function POST(request: NextRequest, ctx: RouteContext<'/api/rooms/[code]/join'>) {
  try {
    const { code } = await ctx.params;
    const payload = (await request.json()) as Record<string, unknown>;
    await joinRoom(requireCode(code), requireToken(payload), requireNickname(payload));
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
