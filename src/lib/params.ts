import { DEFAULT_FILTERS, type Level, type MenuFilters, type Taste, type Toggle } from './menu/types';

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

/** 맛 슬라이더. 키가 없으면 상관없음(null)이다. */
function parseTaste(raw: string | null): Taste {
  if (raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 3) return null;
  return n as Level;
}

function parseToggle(raw: string | null): Toggle {
  return raw === 'yes' || raw === 'no' ? raw : 'any';
}

export function parseFilters(sp: URLSearchParams): MenuFilters {
  const weight = sp.get('weight');

  return {
    spicy: parseTaste(sp.get('spicy')),
    richness: parseTaste(sp.get('richness')),
    temperature: parseTaste(sp.get('temperature')),
    meat: parseToggle(sp.get('meat')),
    seafood: parseToggle(sp.get('seafood')),
    flour: parseToggle(sp.get('flour')),
    weight: weight === 'light' || weight === 'heavy' ? weight : DEFAULT_FILTERS.weight,
    soup: parseToggle(sp.get('soup')),
    solo: parseToggle(sp.get('solo')),
    quick: parseToggle(sp.get('quick')),
    formal: parseToggle(sp.get('formal')),
  };
}
