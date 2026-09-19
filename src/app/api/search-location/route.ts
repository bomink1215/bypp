import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { searchLocation, type LocationHit } from '@/lib/kakao/search';
import { BadRequestError } from '@/lib/params';

export type SearchLocationResponse = { results: LocationHit[] };

/**
 * 만날 곳 검색. 지도를 끌어서 찾기 불편하다는 피드백(특히 노트북)으로 붙였다.
 * 카카오 REST 키를 쓰므로 서버에서만 부른다.
 */
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
    if (q.length === 0) throw new BadRequestError('검색어를 입력해주세요.');
    if (q.length > 40) throw new BadRequestError('검색어가 너무 길어요.');

    const body: SearchLocationResponse = { results: await searchLocation(q) };
    return Response.json(body);
  } catch (e) {
    return toErrorResponse(e);
  }
}
