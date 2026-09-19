import type { Menu } from '../menu/types';
import { menuMatchesCategory } from '../menu/category-map';
import type { KakaoPlace, RankedPlace } from './types';

/**
 * 상호에 메뉴명이 들어 있는가.
 *
 * 한 글자 메뉴명은 상호로 판단하지 않는다. "회"로 찾으면 "○○회관"이 걸린다 — 그런 메뉴는
 * 업종(`일식 > 회`)으로만 본다.
 */
function nameMentions(place: KakaoPlace, menu: Menu): boolean {
  return menu.name.length >= 2 && place.place_name.includes(menu.name);
}

/**
 * 키워드 검색 결과에서 그 메뉴를 실제로 팔 것 같은 가게만 남긴다.
 *
 * 카카오 키워드 검색은 느슨하게 매칭한다. "해장국"으로 검색하면 `분식 > 명인만두`가,
 * "짬뽕"으로 검색하면 베트남 쌀국수집이 섞여 나온다. 그대로 보여주면 추천한 메뉴를
 * 안 파는 가게를 들이미는 셈이라, 원칙 1("추천의 세밀도가 검증의 세밀도를 넘으면 안 된다")을
 * 가게 단계에서 어기게 된다.
 *
 * 둘 중 하나면 판다고 본다.
 *   - 업종이 맞는다 (`한식 > 해장국`)
 *   - 상호에 메뉴명이 들어 있다 (`콩뿌리 콩나물국밥`)
 *
 * 둘 다 아니면 버린다. 다 버려져 0건이 되면 호출자가 다음 후보로 넘어가므로,
 * 사용자는 "그 메뉴를 파는 게 확실한 가게"만 보게 된다.
 */
export function filterRelevant(places: KakaoPlace[], menu: Menu): KakaoPlace[] {
  return places.filter((p) => menuMatchesCategory(menu, p.category_name) || nameMentions(p, menu));
}

/**
 * 그 메뉴 전문점인가 — 세분류 끝자리나 상호에 메뉴명이 그대로 있다.
 *
 * `filterRelevant`를 통과한 가게는 전부 "팔 것 같은" 가게지만, 그중에서도 `한식 > 국밥`인
 * ○○국밥이 `한식 > 백반`인 기사식당보다 국밥을 잘할 가능성이 높다. 카카오가 별점을 주지 않는
 * 상황에서 가게 순서를 거리만으로 정하지 않게 해주는 몇 안 되는 신호다.
 */
function isSpecialty(place: KakaoPlace, menu: Menu): boolean {
  const leaf = place.category_name.split('>').at(-1)?.trim() ?? '';
  return leaf.includes(menu.name) || nameMentions(place, menu);
}

/**
 * 파는 가게만 남기고 **전문점 먼저, 같으면 가까운 순**으로 줄 세운다.
 *
 * 피드백: "가까운 거리 순으로만 추천되는 게 아쉽다", "별점순으로 보고 싶다". 별점은 데이터가
 * 없어서 못 하고(CLAUDE.md 데이터 제약), 우리가 가진 신호 중 가장 쓸 만한 게 전문점 여부다.
 */
export function rankRelevant(places: KakaoPlace[], menu: Menu): RankedPlace[] {
  return filterRelevant(places, menu)
    .map((p) => ({ ...p, specialty: isSpecialty(p, menu) }))
    .sort(
      (a, b) => Number(b.specialty) - Number(a.specialty) || Number(a.distance) - Number(b.distance),
    );
}
