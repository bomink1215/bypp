/**
 * 메뉴 도메인 타입.
 *
 * `Menu`에 시간대(mealTimes) 필드가 없는 것은 누락이 아니라 결정이다.
 * "파스타는 야식인가"는 취향 논쟁이라 답이 없고, 임의로 라벨을 붙이면
 * 그 임의성이 그대로 사용자 선택지를 지운다. 시간대는 메뉴가 아니라
 * 업종(Cuisine)에 붙이고(`./hours.ts`), 그것도 하드 필터가 아닌 가중치로만 쓴다.
 * 자세한 근거는 CLAUDE.md의 설계 원칙 2 참조. 되살리지 말 것.
 */

/** 카카오 category_name 세분류에 대응되는 업종 단위. 영업시간 추정의 키이기도 하다. */
export type Cuisine =
  | 'korean-soup' // 국밥, 해장국, 설렁탕
  | 'korean-stew' // 김치찌개, 순두부, 부대찌개
  | 'korean-grill' // 삼겹살, 곱창, 갈비
  | 'korean-rice' // 백반, 비빔밥, 덮밥
  | 'chinese'
  | 'japanese'
  | 'western'
  | 'asian' // 쌀국수, 팟타이, 마라탕
  | 'snack' // 분식
  | 'chicken'
  | 'fastfood';

export type MeatKind = 'pork' | 'beef' | 'chicken' | 'seafood' | 'none';

export type Weight = 'light' | 'normal' | 'heavy';

export type Menu = {
  id: string;
  /** 추천 문구이자 카카오 키워드 검색어. 원칙 1에 따라 검색으로 가게가 잡히는 수준까지만. */
  name: string;
  cuisine: Cuisine;
  /** 카카오 category_name에서 매칭할 조각. 예: ['한식', '국밥'] */
  kakaoCategories: string[];
  spicy: 0 | 1 | 2 | 3;
  meat: MeatKind[];
  soup: boolean;
  weight: Weight;
};

/** 하루를 6개 구간으로. 업종별 영업 가능성 테이블의 키. */
export type Band =
  | 'dawn' // 00-05
  | 'morning' // 05-11
  | 'lunch' // 11-14
  | 'afternoon' // 14-17
  | 'dinner' // 17-21
  | 'latenight'; // 21-24

export type SpicyPreference = 'any' | 'none' | 'mild' | 'hot';
export type MeatPreference = 'any' | 'required' | 'none';
export type SoupPreference = 'any' | 'yes' | 'no';
export type WeightPreference = 'any' | 'light' | 'heavy';

export type MenuFilters = {
  spicy: SpicyPreference;
  meat: MeatPreference;
  soup: SoupPreference;
  weight: WeightPreference;
};

export const DEFAULT_FILTERS: MenuFilters = {
  spicy: 'any',
  meat: 'any',
  soup: 'any',
  weight: 'any',
};

/** 어떤 제약을 완화했는지 UI에 그대로 보여주기 위한 태그. 조용히 넓히지 않는다. */
export type Relaxation = 'radius' | 'spicy' | 'meat' | 'soup' | 'weight';

/** 서버가 클라이언트에 넘기는 후보 1건. 선호도는 여기 반영되지 않는다. */
export type Candidate = {
  menu: Menu;
  /** 시간대 가중치까지 반영된 기본 점수. 클라이언트가 여기에 선호도를 곱한다. */
  baseScore: number;
  /** 반경 안에서 이 메뉴의 업종으로 잡힌 가게 수. 후보 존재의 근거. */
  nearbyCount: number;
};

export type CandidatesResponse = {
  candidates: Candidate[];
  /** 실제로 사용된 반경(m). 완화되었을 수 있다. */
  radius: number;
  relaxed: Relaxation[];
};
