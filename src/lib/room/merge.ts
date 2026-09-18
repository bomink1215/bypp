import { RESTRICTIONS, type Restriction } from '../menu/restrictions';
import { DEFAULT_FILTERS, type Menu, type MenuFilters, type Toggle } from '../menu/types';
import { tasteScore } from '../recommend';

/**
 * 여러 명의 조건을 하나로 합친다.
 *
 * 핵심은 **제약과 선호를 다르게 다루는 것**이다.
 *
 *   제약(못 먹는 것) → 합집합. 한 명이라도 못 먹으면 전체에서 뺀다. 협상 대상이 아니다.
 *   선호            → 교집합 또는 타협. 양보할 수 있는 정보다.
 *
 * 이렇게 나누면 "A는 매운 걸 원하고 B는 매운 걸 못 먹는다" 같은 상황에서 누구를 희생시킬지
 * 계산할 필요가 없다. B의 제약이 이기고, A의 선호는 남은 후보 안에서 작동한다.
 */

export type ParticipantInput = {
  nickname: string;
  filters: MenuFilters;
  restrictions: Restriction[];
};

/** 서로 양립 불가능해서 해제한 축. 조용히 풀지 않고 이름을 돌려준다. */
export type Conflict = {
  key: keyof MenuFilters;
  label: string;
};

const CONFLICT_LABEL: Partial<Record<keyof MenuFilters, string>> = {
  meat: '고기',
  seafood: '해물',
  flour: '밀가루',
  soup: '국물',
  solo: '혼밥',
  quick: '빨리 먹기',
  formal: '격식',
  weight: '양',
};

const TOGGLE_KEYS = ['meat', 'seafood', 'flour', 'soup', 'solo', 'quick', 'formal'] as const;

/**
 * 하나로 좁힌다.
 *
 * 'any'는 "아무래도 좋다"이므로 남의 의견을 막지 않는다. 의견을 낸 사람들끼리 갈리면
 * 동시 만족이 불가능하니 해제하고 충돌로 보고한다.
 */
function mergeToggle(values: Toggle[]): { value: Toggle; conflict: boolean } {
  const opinions = new Set(values.filter((v) => v !== 'any'));
  if (opinions.size === 0) return { value: 'any', conflict: false };
  if (opinions.size === 1) return { value: [...opinions][0], conflict: false };
  return { value: 'any', conflict: true };
}

export type MergedConditions = {
  /**
   * 하드 필터로는 쓰지 않는다. 무엇이 모아졌는지 보여주고 충돌을 찾기 위한 요약일 뿐이다.
   * 실제 걸러내기는 `restrictions`만 하고, 나머지는 `groupScorer`가 점수로 반영한다.
   */
  filters: MenuFilters;
  restrictions: Restriction[];
  conflicts: Conflict[];
};

export function mergeConditions(participants: ParticipantInput[]): MergedConditions {
  if (participants.length === 0) {
    return { filters: { ...DEFAULT_FILTERS }, restrictions: [], conflicts: [] };
  }

  const filters: MenuFilters = { ...DEFAULT_FILTERS };
  const conflicts: Conflict[] = [];

  for (const key of TOGGLE_KEYS) {
    const { value, conflict } = mergeToggle(participants.map((p) => p.filters[key]));
    filters[key] = value;
    if (conflict) conflicts.push({ key, label: CONFLICT_LABEL[key] ?? key });
  }

  const weights = new Set(participants.map((p) => p.filters.weight).filter((w) => w !== 'any'));
  if (weights.size === 1) {
    filters.weight = [...weights][0];
  } else if (weights.size > 1) {
    conflicts.push({ key: 'weight', label: CONFLICT_LABEL.weight ?? 'weight' });
  }

  // 제약은 합집합. 순서를 고정해 표시가 매번 달라지지 않게 한다.
  const union = new Set(participants.flatMap((p) => p.restrictions));
  const restrictions = RESTRICTIONS.filter((r) => union.has(r));

  return { filters, restrictions, conflicts };
}

/** 원하는 토글 하나가 어긋날 때마다 곱해지는 값. 불리해지되 후보에서 사라지지는 않는다. */
const TOGGLE_MISS = 0.35;

/** 한 사람이 건 토글 중 이 메뉴가 어긋나는 개수. */
function toggleMisses(menu: Menu, f: MenuFilters): number {
  let misses = 0;
  const check = (want: Toggle, has: boolean) => {
    if (want !== 'any' && (want === 'yes') !== has) misses += 1;
  };

  check(f.meat, menu.meat);
  check(f.seafood, menu.seafood);
  check(f.flour, menu.flour);
  check(f.soup, menu.soup);
  check(f.solo, menu.solo);
  check(f.quick, menu.quick);
  check(f.formal, menu.formal);
  if (f.weight !== 'any' && menu.weight !== f.weight) misses += 1;

  return misses;
}

/** 이 사람이 이 메뉴에 얼마나 만족하는가 (0~1). 맛과 토글을 함께 본다. */
function satisfaction(menu: Menu, f: MenuFilters): number {
  return tasteScore(menu, f) * TOGGLE_MISS ** toggleMisses(menu, f);
}

/**
 * 여럿의 선호를 하나의 점수로.
 *
 * **가장 불만인 사람의 만족도를 쓴다(최소값).** 평균이면 한 명이 크게 싫어하는 메뉴가
 * "나머지가 좋아하니까" 뽑힌다. 최소값을 최대화하면 아무도 심하게 불만이지 않은 쪽으로
 * 모인다 — 매움 3과 순함 0이 부딪히면 양 끝이 아니라 중간 매운맛이 이긴다.
 *
 * **토글을 하드 필터로 쓰지 않는 게 핵심이다.** 교집합으로 걸러내면 세 명이 각자 하나씩만
 * 걸어도 후보가 한두 개로 붕괴한다(실제로 "국물 있음" + "고기 없음" 두 개에 50개가 1개가
 * 됐다). 투표할 게 없으면 같이 고르는 의미가 없다. 그래서 어긋나면 불리하게만 하고
 * 지우지는 않는다. 진짜 못 먹는 것은 이미 `restrictions`가 따로 걸러낸다.
 */
export function groupScorer(participants: ParticipantInput[]): (menu: Menu) => number {
  if (participants.length === 0) return () => 1;

  return (menu: Menu) =>
    participants.reduce((worst, p) => Math.min(worst, satisfaction(menu, p.filters)), 1);
}
