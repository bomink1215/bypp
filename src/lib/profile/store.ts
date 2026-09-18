import { RESTRICTIONS, type Restriction } from '../menu/restrictions';

/**
 * 내 설정 — 못 먹는 것.
 *
 * 취향 기록(`../preference/store.ts`)과 달리 학습되는 값이 아니라 사용자가 직접 정하는
 * 설정이라 파일을 나눴다. 저장 위치는 같은 `localStorage`다.
 *
 * 로그인이 없으므로 **이 브라우저에만 남는다.** 기기를 바꾸면 초기화된다.
 * 취향이 날아가면 추천이 조금 덜 맞을 뿐이지만 제약이 날아가면 못 먹는 걸 추천하게
 * 되므로, 결과 화면에 "무엇을 빼고 있는지"를 항상 띄워 조용히 사라지지 않게 한다.
 * (카카오 로그인이 붙으면 이 값을 계정에 동기화한다.)
 */

const KEY = 'bypp.profile.v1';

export type Profile = {
  version: 1;
  restrictions: Restriction[];
};

export function emptyProfile(): Profile {
  return { version: 1, restrictions: [] };
}

function load(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProfile();

    const parsed = JSON.parse(raw) as Profile;
    if (parsed.version !== 1 || !Array.isArray(parsed.restrictions)) return emptyProfile();

    // 저장된 값 중 우리가 아는 것만 남긴다. 목록이 바뀌어도 깨지지 않는다.
    return { version: 1, restrictions: RESTRICTIONS.filter((r) => parsed.restrictions.includes(r)) };
  } catch {
    return emptyProfile();
  }
}

// ── 구독 가능한 스토어 ────────────────────────────────────────────
// localStorage는 React 바깥의 저장소라 useSyncExternalStore로 읽는다.
// effect에서 setState로 끌어오면 하이드레이션 이후 한 번 더 렌더가 돌고 lint도 막는다.

/** 서버 렌더용 고정 스냅샷. 매번 새 객체를 주면 무한 렌더가 된다. */
const SERVER_SNAPSHOT: Profile = Object.freeze({
  version: 1 as const,
  restrictions: Object.freeze([]) as unknown as Restriction[],
});

let cached: Profile | null = null;
const listeners = new Set<() => void>();

export function subscribeProfile(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getProfileSnapshot(): Profile {
  cached ??= load();
  return cached;
}

export function getProfileServerSnapshot(): Profile {
  return SERVER_SNAPSHOT;
}

export function setRestrictions(restrictions: Restriction[]): void {
  const next: Profile = { version: 1, restrictions: RESTRICTIONS.filter((r) => restrictions.includes(r)) };
  cached = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장소가 막혀 있으면 이번 세션에만 적용된다. 앱은 계속 동작한다.
  }
  for (const l of listeners) l();
}

export function toggleRestriction(current: readonly Restriction[], r: Restriction): Restriction[] {
  return current.includes(r) ? current.filter((x) => x !== r) : [...current, r];
}
