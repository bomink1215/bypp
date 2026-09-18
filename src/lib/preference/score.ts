import { MENU_BY_ID } from '../menu/seed';
import type { Menu } from '../menu/types';
import type { PreferenceState } from './store';

/**
 * 피드백 → 추천 가중치.
 *
 * 두 층위로 배운다.
 *  - **메뉴 단위**: 그 메뉴 자체의 누적 평가.
 *  - **특성 단위**: cuisine / 맛 3축 / 식재료 3종 / 국물 / 양으로 전이. 마라탕에 좋아요를
 *    누르면 안 눌러본 짬뽕도 같이 오른다. 메뉴 단위로만 배우면 50개를 다 눌러야 한다.
 *
 * 설계 원칙 3 — 학습이 탐색을 죽이면 안 된다. 그래서 가중치에 상하한을 두고,
 * 일정 확률로 선호도를 아예 무시하며, 오래된 피드백은 감쇠시킨다.
 */

/** 이 배수를 벗어나지 않는다. 하한이 0이 아닌 게 핵심 — 싫어요를 눌러도 사라지지 않는다. */
const BOOST_MIN = 0.3;
const BOOST_MAX = 2.5;

const MENU_WEIGHT = 0.6;
const TRAIT_WEIGHT = 0.4;

/** 반감기(일). 취향은 변한다. */
const HALF_LIFE_DAYS = 30;

/** 선호도를 통째로 무시하고 뽑을 확률. 이게 없으면 몇 번 만에 같은 메뉴만 돈다. */
export const EXPLORE_RATE = 0.15;

const DAY_MS = 86_400_000;

function decay(lastFeedbackAt: number, now: number): number {
  if (!lastFeedbackAt) return 0;
  const ageDays = Math.max(0, (now - lastFeedbackAt) / DAY_MS);
  return 0.5 ** (ageDays / HALF_LIFE_DAYS);
}

/** 누적 좋아요/싫어요 → -1..1. tanh로 눌러 몇 번 더 눌렀다고 무한정 벌어지지 않게 한다. */
function net(likes: number, dislikes: number): number {
  return Math.tanh((likes - dislikes) / 2);
}

/** 한 메뉴가 갖는 특성 축들. 학습이 전이되는 통로다. */
function axesOf(menu: Menu): string[] {
  return [
    `cuisine:${menu.cuisine}`,
    `spicy:${menu.spicy >= 2 ? 'hot' : 'mild'}`,
    `richness:${menu.richness >= 2 ? 'rich' : 'light'}`,
    `temperature:${menu.temperature >= 2 ? 'warm' : 'cool'}`,
    `meat:${menu.meat ? 'yes' : 'no'}`,
    `seafood:${menu.seafood ? 'yes' : 'no'}`,
    `flour:${menu.flour ? 'yes' : 'no'}`,
    `soup:${menu.soup ? 'yes' : 'no'}`,
    `weight:${menu.weight}`,
  ];
}

export type PreferenceModel = {
  boost: (menu: Menu) => number;
  /** 피드백이 하나도 없으면 false. UI에서 "아직 학습 전"을 알릴 때 쓴다. */
  trained: boolean;
};

export function buildPreferenceModel(state: PreferenceState, now = Date.now()): PreferenceModel {
  const menuScores = new Map<string, number>();
  const axisTotals = new Map<string, { sum: number; count: number }>();

  for (const [menuId, stat] of Object.entries(state.menus)) {
    const menu = MENU_BY_ID.get(menuId);
    if (!menu) continue; // 시드에서 빠진 메뉴의 옛 기록

    const score = net(stat.likes, stat.dislikes) * decay(stat.lastFeedbackAt, now);
    if (score === 0) continue;

    menuScores.set(menuId, score);

    for (const axis of axesOf(menu)) {
      const acc = axisTotals.get(axis) ?? { sum: 0, count: 0 };
      acc.sum += score;
      acc.count += 1;
      axisTotals.set(axis, acc);
    }
  }

  const trained = menuScores.size > 0;

  const boost = (menu: Menu): number => {
    const menuScore = menuScores.get(menu.id) ?? 0;

    const axes = axesOf(menu);
    let traitSum = 0;
    for (const axis of axes) {
      const acc = axisTotals.get(axis);
      if (!acc) continue; // 기록이 없는 축은 0점(중립)으로 둔다
      traitSum += acc.sum / acc.count;
    }

    // 일치한 축만 골라 평균 내면 안 된다. 그러면 축 하나만 겹치는 메뉴가 일곱 개
    // 겹치는 메뉴와 같은 점수를 받는다(마라탕에 좋아요를 눌렀더니 샐러드가 짬뽕만큼
    // 오르던 버그). 전체 축 수로 나눠 "몇 개나 겹치는지"가 점수에 반영되게 한다.
    const traitScore = traitSum / axes.length;

    const raw = 1 + MENU_WEIGHT * menuScore + TRAIT_WEIGHT * traitScore;
    return Math.min(BOOST_MAX, Math.max(BOOST_MIN, raw));
  };

  return { boost, trained };
}
