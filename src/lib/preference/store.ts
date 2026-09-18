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

export type Feedback = 'like' | 'pass';

export type MenuStat = {
  likes: number;
  dislikes: number;
  /** epoch ms. 시간 감쇠의 기준점. */
  lastFeedbackAt: number;
};

export type PreferenceState = {
  version: 1;
  menus: Record<string, MenuStat>;
  /** 넘긴 메뉴. 당일 후보에서 빼는 용도. */
  skipped: { date: string; menuIds: string[] };
  /**
   * 확정해서 먹은 메뉴와 그 시각(epoch ms). 며칠 동안만 순위를 낮춘다(score.ts의 recencyFactor).
   * 선택 필드라 이 필드가 없던 옛 저장본도 그대로 읽힌다. 기기 밖으로 동기화하지 않는다 —
   * "요즘 뭘 먹었나"는 취향이 아니라 최근 사정이고, 다른 기기로 옮길 만큼 오래가지 않는다.
   */
  eaten?: Record<string, number>;
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
 * 넘겼을 때 붙는 감점의 크기.
 *
 * 1이 아니라 0.4인 이유: "다른 거"는 "이 메뉴가 싫다"와 "지금은 안 당긴다"가 섞인
 * 신호다. 오늘 점심에 국밥이 안 당긴 것을 국밥을 싫어하는 것과 똑같이 취급하면
 * 한두 번 넘긴 메뉴가 영영 사라진다. 그래서 당일 후보에서는 바로 빼되(확실한 의사),
 * 장기 취향에는 약하게만 반영한다. 반복해서 넘기면 그때는 쌓여서 제대로 내려간다.
 */
const PASS_PENALTY = 0.4;

/** 피드백을 반영한 새 상태를 만든다. */
export function recordFeedback(
  state: PreferenceState,
  menuId: string,
  feedback: Feedback,
): PreferenceState {
  const prev = state.menus[menuId] ?? { likes: 0, dislikes: 0, lastFeedbackAt: 0 };

  const menus = {
    ...state.menus,
    [menuId]: {
      likes: prev.likes + (feedback === 'like' ? 1 : 0),
      dislikes: prev.dislikes + (feedback === 'pass' ? PASS_PENALTY : 0),
      lastFeedbackAt: Date.now(),
    },
  };

  // 좋아요는 곧 확정이다. 취향으로는 오르지만, 먹은 기록도 남겨 며칠은 덜 나오게 한다.
  if (feedback === 'like') return recordEaten({ ...state, menus }, menuId);

  const menuIds = state.skipped.menuIds.includes(menuId)
    ? state.skipped.menuIds
    : [...state.skipped.menuIds, menuId];

  return { ...state, menus, skipped: { date: today(), menuIds } };
}

/**
 * 먹은 걸로 기록한다. 혼자 고르기의 "좋아요"(확정)와 방에서 메뉴가 정해졌을 때 부른다.
 * 취향 카운트는 건드리지 않는다 — 방에서 정해진 메뉴는 내가 고른 게 아닐 수 있다.
 */
export function recordEaten(state: PreferenceState, menuId: string, at = Date.now()): PreferenceState {
  return { ...state, eaten: { ...state.eaten, [menuId]: at } };
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
