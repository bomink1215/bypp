import { MENU_BY_ID } from '../menu/seed';
import type { MyReview } from './types';

/**
 * 먹로그 배지. 저장하지 않고 기록에서 매번 계산한다.
 *
 * 저장하면 기준을 바꿀 때마다 옛 배지를 고쳐야 한다. 기록은 이미 다 있으니 계산이 곧 진실이다.
 * 달성하지 못한 배지도 진행도와 함께 보여준다 — 다음 목표가 보여야 기록할 이유가 생긴다.
 */
export type Badge = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** 0~1. 1이면 달성. */
  progress: number;
  /** "3/5" 같은 진행 표시. 달성했으면 없다. */
  progressLabel?: string;
};

function counter(target: number, current: number) {
  return {
    progress: Math.min(1, current / target),
    progressLabel: current >= target ? undefined : `${current}/${target}`,
  };
}

export function computeBadges(reviews: MyReview[]): Badge[] {
  const total = reviews.length;

  const withFriends = reviews.filter((r) => r.companions.length > 0).length;

  const byPlace = new Map<string, number>();
  for (const r of reviews) byPlace.set(r.place.id, (byPlace.get(r.place.id) ?? 0) + 1);
  const topPlace = Math.max(0, ...byPlace.values());

  const byMenu = new Map<string, number>();
  for (const r of reviews) if (r.menuId) byMenu.set(r.menuId, (byMenu.get(r.menuId) ?? 0) + 1);
  const [favMenuId, favCount] = [...byMenu.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  const favName = favMenuId ? (MENU_BY_ID.get(favMenuId)?.name ?? '한 메뉴') : '한 메뉴';

  // 업종이 다양할수록 "탐험가". 메뉴의 업종(cuisine)으로 센다.
  const cuisines = new Set(
    reviews.map((r) => (r.menuId ? MENU_BY_ID.get(r.menuId)?.cuisine : null)).filter(Boolean),
  );

  const friendNames = new Set(reviews.flatMap((r) => r.companions));

  return [
    { id: 'first', emoji: '🍚', title: '첫 한 끼', description: '첫 기록을 남겼어요', ...counter(1, total) },
    { id: 'ten', emoji: '🔟', title: '열 끼', description: '기록 10개', ...counter(10, total) },
    { id: 'together', emoji: '🧑‍🤝‍🧑', title: '함께라서', description: '친구와 함께한 식사 3번', ...counter(3, withFriends) },
    { id: 'crew', emoji: '🎉', title: '밥친구 부자', description: '함께 먹은 친구 5명', ...counter(5, friendNames.size) },
    { id: 'regular', emoji: '🏠', title: '단골', description: '같은 가게 3번', ...counter(3, topPlace) },
    {
      id: 'mania',
      emoji: '❤️',
      title: favCount >= 5 ? `${favName} 마니아` : '메뉴 마니아',
      description: '같은 메뉴 5번',
      ...counter(5, favCount),
    },
    { id: 'explorer', emoji: '🧭', title: '탐험가', description: '서로 다른 업종 5곳', ...counter(5, cuisines.size) },
  ];
}
