import type { Band, Cuisine } from './types';

/**
 * 업종별 영업 가능성 추정치 (0~1).
 *
 * **이 값은 추정이며 하드 필터로 쓰지 않는다.** 순위 가중치로만 쓴다.
 * 카카오 로컬 API는 영업시간을 주지 않고, 무료로 그걸 주는 대체 소스도 없다
 * (Google Places는 Enterprise SKU라 월 1,000콜, OSM은 국내 커버리지 2.3%).
 * 그래서 "이 가게가 지금 여는가"는 알 수 없고, "이 업종이 이 시간대에 영업할
 * 가능성이 큰가"만 추정한다.
 *
 * 라벨을 메뉴가 아니라 업종에 붙인 이유는 설계 원칙 2 참조.
 * "파스타는 야식인가"는 취향 논쟁이지만 "이탈리안 음식점이 새벽 2시에 여는가"는
 * 사실 문제라 카카오맵에서 몇 곳 눌러보면 검증된다.
 *
 * 값을 고칠 때는 실제 가게 몇 곳을 확인하고 고칠 것. 감으로 만지지 말 것.
 */
const OPEN_LIKELIHOOD: Record<Cuisine, Record<Band, number>> = {
  // 24시 영업이 흔하다
  'korean-soup': { dawn: 0.75, morning: 0.9, lunch: 1, afternoon: 0.9, dinner: 1, latenight: 0.85 },
  'korean-stew': { dawn: 0.15, morning: 0.5, lunch: 1, afternoon: 0.8, dinner: 1, latenight: 0.4 },
  // 저녁 장사. 아침에는 거의 닫혀 있다
  'korean-grill': { dawn: 0.2, morning: 0.05, lunch: 0.6, afternoon: 0.6, dinner: 1, latenight: 0.9 },
  'korean-rice': { dawn: 0.05, morning: 0.6, lunch: 1, afternoon: 0.7, dinner: 0.9, latenight: 0.2 },
  chinese: { dawn: 0.05, morning: 0.2, lunch: 1, afternoon: 0.85, dinner: 1, latenight: 0.45 },
  japanese: { dawn: 0.05, morning: 0.15, lunch: 1, afternoon: 0.7, dinner: 1, latenight: 0.4 },
  // 브레이크타임이 있고 밤에는 대체로 닫는다
  western: { dawn: 0.02, morning: 0.2, lunch: 1, afternoon: 0.8, dinner: 1, latenight: 0.25 },
  asian: { dawn: 0.03, morning: 0.2, lunch: 1, afternoon: 0.8, dinner: 1, latenight: 0.3 },
  snack: { dawn: 0.15, morning: 0.5, lunch: 1, afternoon: 0.95, dinner: 0.9, latenight: 0.5 },
  // 야식 수요가 커서 늦게까지 연다
  chicken: { dawn: 0.3, morning: 0.05, lunch: 0.5, afternoon: 0.7, dinner: 1, latenight: 0.95 },
  fastfood: { dawn: 0.35, morning: 0.7, lunch: 1, afternoon: 1, dinner: 1, latenight: 0.7 },
};

/** 주말 보정. 오피스가 백반집은 주말에 쉬는 곳이 많고, 고기·치킨은 반대다. */
const WEEKEND_FACTOR: Partial<Record<Cuisine, number>> = {
  'korean-rice': 0.75,
  chinese: 0.9,
  'korean-grill': 1.05,
  chicken: 1.05,
};

export function bandOf(date: Date): Band {
  const h = date.getHours();
  if (h < 5) return 'dawn';
  if (h < 11) return 'morning';
  if (h < 14) return 'lunch';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'dinner';
  return 'latenight';
}

export function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}

/** 해당 시각에 이 업종이 영업 중일 상대적 가능성. 0이 되지 않도록 바닥을 둔다. */
export function openLikelihood(cuisine: Cuisine, at: Date): number {
  const base = OPEN_LIKELIHOOD[cuisine][bandOf(at)];
  const factor = (isWeekend(at) && WEEKEND_FACTOR[cuisine]) || 1;
  // 바닥값 0.02 — 추정이 틀렸을 때 선택지를 완전히 지우지 않기 위한 것이다(원칙 3).
  return Math.max(0.02, base * factor);
}

/** 가게 카드에 띄울 힌트 문구. 단정하지 않는다. */
export function openHint(cuisine: Cuisine, at: Date): string {
  const p = openLikelihood(cuisine, at);
  if (p >= 0.8) return '이 시간대 영업이 많아요';
  if (p >= 0.45) return '영업 여부는 확인이 필요해요';
  return '이 시간엔 닫은 곳이 많아요';
}
