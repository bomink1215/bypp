import type { Menu } from './types';

/**
 * 못 먹는 것 — 협상 불가능한 제약.
 *
 * 선호("매운 거 먹고 싶다")와는 다른 종류의 정보다. 선호는 오늘의 바람이라 양보할 수
 * 있지만, 제약은 체질·알레르기·신념이라 양보 대상이 아니다. 그래서 두 가지가 다르다.
 *
 *  1. **완화 대상이 아니다.** 후보가 0개가 되어도 제약은 풀지 않는다. 다른 조건을 풀고,
 *     그래도 없으면 없다고 말한다(`deriveCandidates` 참조).
 *  2. **여럿이 고를 때는 합집합이다.** 한 명이라도 못 먹으면 전체에서 뺀다. 선호는
 *     평균이나 타협으로 합치지만 제약은 더하기만 한다.
 *
 * **이건 알레르기 안전 필터가 아니다.** 우리는 메뉴판 데이터가 없어서 특정 가게의 특정
 * 메뉴에 무엇이 들어가는지 모른다(CLAUDE.md의 데이터 제약 참조). 여기 있는 건 시드에
 * 붙인 대분류 태그일 뿐이다. UI 문구도 "안전"이 아니라 "이런 건 빼고 추천"에 머물러야
 * 하고, 최종 확인은 가게에서 하도록 안내해야 한다.
 */
export type Restriction =
  | 'spicy'
  | 'rich'
  | 'seafood'
  | 'flour'
  | 'meat'
  | 'pork'
  | 'beef'
  | 'chicken'
  | 'egg'
  | 'dairy';

/**
 * 화면에 나오는 순서다. 고기 전체(채식)와 고기 종류(종교·체질)를 둘 다 둔다 — '돼지고기는
 * 못 먹지만 소고기는 된다'를 '고기'로 뭉치면 먹을 수 있는 걸 너무 많이 뺀다.
 */
export const RESTRICTIONS: readonly Restriction[] = [
  'spicy',
  'rich',
  'seafood',
  'flour',
  'meat',
  'pork',
  'beef',
  'chicken',
  'egg',
  'dairy',
];

export const RESTRICTION_LABEL: Record<Restriction, string> = {
  spicy: '매운 것',
  rich: '느끼한 것',
  seafood: '해산물',
  flour: '밀가루',
  meat: '고기 전체',
  pork: '돼지고기',
  beef: '소고기',
  chicken: '닭고기',
  egg: '달걀',
  dairy: '유제품',
};

/** 맛 축은 정도의 문제라 어디부터 "못 먹는"으로 볼지 선을 그어야 한다. */
const SPICY_LIMIT = 2; // 매콤 이상
const RICH_LIMIT = 3; // 아주 느끼함

export function violates(menu: Menu, restriction: Restriction): boolean {
  switch (restriction) {
    case 'spicy':
      return menu.spicy >= SPICY_LIMIT;
    case 'rich':
      return menu.richness >= RICH_LIMIT;
    case 'seafood':
      return menu.seafood;
    case 'flour':
      return menu.flour;
    case 'meat':
      return menu.meat;
    case 'pork':
      return menu.pork;
    case 'beef':
      return menu.beef;
    case 'chicken':
      return menu.chicken;
    case 'egg':
      return menu.egg;
    case 'dairy':
      return menu.dairy;
  }
}

export function isExcluded(menu: Menu, restrictions: readonly Restriction[]): boolean {
  return restrictions.some((r) => violates(menu, r));
}

export function parseRestrictions(raw: string | null): Restriction[] {
  if (!raw) return [];
  const wanted = new Set(raw.split(','));
  return RESTRICTIONS.filter((r) => wanted.has(r));
}

export function serializeRestrictions(list: readonly Restriction[]): string {
  return list.join(',');
}
