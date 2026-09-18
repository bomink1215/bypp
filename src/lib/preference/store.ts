/**
 * 취향 기록 저장소.
 *
 * `localStorage`에만 둔다. 서버로 보내지 않으므로 취향 이력이 기기 밖으로 나가지 않고,
 * DB 없이도 학습이 돌아간다(CLAUDE.md: DB는 당분간 없음).
 * 대신 기기 간 공유가 안 된다 — 그게 필요해지면 Supabase 도입 시점이다.
 *
 * 사생활 보호 모드나 저장소 차단 환경에서는 읽기·쓰기가 예외를 던진다.
 * 그때도 앱은 죽지 않고 학습만 꺼진 채 동작해야 한다.
 */

const KEY = 'bypp.preferences.v1';

export type Feedback = 'like' | 'dislike' | 'skip';

export type MenuStat = {
  likes: number;
  dislikes: number;
  /** epoch ms. 시간 감쇠의 기준점. */
  lastFeedbackAt: number;
};

export type PreferenceState = {
  version: 1;
  menus: Record<string, MenuStat>;
  /** "다른거 추천해주세요"로 넘긴 메뉴. 당일만 제외하고 장기 선호는 건드리지 않는다. */
  skipped: { date: string; menuIds: string[] };
};

export function emptyState(): PreferenceState {
  return { version: 1, menus: {}, skipped: { date: today(), menuIds: [] } };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadPreferences(): PreferenceState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();

    const parsed = JSON.parse(raw) as PreferenceState;
    if (parsed.version !== 1) return emptyState();

    // 날짜가 바뀌었으면 당일 제외 목록을 비운다. 어제 넘긴 메뉴는 오늘 다시 후보다.
    if (parsed.skipped?.date !== today()) {
      parsed.skipped = { date: today(), menuIds: [] };
    }
    return parsed;
  } catch {
    return emptyState();
  }
}

export function savePreferences(state: PreferenceState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 저장소가 막혀 있으면 학습만 포기한다. 앱은 계속 동작한다.
  }
}

export function resetPreferences(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 지울 수 없으면 어차피 저장도 안 됐다.
  }
}

/**
 * 피드백을 반영한 새 상태를 만든다.
 *
 * `skip`("다른거")은 `menus` 통계를 건드리지 않는다. 오늘 점심에 국밥이 안 당긴 것과
 * 국밥을 싫어하는 것은 다르다. 둘을 같이 취급하면 한두 번 넘긴 메뉴가 영영 사라진다.
 */
export function recordFeedback(
  state: PreferenceState,
  menuId: string,
  feedback: Feedback,
): PreferenceState {
  if (feedback === 'skip') {
    const menuIds = state.skipped.menuIds.includes(menuId)
      ? state.skipped.menuIds
      : [...state.skipped.menuIds, menuId];
    return { ...state, skipped: { date: today(), menuIds } };
  }

  const prev = state.menus[menuId] ?? { likes: 0, dislikes: 0, lastFeedbackAt: 0 };

  return {
    ...state,
    menus: {
      ...state.menus,
      [menuId]: {
        likes: prev.likes + (feedback === 'like' ? 1 : 0),
        dislikes: prev.dislikes + (feedback === 'dislike' ? 1 : 0),
        lastFeedbackAt: Date.now(),
      },
    },
  };
}

export function isSkippedToday(state: PreferenceState, menuId: string): boolean {
  return state.skipped.date === today() && state.skipped.menuIds.includes(menuId);
}

// ── 구독 가능한 스토어 ────────────────────────────────────────────
//
// localStorage는 React 바깥의 저장소다. effect에서 setState로 끌어오면 하이드레이션
// 이후 한 번 더 렌더가 돌고(그리고 lint가 막는다), 서버/클라이언트 첫 렌더가 어긋난다.
// `useSyncExternalStore`가 이 경우를 위해 있는 API라 그대로 쓴다.

/** 서버 렌더용 고정 스냅샷. 매번 새 객체를 주면 무한 렌더가 된다. */
const SERVER_SNAPSHOT: PreferenceState = Object.freeze({
  version: 1 as const,
  menus: {},
  skipped: Object.freeze({ date: '', menuIds: [] as string[] }),
});

let cached: PreferenceState | null = null;
const listeners = new Set<() => void>();

export function subscribePreferences(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getPreferencesSnapshot(): PreferenceState {
  cached ??= loadPreferences();
  return cached;
}

export function getPreferencesServerSnapshot(): PreferenceState {
  return SERVER_SNAPSHOT;
}

/** 상태를 갈아끼우고 저장한 뒤 구독자에게 알린다. */
export function setPreferences(next: PreferenceState): void {
  cached = next;
  savePreferences(next);
  for (const l of listeners) l();
}

export function clearPreferences(): void {
  resetPreferences();
  setPreferences(emptyState());
}
