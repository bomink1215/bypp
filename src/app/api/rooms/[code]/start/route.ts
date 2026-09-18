import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { requireCode, requireToken } from '@/lib/room/request';
import { startVoting } from '@/lib/room/service';

export async function POST(request: NextRequest, ctx: RouteContext<'/api/rooms/[code]/start'>) {
  try {
    const { code } = await ctx.params;
    const payload = (await request.json()) as Record<string, unknown>;
    await startVoting(requireCode(code), requireToken(payload));
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
