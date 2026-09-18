import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { walkMinutesToRadius } from '@/lib/distance';
import { filterRelevant } from '@/lib/kakao/relevance';
import { searchByKeyword } from '@/lib/kakao/search';
import type { PlacesResponse } from '@/lib/kakao/types';
import { MENU_BY_ID } from '@/lib/menu/seed';
import { BadRequestError, requireCoords, requireWalkMinutes } from '@/lib/params';

/**
 * 확정된 메뉴를 파는 가게를 찾는다.
 *
 * 카카오 키워드 검색은 느슨해서 그 메뉴를 안 파는 가게도 섞어 준다. `filterRelevant`로
 * 업종이나 상호가 맞는 것만 남기고, 그 결과가 0건이면 그대로 0건을 돌려준다.
 * 그러면 클라이언트가 다음 후보로 넘어가므로 사용자에게는 안 보인다.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;

    const menuId = sp.get('menuId')?.trim();
    if (!menuId) throw new BadRequestError('menuId가 필요합니다.');

    const menu = MENU_BY_ID.get(menuId);
    if (!menu) throw new BadRequestError(`알 수 없는 메뉴입니다: ${menuId}`);

    const coords = requireCoords(sp);
    const walkMin = requireWalkMinutes(sp);

    const found = await searchByKeyword(menu.name, coords, walkMinutesToRadius(walkMin));

    const body: PlacesResponse = { places: filterRelevant(found, menu) };
    return Response.json(body);
  } catch (e) {
    return toErrorResponse(e);
  }
}
