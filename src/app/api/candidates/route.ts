import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { walkMinutesToRadius } from '@/lib/distance';
import { searchByCategory } from '@/lib/kakao/search';
import type { CandidatesResponse } from '@/lib/menu/types';
import { parseRestrictions } from '@/lib/menu/restrictions';
import { parseAt, parseFilters, requireCoords, requireWalkMinutes } from '@/lib/params';
import { deriveCandidates } from '@/lib/recommend';

/**
 * 반경 안에 실제로 있는 업종에서 메뉴 후보를 역산해 돌려준다.
 *
 * 최종 선택은 여기서 하지 않는다. 클라이언트가 로컬 취향 기록을 곱해서 뽑는다.
 * 그래서 취향 이력이 서버에 오지 않고, "다른거 추천해주세요"도 이 라우트를
 * 다시 부르지 않고 후보 목록을 재사용해 즉시 응답한다.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;

    const coords = requireCoords(sp);
    const walkMin = requireWalkMinutes(sp);
    const filters = parseFilters(sp);
    const at = parseAt(sp);
    const restrictions = parseRestrictions(sp.get('exclude'));

    const radius = walkMinutesToRadius(walkMin);
    const widened = walkMinutesToRadius(walkMin * 1.5);

    // 넓은 반경으로 한 번만 받아두고 distance로 잘라 쓴다. 반경 완화 때 재호출이 없다.
    const sweep = await searchByCategory(coords, widened);

    // 전수를 봤을 때만 "주변에 없다"로 후보를 걷어낼 수 있다. 밀집 지역에서 받은 목록은
    // 반경 전체가 아니라 가장 가까운 45곳의 표본이라, 그걸로 판정하면 멀쩡한 가게를 지운다.
    const derived = deriveCandidates({
      placesWide: sweep.places,
      requestedRadius: radius,
      widenedRadius: widened,
      filters,
      at,
      gate: sweep.complete,
      restrictions,
    });

    const body: CandidatesResponse = {
      candidates: derived.candidates,
      relaxed: derived.relaxed,
      radius: derived.radius,
    };
    return Response.json(body);
  } catch (e) {
    return toErrorResponse(e);
  }
}
