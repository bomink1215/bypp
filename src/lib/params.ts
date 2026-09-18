import { DEFAULT_FILTERS, type MenuFilters } from './menu/types';

export class BadRequestError extends Error {}

export function requireCoords(sp: URLSearchParams): { lat: number; lng: number } {
  const lat = Number(sp.get('lat'));
  const lng = Number(sp.get('lng'));

  // 한반도 바깥이면 좌표를 뒤집어 넣었을 가능성이 높다. 가장 흔한 실수라 여기서 잡는다.
  if (!Number.isFinite(lat) || lat < 33 || lat > 39) {
    throw new BadRequestError('lat이 위도 범위를 벗어났습니다. x/y를 바꿔 넣지 않았는지 확인하세요.');
  }
  if (!Number.isFinite(lng) || lng < 124 || lng > 132) {
    throw new BadRequestError('lng가 경도 범위를 벗어났습니다. x/y를 바꿔 넣지 않았는지 확인하세요.');
  }

  return { lat, lng };
}

export function requireWalkMinutes(sp: URLSearchParams): number {
  const n = Number(sp.get('walkMin'));
  if (!Number.isFinite(n) || n < 1 || n > 60) {
    throw new BadRequestError('walkMin은 1~60 사이여야 합니다.');
  }
  return n;
}

export function parseAt(sp: URLSearchParams): Date {
  const raw = sp.get('at');
  if (!raw) return new Date();

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestError('at이 올바른 날짜가 아닙니다.');
  }
  return d;
}

function pick<T extends string>(raw: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(raw as T) ? (raw as T) : fallback;
}

export function parseFilters(sp: URLSearchParams): MenuFilters {
  return {
    spicy: pick(sp.get('spicy'), ['any', 'none', 'mild', 'hot'] as const, DEFAULT_FILTERS.spicy),
    meat: pick(sp.get('meat'), ['any', 'required', 'none'] as const, DEFAULT_FILTERS.meat),
    soup: pick(sp.get('soup'), ['any', 'yes', 'no'] as const, DEFAULT_FILTERS.soup),
    weight: pick(sp.get('weight'), ['any', 'light', 'heavy'] as const, DEFAULT_FILTERS.weight),
  };
}
