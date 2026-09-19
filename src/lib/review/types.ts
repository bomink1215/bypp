/**
 * 후기(자체 평가)와 "나의 먹로그".
 *
 * 한 줄 = 한 끼. 가게에 별점을 주고 후기를 남기면 공개 평가 데이터가 되고, 동시에 내 먹로그에
 * 카드로 쌓인다. 친구와 같이 정한 한 끼면 함께한 사람의 이름이 카드에 남는다.
 */

/** 가게 스냅샷. 카카오 정보가 바뀌어도 내 기록은 그대로여야 해서 필요한 것만 복사해 둔다. */
export type ReviewPlace = {
  id: string;
  name: string;
  category: string;
  address: string;
  url: string;
};

/** DB 행 그대로. */
export type ReviewRow = {
  id: string;
  author_token: string;
  user_id: string | null;
  nickname: string | null;
  place_id: string;
  place_name: string;
  place_category: string | null;
  place_address: string | null;
  place_url: string | null;
  menu_id: string | null;
  rating: number;
  body: string | null;
  companions: string[];
  room_code: string | null;
  eaten_at: string;
  eaten_on: string;
  created_at: string;
};

/** 내 먹로그 카드. 본인에게만 내려간다 — 함께한 사람이 들어 있다. */
export type MyReview = {
  id: string;
  place: ReviewPlace;
  menuId: string | null;
  rating: number;
  body: string;
  companions: string[];
  fromRoom: boolean;
  eatenAt: string;
};

/**
 * 방문한 가게 — 골랐지만 아직 후기를 안 쓴 한 끼. 본인에게만 내려간다.
 * 후기를 쓰면 사라지고 같은 정보로 `MyReview` 카드가 생긴다.
 */
export type MyVisit = {
  id: string;
  place: ReviewPlace;
  menuId: string | null;
  companions: string[];
  fromRoom: boolean;
  eatenAt: string;
};

export type VisitRow = {
  id: string;
  author_token: string;
  user_id: string | null;
  place_id: string;
  place_name: string;
  place_category: string | null;
  place_address: string | null;
  place_url: string | null;
  menu_id: string | null;
  companions: string[];
  room_code: string | null;
  eaten_at: string;
  eaten_on: string;
  created_at: string;
};

/**
 * 가게 목록에 보이는 공개 후기.
 *
 * **함께한 사람, 작성자 토큰, 방 코드는 절대 넣지 않는다.** 이름은 작성자가 정한 닉네임뿐이다.
 */
export type PublicReview = {
  id: string;
  nickname: string;
  rating: number;
  body: string;
  eatenOn: string;
  /** 요청한 사람이 쓴 후기인가. 지우기 버튼을 띄우는 데만 쓴다. */
  mine: boolean;
};

export type RatingSummary = { average: number; count: number };

export type RatingsResponse = { ratings: Record<string, RatingSummary> };

/** 후기 본문 최대 길이. DB 제약과 같다. */
export const REVIEW_BODY_MAX = 300;
