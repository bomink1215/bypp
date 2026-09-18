import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { coordToAddress } from '@/lib/kakao/search';
import { requireCoords } from '@/lib/params';

export type GeocodeResponse = {
  /** 건물명 > 도로명 > 지번 순으로 가장 알아보기 쉬운 것. 못 찾으면 null. */
  label: string | null;
};

/** 지도에서 찍은 좌표가 어디인지 알려준다. 카카오 REST 키를 쓰므로 서버에서만 돈다. */
export async function GET(request: NextRequest) {
  try {
    const coords = requireCoords(request.nextUrl.searchParams);
    const body: GeocodeResponse = { label: await coordToAddress(coords) };
    return Response.json(body);
  } catch (e) {
    return toErrorResponse(e);
  }
}
