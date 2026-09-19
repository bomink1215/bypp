import type { KakaoPlace } from './kakao/types';
import { menuMatchesCategory } from './menu/category-map';
import { openLikelihood } from './menu/hours';
import { isExcluded, type Restriction } from './menu/restrictions';
import { MENUS } from './menu/seed';
import type { Candidate, Menu, MenuFilters, Relaxation, Taste } from './menu/types';

/**
 * 식재료·양·기타는 하드 필터다. 시간대와 달리 추정이 아니라 사용자의 요구사항이고,
 * 특히 식재료는 알레르기나 채식 같은 이유일 수 있어 어기면 안 된다.
 */
export function matchesFilters(menu: Menu, f: MenuFilters): boolean {
  if (f.meat === 'yes' && !menu.meat) return false;
  if (f.meat === 'no' && menu.meat) return false;

  if (f.seafood === 'yes' && !menu.seafood) return false;
  if (f.seafood === 'no' && menu.seafood) return false;

  if (f.flour === 'yes' && !menu.flour) return false;
  if (f.flour === 'no' && menu.flour) return false;

  if (f.meatKind !== 'any' && !menu[f.meatKind]) return false;

  if (f.egg === 'yes' && !menu.egg) return false;
  if (f.egg === 'no' && menu.egg) return false;

  if (f.dairy === 'yes' && !menu.dairy) return false;
  if (f.dairy === 'no' && menu.dairy) return false;

  if (f.soup === 'yes' && !menu.soup) return false;
  if (f.soup === 'no' && menu.soup) return false;

  if (f.solo === 'yes' && !menu.solo) return false;
  if (f.solo === 'no' && menu.solo) return false;

  if (f.quick === 'yes' && !menu.quick) return false;
  if (f.quick === 'no' && menu.quick) return false;

  if (f.formal === 'yes' && !menu.formal) return false;
  if (f.formal === 'no' && menu.formal) return false;

  if (f.weight === 'light' && menu.weight !== 'light') return false;
  if (f.weight === 'heavy' && menu.weight !== 'heavy') return false;

  if (f.price !== 'any' && menu.price !== f.price) return false;

  if (f.staple !== 'any' && menu.staple !== f.staple) return false;

  return true;
}

/** 목표에서 한 칸 멀어질 때마다 곱해지는 값. 사실상 필터처럼 걸러내되 0은 아니다. */
const TASTE_FALLOFF = 0.2;

function tasteFit(value: number, target: Taste): number {
  if (target === null) return 1;
  return TASTE_FALLOFF ** Math.abs(value - target);
}

/**
 * 맛 3축의 적합도.
 *
 * 하드 필터가 아니라 목표값이다. 슬라이더를 "매움" 끝에 두면 순한 메뉴는 0.008배까지
 * 떨어져 사실상 안 나오지만, 완전히 0은 아니다 — 우리가 매운맛을 잘못 매긴 메뉴가
 * 영영 묻히지 않게 하기 위해서다(원칙 3).
 */
export function tasteScore(menu: Menu, f: MenuFilters): number {
  return (
    tasteFit(menu.spicy, f.spicy) *
    tasteFit(menu.richness, f.richness) *
    tasteFit(menu.temperature, f.temperature)
  );
}

/**
 * 메뉴 후보를 만든다.
 *
 * `gate`가 참이면 주변에 그 업종의 가게가 실제로 잡힌 메뉴만 남긴다. 이건 반경 안을
 * **전수 조회했을 때만** 쓸 수 있다. 카카오는 검색당 45건까지만 노출하므로, 밀집 지역에서
 * 받은 목록은 반경 전체가 아니라 가장 가까운 45곳(강남역 기준 약 119m)의 표본이다.
 * 표본으로 "없다"를 판정하면 조금 떨어진 가게를 통째로 지운다.
 *
 * 그래서 밀집 지역에서는 gate를 끄고, 존재 확인을 키워드 검색으로 미룬다. 키워드 검색은
 * 질의가 결과를 미리 좁혀 45 상한에 걸리지 않고, 화면에 띄우기 전에 0건이면 다음 후보로
 * 넘어가므로 "파는 데가 없는 메뉴"는 여전히 사용자에게 보이지 않는다.
 */
export type CandidateOptions = {
  places: KakaoPlace[];
  filters: MenuFilters;
  at: Date;
  gate: boolean;
  restrictions?: readonly Restriction[];
  /**
   * 맛 적합도 계산을 갈아끼운다. 여럿이 고를 때 "가장 불만인 사람 기준"으로 바꾸기 위한 것이다.
   * 생략하면 `filters`의 맛 축을 그대로 쓴다(혼자 쓸 때).
   */
  tasteScorer?: (menu: Menu) => number;
};

