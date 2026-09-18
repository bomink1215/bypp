/** 언제 먹을지. 달력 대신 지금/오늘/내일로 좁힌 이유는 CLAUDE.md 참조. */
export type When = { kind: 'now' } | { kind: 'today' | 'tomorrow'; hour: number };

export function resolveWhen(when: When, now = new Date()): Date {
  if (when.kind === 'now') return now;

  const d = new Date(now);
  if (when.kind === 'tomorrow') d.setDate(d.getDate() + 1);
  d.setHours(when.hour, 0, 0, 0);
  return d;
}

export function formatWhen(when: When, now = new Date()): string {
  if (when.kind === 'now') return '지금';

  const day = when.kind === 'today' ? '오늘' : '내일';
  const at = resolveWhen(when, now);
  const h = at.getHours();
  const period = h < 12 ? '오전' : '오후';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${day} ${period} ${display}시`;
}
