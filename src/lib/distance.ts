/** 성인 평균 보행 속도 4km/h ≈ 67m/min. */
const METERS_PER_MINUTE = 67;

/**
 * 실제 보행 경로는 직선거리보다 길다(골목·횡단보도·건물 우회). 통상 1.2~1.4배.
 * 카카오 `radius`는 직선거리 기준이므로 보수적으로 1.3을 적용해 반경을 줄인다.
 */
const ROUTE_DETOUR_RATIO = 1.3;

/** 카카오 로컬 API가 받는 radius 상한. */
const MAX_RADIUS = 20_000;

/**
 * 도보 시간(분) → 카카오 검색 반경(m).
 *
 * 정확한 도보 시간이 필요해지면 Tmap 보행자 경로 API(일 1,000콜 무료)를
 * 가게를 탭한 시점에만 호출하는 방법이 있다. v1 범위 밖.
 */
export function walkMinutesToRadius(minutes: number): number {
  const straight = (minutes * METERS_PER_MINUTE) / ROUTE_DETOUR_RATIO;
  return Math.min(MAX_RADIUS, Math.max(100, Math.round(straight)));
}

/** 반경(m) → 대략 도보 몇 분. UI 표기용 역변환. */
export function radiusToWalkMinutes(radius: number): number {
  return Math.round((radius * ROUTE_DETOUR_RATIO) / METERS_PER_MINUTE);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
