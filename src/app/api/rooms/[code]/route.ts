import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { requireCode } from '@/lib/room/request';
import { getRoomState } from '@/lib/room/service';

/** 3초마다 불리는 폴링 엔드포인트. 토큰은 쿼리로 받아 "나"를 식별한다. */
export async function GET(request: NextRequest, ctx: RouteContext<'/api/rooms/[code]'>) {
  try {
    const { code } = await ctx.params;
    const token = request.nextUrl.searchParams.get('token') ?? '';
    return Response.json(await getRoomState(requireCode(code), token));
  } catch (e) {
    return toErrorResponse(e);
  }
}
