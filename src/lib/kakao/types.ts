/**
 * 카카오 로컬 API 응답 타입.
 *
 * 여기 있는 필드가 카카오가 주는 전부다. **영업시간·메뉴·평점은 제공되지 않는다.**
 * 장소 상세정보를 주는 API는 카카오에 없다(공식 답변). 이 목록에 없는 정보가
 * 필요해지면 데이터 출처 문제부터 해결해야 한다.
 */
export type KakaoPlace = {
  id: string;
  place_name: string;
  /** `음식점 > 한식 > 국밥` 형태의 세분류. 업종 판별의 유일한 단서다. */
  category_name: string;
  category_group_code: string;
  category_group_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  /** 경도(longitude). 위도가 아니다. */
  x: string;
  /** 위도(latitude). */
  y: string;
  place_url: string;
  /** 요청에 x,y를 넘겼을 때만 채워진다. 미터 단위 문자열. */
  distance: string;
};

export type KakaoMeta = {
  total_count: number;
  /** 노출 가능 문서 수. 최대 45. */
  pageable_count: number;
  is_end: boolean;
};

export type KakaoSearchResponse = {
  documents: KakaoPlace[];
  meta: KakaoMeta;
};

export type PlacesResponse = {
  places: KakaoPlace[];
};

/** 음식점 카테고리 그룹 코드. 카페는 CE7. */
export const CATEGORY_FOOD = 'FD6';

/** 한 페이지 최대 문서 수 (카카오 제한). */
export const MAX_PAGE_SIZE = 15;
