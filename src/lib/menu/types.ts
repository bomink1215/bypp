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

/** 고기 종류. 양고기처럼 셋 어디에도 안 드는 고기는 meat만 true다. */
export type MeatKind = 'pork' | 'beef' | 'chicken';

/**
 * 1인 기준 보통 가격대. 메뉴에 붙이는 추정이지 가게 가격이 아니다 — 카카오는 가격을 주지
 * 않는다(원칙 1). 격식과 같은 방식이라 화면에서도 "가게마다 다를 수 있다"고 안내한다.
 *   low ~1만원 / mid 1~2만원 / high 2만원~
 */
export type PriceBand = 'low' | 'mid' | 'high';

/**
 * 무엇으로 배를 채우나. "밥 먹을까, 면 먹을까"는 메뉴를 고를 때 가장 먼저 하는 고민이라 축으로 둔다.
 * 조리 방식(구이·튀김…)으로 나누는 안도 봤지만 튀김·찜이 3개씩이라 거의 메뉴를 직접 고르는
 * 셈이 되고 어디에도 안 드는 메뉴가 8개였다. 이쪽은 20 / 12 / 19로 고르게 나뉜다.
 *   rice 밥이 주식 / noodle 면(수제비·쌀국수 포함) / other 고기·요리·빵·떡 위주
 */
export type Staple = 'rice' | 'noodle' | 'other';

export type Weight = 'light' | 'normal' | 'heavy';

/** 0~3 눈금. 맛 슬라이더 세 축이 공유한다. */
export type Level = 0 | 1 | 2 | 3;

