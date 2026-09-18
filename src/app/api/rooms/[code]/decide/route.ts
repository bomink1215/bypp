import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { requireCode, requireToken } from '@/lib/room/request';
import { decide } from '@/lib/room/service';

export async function POST(request: NextRequest, ctx: RouteContext<'/api/rooms/[code]/decide'>) {
  try {
    const { code } = await ctx.params;
    const payload = (await request.json()) as Record<string, unknown>;
    await decide(requireCode(code), requireToken(payload));
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
