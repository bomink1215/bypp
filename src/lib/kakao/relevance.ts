import type { Menu } from '../menu/types';
import { menuMatchesCategory } from '../menu/category-map';
import type { KakaoPlace } from './types';

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
  return places.filter(
    (p) => menuMatchesCategory(menu, p.category_name) || p.place_name.includes(menu.name),
  );
}