export function buildCandidates({
  places,
  filters,
  at,
  gate,
  restrictions = [],
  tasteScorer,
}: CandidateOptions): Candidate[] {
  const scoreTaste = tasteScorer ?? ((menu: Menu) => tasteScore(menu, filters));
  const candidates: Candidate[] = [];

  for (const menu of MENUS) {
    // 제약이 먼저다. 이건 사용자의 바람이 아니라 못 먹는다는 사실이다.
    if (isExcluded(menu, restrictions)) continue;
    if (!matchesFilters(menu, filters)) continue;

    const nearbyCount = places.filter((p) => menuMatchesCategory(menu, p.category_name)).length;
    if (gate && nearbyCount === 0) continue;

    // 가게가 많을수록 약간 유리하되 로그로 눌러 한 업종이 독식하지 않게 한다.
    // 표본일 때는 이 가중치도 쓰지 않는다. 존재 판정을 못 믿는 목록이면 밀도도 못 믿는다.
    const density = gate ? Math.min(1.5, 1 + Math.log10(1 + nearbyCount) * 0.3) : 1;

    candidates.push({
      menu,
      baseScore: openLikelihood(menu.cuisine, at) * density * scoreTaste(menu),
      nearbyCount,
    });
  }

  return candidates.sort((a, b) => b.baseScore - a.baseScore);
}

/**
 * 완화 우선순위. 덜 중요한 것부터 푼다.
 *
 * 식재료(밀가루·해물·고기)를 가장 늦게 푸는 건 의도다. 알레르기나 채식일 수 있어
 * 어기면 단순히 아쉬운 게 아니라 못 먹는 걸 추천하는 셈이 된다.
 * 맛 3축은 소프트 점수라 후보를 지우지 않으므로 완화 대상이 아니다.
 *
 * 가격대는 격식 바로 앞이다. 예산은 지키고 싶지만, 대접 자리에서 격식을 먼저 버리는 것보다는
 * 예산을 조금 넘기는 쪽이 낫다.
 *
 * 격식(formal)은 편의 조건들보다 뒤에 둔다. 윗사람 대접 자리에 분식이 뜨는 건 "아쉬운"
 * 정도가 아니다. 그래도 식재료보다는 앞이다 — 못 먹는 걸 내놓는 것보다는 낫다.
 */
const RELAX_ORDER = [
  'quick',
  'solo',
  'weight',
  'soup',
  // 밥·면은 국물보다 뚜렷한 바람이라 국물 다음에 푼다.
  'staple',
  'price',
  'formal',
  // 고기 종류는 '오늘은 소고기' 같은 바람이라 식재료 중 가장 먼저 푼다.
  'meatKind',
  'dairy',
  'egg',
  'flour',
  'seafood',
  'meat',
] as const;

export type DerivedCandidates = {
  candidates: Candidate[];
  relaxed: Relaxation[];
  /** 실제로 후보를 뽑는 데 쓴 반경(m). */
  radius: number;
};

/**
 * 후보가 0개면 제약을 순서대로 푼다.
 *
 * 반경 완화를 위해 카카오를 다시 부르지 않는다. 애초에 넉넉한 반경으로 한 번 받아두고
 * `distance`로 잘라 쓰기 때문이다. 무엇을 풀었는지는 반드시 호출자에게 돌려준다 —
 * 조용히 넓히면 사용자는 자기가 건 조건이 지켜진 줄 안다.
 */
export type DeriveOptions = Omit<CandidateOptions, 'places'> & {
  placesWide: KakaoPlace[];
  requestedRadius: number;
  widenedRadius: number;
};

export function deriveCandidates({
  placesWide,
  requestedRadius,
  widenedRadius,
  filters,
  at,
  gate,
  restrictions = [],
  tasteScorer,
}: DeriveOptions): DerivedCandidates {
  const placesNear = placesWide.filter((p) => Number(p.distance) <= requestedRadius);

  // restrictions는 attempt에 항상 그대로 넘어간다. 아래 완화 단계에서도 건드리지 않는다 —
  // 못 먹는 걸 추천하느니 "없다"고 말하는 게 맞다.
  const attempt = (places: KakaoPlace[], f: MenuFilters) =>
    buildCandidates({ places, filters: f, at, gate, restrictions, tasteScorer });

  let candidates = attempt(placesNear, filters);
  if (candidates.length > 0) {
    return { candidates, relaxed: [], radius: requestedRadius };
  }

  // 1단계: 반경을 넓힌다. 취향을 건드리는 것보다 덜 거슬린다.
  candidates = attempt(placesWide, filters);
  if (candidates.length > 0) {
    return { candidates, relaxed: ['radius'], radius: widenedRadius };
  }

  // 2단계: 하드 필터를 하나씩 푼다.
  const relaxed: Relaxation[] = ['radius'];
  const working: MenuFilters = { ...filters };

  for (const key of RELAX_ORDER) {
    if (working[key] === 'any') continue;
    working[key] = 'any';
    relaxed.push(key);

    candidates = attempt(placesWide, working);
    if (candidates.length > 0) {
      return { candidates, relaxed, radius: widenedRadius };
    }
  }

  return { candidates: [], relaxed, radius: widenedRadius };
}

/**
 * 가중 랜덤 추출.
 *
 * `boost`는 클라이언트의 선호도를 반영하는 배수다. 서버는 이걸 모른다 —
 * 취향 이력은 기기 밖으로 나가지 않는다.
 */
export function pickWeighted(
  candidates: Candidate[],
  boost: (c: Candidate) => number,
  rng: () => number = Math.random,
): Candidate | null {
  if (candidates.length === 0) return null;

  const weights = candidates.map((c) => Math.max(1e-6, c.baseScore * boost(c)));
  const total = weights.reduce((a, b) => a + b, 0);

  let roll = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }

  return candidates[candidates.length - 1];
}
