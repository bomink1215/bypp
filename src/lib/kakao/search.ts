import { kakaoFetch } from './client';
import { CATEGORY_FOOD, MAX_PAGE_SIZE, type KakaoPlace } from './types';

/** 카카오는 x=경도, y=위도다. 브라우저 Geolocation과 순서가 반대라 여기서 한 번만 뒤집는다. */
export type Coords = { lat: number; lng: number };

/** 캐시 적중을 위해 좌표를 소수점 3자리(≈110m)로 맞춘다. */
function roundCoord(n: number): string {
  return n.toFixed(3);
}

export type CategorySweep = {
  places: KakaoPlace[];
  /** 반경 안의 전체 음식점 수. 우리가 받은 것보다 클 수 있다. */
  totalCount: number;
  /** 반경 안을 전부 봤는가. false면 표본이라 "없다"는 판단에 쓰면 안 된다. */
  complete: boolean;
};

/**
 * 반경 안의 음식점을 훑는다. 주변 업종 분포를 파악하는 용도.
 *
 * **카카오는 검색당 최대 45건만 노출한다(`pageable_count` 상한).** 밀집 지역에서는
 * 이게 치명적이다. 강남역 반경 772m의 `total_count`는 1,428인데 노출은 45건이고,
 * `sort=distance`라 그 45건이 전부 반경 119m 안에 들어온다. 즉 772m를 훑은 게 아니라
 * 119m를 훑은 것이다. 이 표본으로 "근처에 국밥집이 없다"고 판단하면 143m에 있는
 * 국밥집을 놓친다 — 실제로 그렇게 놓쳤다.
 *
 * 그래서 `complete`를 함께 돌려준다. 전수를 본 경우에만 "없다"는 판단에 쓸 수 있다.
 * 밀집 지역의 존재 확인은 키워드 검색이 맡는다(질의가 결과를 미리 좁혀 45 상한에
 * 걸리지 않는다).
 *
 * 좌표를 반올림해 캐시 키를 뭉치고 1시간 캐시한다.
 * (이 프로젝트는 cacheComponents를 켜지 않았으므로 fetch 옵션 기반 캐싱이다.)
 */
export async function searchByCategory(
  coords: Coords,
  radius: number,
  pages = 3,
): Promise<CategorySweep> {
  const all: KakaoPlace[] = [];
  let totalCount = 0;

  for (let page = 1; page <= pages; page++) {
    const res = await kakaoFetch(
      'category',
      {
        category_group_code: CATEGORY_FOOD,
        x: roundCoord(coords.lng),
        y: roundCoord(coords.lat),
        radius,
        sort: 'distance',
        size: MAX_PAGE_SIZE,
        page,
      },
      { revalidate: 3600 },
    );

    if (page === 1) totalCount = res.meta.total_count;
    all.push(...res.documents);
    if (res.meta.is_end) break;
  }

  return { places: all, totalCount, complete: all.length >= totalCount };
}

export async function searchByKeyword(
  query: string,
  coords: Coords,
  radius: number,
): Promise<KakaoPlace[]> {
  const res = await kakaoFetch('keyword', {
    query,
    category_group_code: CATEGORY_FOOD,
    x: coords.lng,
    y: coords.lat,
    radius,
    sort: 'distance',
    size: MAX_PAGE_SIZE,
  });

  return res.documents;
}
