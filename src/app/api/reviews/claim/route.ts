import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { BadRequestError } from '@/lib/params';
import { authorFrom } from '@/lib/review/request';
import { claimReviews } from '@/lib/review/service';

/** 로그인 직후, 이 브라우저에서 게스트로 쓴 후기를 계정에 묶는다. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const author = await authorFrom(body);
    if (!author.userId) throw new BadRequestError('로그인 정보를 확인하지 못했어요.');
    await claimReviews(author.token, author.userId);
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
