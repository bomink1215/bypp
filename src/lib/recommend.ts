import type { KakaoPlace } from './kakao/types';
import { menuMatchesCategory } from './menu/category-map';
import { openLikelihood } from './menu/hours';
import { MENUS } from './menu/seed';
import type { Candidate, Menu, MenuFilters, Relaxation } from './menu/types';

/** 사용자가 명시적으로 켠 특성은 하드 필터다. 시간대와 달리 추정이 아니라 요구사항이다. */
export function matchesFilters(menu: Menu, f: MenuFilters): boolean {
  if (f.spicy === 'none' && menu.spicy !== 0) return false;
  if (f.spicy === 'mild' && menu.spicy > 1) return false;
  if (f.spicy === 'hot' && menu.spicy < 2) return false;

  const hasMeat = menu.meat.some((m) => m !== 'none');
  if (f.meat === 'required' && !hasMeat) return false;
  if (f.meat === 'none' && hasMeat) return false;

  if (f.soup === 'yes' && !menu.soup) return false;
  if (f.soup === 'no' && menu.soup) return false;

  if (f.weight === 'light' && menu.weight !== 'light') return false;
  if (f.weight === 'heavy' && menu.weight !== 'heavy') return false;

  return true;
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
export function buildCandidates(
  places: KakaoPlace[],
  filters: MenuFilters,
  at: Date,
  gate: boolean,
): Candidate[] {
  const candidates: Candidate[] = [];

  for (const menu of MENUS) {
    if (!matchesFilters(menu, filters)) continue;

    const nearbyCount = places.filter((p) => menuMatchesCategory(menu, p.category_name)).length;
    if (gate && nearbyCount === 0) continue;

    // 가게가 많을수록 약간 유리하되 로그로 눌러 한 업종이 독식하지 않게 한다.
    // 표본일 때는 이 가중치도 쓰지 않는다. 존재 판정을 못 믿는 목록이면 밀도도 못 믿는다.
    const density = gate ? Math.min(1.5, 1 + Math.log10(1 + nearbyCount) * 0.3) : 1;

    candidates.push({
      menu,
      baseScore: openLikelihood(menu.cuisine, at) * density,
      nearbyCount,
    });
  }

  return candidates.sort((a, b) => b.baseScore - a.baseScore);
}

/** 완화 우선순위. 덜 중요한 것부터 푼다. 매운맛 선호를 가장 늦게 푸는 건 의도다. */
const RELAX_ORDER = ['weight', 'soup', 'meat', 'spicy'] as const;

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
export function deriveCandidates(
  placesWide: KakaoPlace[],
  requestedRadius: number,
  widenedRadius: number,
  filters: MenuFilters,
  at: Date,
  gate: boolean,
): DerivedCandidates {
  const placesNear = placesWide.filter((p) => Number(p.distance) <= requestedRadius);

  const attempt = (places: KakaoPlace[], f: MenuFilters) => buildCandidates(places, f, at, gate);

  let candidates = attempt(placesNear, filters);
  if (candidates.length > 0) {
    return { candidates, relaxed: [], radius: requestedRadius };
  }

  // 1단계: 반경을 넓힌다. 취향을 건드리는 것보다 덜 거슬린다.
  candidates = attempt(placesWide, filters);
  if (candidates.length > 0) {
    return { candidates, relaxed: ['radius'], radius: widenedRadius };
  }

  // 2단계: 특성 필터를 하나씩 푼다.
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
