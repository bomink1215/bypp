/**
 * 언제 먹을지.
 *
 * - `hour` — 혼자 고르기. **시각만 고른다.** 오늘/내일을 따로 묻지 않는 이유: 혼자 쓰는 건
 *   곧 먹을 끼니라서, 이미 지난 시각을 고르면 그건 내일 그 시각을 뜻한다. 날짜를 물으면
 *   선택만 하나 늘 뿐 답이 바뀌지 않는다.
 * - `date` — 같이 고르기. 약속은 며칠 뒤일 수 있어 날짜와 시각을 같이 받는다.
 */
export type When =
  | { kind: 'now' }
  | { kind: 'hour'; hour: number }
  /** date는 로컬 기준 `YYYY-MM-DD`. `<input type="date">`의 값 그대로다. */
  | { kind: 'date'; date: string; hour: number };

/** 고를 수 있는 시각. 식사 시간대 위주로 촘촘히, 새벽은 성기게. */
export const HOURS = [7, 8, 9, 11, 12, 13, 15, 17, 18, 19, 20, 21, 22, 23, 1, 3];

/** 같이 고르기에서 날짜를 얼마나 앞까지 받을지. 방 유효 기간과 맞물린다(`lib/room/types.ts`). */
export const MAX_DAYS_AHEAD = 14;

/** 시간 설정을 처음 켰을 때의 기본 시각. 다가오는 점심이나 저녁. */
export function defaultHour(now = new Date()): number {
  const h = now.getHours();
  if (h < 12) return 12;
  if (h < 18) return 18;
  return 12;
}

/** 날짜 설정을 처음 켰을 때의 기본 날짜. `defaultHour`가 내일 점심을 가리키면 내일이다. */
export function defaultDate(now = new Date()): string {
  return toDateInput(now.getHours() >= 18 ? addDays(now, 1) : now);
}

/**
 * 고른 시각이 이미 지났는지. 그 시각이 속한 한 시간 동안은 지난 걸로 치지 않는다 —
 * 12시 40분에 "오늘 12시"로 방을 만드는 건 지금 점심을 정하는 것이다.
 */
export function isPast(when: When, now = new Date()): boolean {
  if (when.kind !== 'date') return false;
  return resolveWhen(when, now).getTime() + 3_600_000 <= now.getTime();
}

export function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function resolveWhen(when: When, now = new Date()): Date {
  if (when.kind === 'now') return now;

  if (when.kind === 'hour') {
    const d = new Date(now);
    d.setHours(when.hour, 0, 0, 0);
    // 지금이 속한 시각은 오늘로 친다. 12시 30분에 "12시"를 고르면 지금 점심이다.
    if (when.hour < now.getHours()) d.setDate(d.getDate() + 1);
    return d;
  }

  // `new Date('YYYY-MM-DD')`는 UTC 자정으로 읽혀 한국에서는 오전 9시가 된다. 로컬로 조립한다.
  const [y, m, day] = when.date.split('-').map(Number);
  return new Date(y, m - 1, day, when.hour, 0, 0, 0);
}

export function formatHour(h: number): string {
  return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}시`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function formatWhen(when: When, now = new Date()): string {
  if (when.kind === 'now') return '지금';

  const at = resolveWhen(when, now);
  const diff = Math.round(
    (new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86_400_000,
  );
  const day =
    diff === 0
      ? '오늘'
      : diff === 1
        ? '내일'
        : `${at.getMonth() + 1}월 ${at.getDate()}일(${WEEKDAYS[at.getDay()]})`;

  return `${day} ${formatHour(at.getHours())}`;
}
