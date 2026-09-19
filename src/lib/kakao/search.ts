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
      'search/category',
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
  const res = await kakaoFetch('search/keyword', {
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

/** 위치 검색 결과 한 건. 지도 이동에 필요한 것만 추린다. */
export type LocationHit = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

/**
 * 장소 이름 → 좌표. "강남역", "코엑스"처럼 **만날 곳**을 찾는 용도다.
 *
 * 음식점 검색(`searchByKeyword`)과 달리 업종을 걸지 않는다. 역·건물·동네 이름이 필요하기 때문이다.
 * 좌표도 넘기지 않는다 — 지금 지도가 보는 곳과 먼 곳을 찾으려는 경우가 많고, 카카오의 정확도순이
 * "강남역"을 치면 강남역을 맨 위에 준다.
 */
export async function searchLocation(query: string): Promise<LocationHit[]> {
  const res = await kakaoFetch(
    'search/keyword',
    { query, size: 5 },
    // 장소 이름 → 좌표는 거의 안 바뀐다. 같은 검색어를 하루 동안 재사용해 쿼터를 아낀다.
    { revalidate: 86_400 },
  );

  return res.documents.map((d) => ({
    name: d.place_name,
    address: d.road_address_name || d.address_name,
    // 카카오 x는 경도, y는 위도다.
    lat: Number(d.y),
    lng: Number(d.x),
  }));
}

/** 좌표 → 주소. 지도에서 찍은 지점이 어디인지 사람이 읽을 수 있게 한다. */
export async function coordToAddress(coords: Coords): Promise<string | null> {
  const res = await kakaoFetch<{
    documents: {
      road_address: { address_name: string; building_name: string } | null;
      address: { address_name: string } | null;
    }[];
  }>(
    'geo/coord2address',
    { x: coords.lng, y: coords.lat },
    { revalidate: 86_400 }, // 주소는 거의 안 바뀐다
  );

  const doc = res.documents[0];
  if (!doc) return null;

  // 건물명이 있으면 그게 가장 알아보기 쉽다. 없으면 도로명, 그것도 없으면 지번.
  return (
    doc.road_address?.building_name ||
    doc.road_address?.address_name ||
    doc.address?.address_name ||
    null
  );
}