export type Menu = {
  id: string;
  /** 추천 문구이자 카카오 키워드 검색어. 원칙 1에 따라 검색으로 가게가 잡히는 수준까지만. */
  name: string;
  cuisine: Cuisine;
  /** 카카오 category_name에서 매칭할 조각. 예: ['한식', '국밥'] */
  kakaoCategories: string[];

  // ── 맛 (양극단 사이의 위치) ──
  /** 0 순함 ~ 3 매움 */
  spicy: Level;
  /** 0 담백함 ~ 3 느끼함 */
  richness: Level;
  /** 0 시원함 ~ 3 뜨끈함 */
  temperature: Level;

  // ── 식재료 ──
  /** 육류 포함 여부(돼지·소·닭·양 등 전부). 해물은 별도 축이다. */
  meat: boolean;
  /**
   * 고기 종류. 그 메뉴의 대표 구성 기준이다. 곱창(소곱창·돼지막창)처럼 둘 다 흔하면 둘 다 true.
   * 셋 중 하나라도 true면 meat도 true여야 한다(verify-seed가 검사).
   */
  pork: boolean;
  beef: boolean;
  chicken: boolean;
  seafood: boolean;
  /** 면·빵·튀김옷 등 밀가루. 쌀국수처럼 쌀로 만든 면은 false. */
  flour: boolean;
  /** 대표 구성에 달걀이 들어가는가(라멘의 반숙란, 비빔밥의 프라이, 돈까스 튀김옷). */
  egg: boolean;
  /** 치즈·버터·크림·우유. 피자·크림 파스타·리조또 같은 것. */
  dairy: boolean;

  staple: Staple;

  // ── 기타 ──
  soup: boolean;
  /** 혼자 먹기 괜찮은가. 삼겹살·족발처럼 2인분부터인 것은 false. */
  solo: boolean;
  /** 빨리 먹고 나올 수 있는가. 굽거나 끓여 먹는 것은 false. */
  quick: boolean;
  /**
   * 격식 있는 자리(윗사람 대접, 상견례, 접대)에 내놓을 만한 메뉴인가.
   * **메뉴에 대한 판단이지 가게에 대한 보증이 아니다** — 카카오는 가게 분위기를 알려주지
   * 않는다(원칙 1). 그래서 화면에서도 가게 분위기는 카카오맵에서 확인하라고 안내한다.
   */
  formal: boolean;

  price: PriceBand;

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

/**
 * 맛 슬라이더의 값. `null`이면 상관없음.
 *
 * 하드 필터가 아니라 목표값이다. 목표에서 멀수록 급격히 불리해지지만 0이 되지는
 * 않는다(원칙 3). 슬라이더를 "매움" 끝에 두면 순한 메뉴가 사실상 안 나오되,
 * 우리가 매운맛을 잘못 매긴 메뉴가 영영 묻히지는 않는다.
 */
export type Taste = Level | null;

/** 식재료·기타처럼 있음/없음이 분명한 축. 이쪽은 하드 필터다. */
export type Toggle = 'any' | 'yes' | 'no';

export type MenuFilters = {
  // 맛 — 소프트
  spicy: Taste;
  richness: Taste;
  temperature: Taste;
  // 식재료 — 하드
  meat: Toggle;
  seafood: Toggle;
  flour: Toggle;
  /** 고기 종류 고르기. 'any'가 아니면 그 고기가 들어간 메뉴만. 고기 '없음'과는 같이 걸리지 않는다. */
  meatKind: 'any' | MeatKind;
  egg: Toggle;
  dairy: Toggle;
  // 밥·면 — 하드
  staple: 'any' | Staple;
  // 양 — 하드
  weight: 'any' | 'light' | 'heavy';
  // 가격대 — 하드
  price: 'any' | PriceBand;
  // 기타 — 하드
  soup: Toggle;
  solo: Toggle;
  quick: Toggle;
  formal: Toggle;
};

export const DEFAULT_FILTERS: MenuFilters = {
  spicy: null,
  richness: null,
  temperature: null,
  meat: 'any',
  seafood: 'any',
  flour: 'any',
  staple: 'any',
  meatKind: 'any',
  egg: 'any',
  dairy: 'any',
  weight: 'any',
  price: 'any',
  soup: 'any',
  solo: 'any',
  quick: 'any',
  formal: 'any',
};

/** 어떤 제약을 완화했는지 UI에 그대로 보여주기 위한 태그. 조용히 넓히지 않는다. */
export type Relaxation =
  | 'radius'
  | 'meat'
  | 'seafood'
  | 'flour'
  | 'meatKind'
  | 'staple'
  | 'egg'
  | 'dairy'
  | 'price'
  | 'weight'
  | 'soup'
  | 'solo'
  | 'quick'
  | 'formal';

/** 서버가 클라이언트에 넘기는 후보 1건. 선호도는 여기 반영되지 않는다. */
export type Candidate = {
  menu: Menu;
  /** 시간대 가중치와 맛 적합도까지 반영된 기본 점수. 클라이언트가 여기에 선호도를 곱한다. */
  baseScore: number;
  /** 반경 안에서 이 메뉴의 업종으로 잡힌 가게 수. 표본일 때는 0일 수 있다. */
  nearbyCount: number;
};

export type CandidatesResponse = {
  candidates: Candidate[];
  /** 실제로 사용된 반경(m). 완화되었을 수 있다. */
  radius: number;
  relaxed: Relaxation[];
};

/** URL 쿼리로 보내기 위한 직렬화. 슬라이더의 null은 키를 생략해 표현한다. */
export function filtersToParams(f: MenuFilters): Record<string, string> {
  const out: Record<string, string> = {
    meat: f.meat,
    seafood: f.seafood,
    flour: f.flour,
    meatKind: f.meatKind,
    staple: f.staple,
    egg: f.egg,
    dairy: f.dairy,
    weight: f.weight,
    price: f.price,
    soup: f.soup,
    solo: f.solo,
    quick: f.quick,
    formal: f.formal,
  };
  if (f.spicy !== null) out.spicy = String(f.spicy);
  if (f.richness !== null) out.richness = String(f.richness);
  if (f.temperature !== null) out.temperature = String(f.temperature);
  return out;
}
