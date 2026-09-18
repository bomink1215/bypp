'use client';

import { RESTRICTION_LABEL, type Restriction } from '@/lib/menu/restrictions';
import type { Menu, Relaxation } from '@/lib/menu/types';

type Props = {
  menu: Menu;
  relaxed: Relaxation[];
  restrictions: readonly Restriction[];
  decided: boolean;
  busy: boolean;
  onLike: () => void;
  onAnother: () => void;
};

const RELAX_LABEL: Record<Relaxation, string> = {
  radius: '도보 시간',
  meat: '고기',
  seafood: '해물',
  flour: '밀가루',
  weight: '양',
  soup: '국물',
  solo: '혼밥',
  quick: '빨리 먹기',
};

function traits(menu: Menu): string[] {
  const out: string[] = [];

  if (menu.spicy >= 3) out.push('아주 매움');
  else if (menu.spicy === 2) out.push('매콤');
  else if (menu.spicy === 0) out.push('안 매움');

  if (menu.richness >= 3) out.push('느끼');
  else if (menu.richness === 0) out.push('담백');

  if (menu.temperature === 0) out.push('차가움');
  else if (menu.temperature >= 3) out.push('뜨끈');

  if (menu.soup) out.push('국물');
  if (menu.solo) out.push('혼밥 가능');
  if (menu.quick) out.push('빨리 먹기');

  out.push(menu.weight === 'heavy' ? '든든' : menu.weight === 'light' ? '가벼움' : '보통');
  return out;
}

export function MenuCard({ menu, relaxed, restrictions, decided, busy, onLike, onAnother }: Props) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">오늘의 추천</p>
      <h2 className="mt-1 text-3xl font-bold tracking-tight">{menu.name}</h2>

      {/*
        제약이 걸려 있다는 사실을 결과에 항상 띄운다. localStorage가 초기화되면 제약이
        조용히 사라지는데, 이 줄이 없어진 걸 눈치채야 다시 설정할 수 있다.
      */}
      {restrictions.length > 0 && (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          {restrictions.map((r) => RESTRICTION_LABEL[r]).join(' · ')} 제외 중
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {traits(menu).map((t) => (
          <span
            key={t}
            className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          >
            {t}
          </span>
        ))}
      </div>

      {/* 조건을 풀었으면 반드시 말한다. 조용히 넓히면 사용자는 조건이 지켜진 줄 안다. */}
      {relaxed.length > 0 && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          조건에 맞는 게 없어 {relaxed.map((r) => RELAX_LABEL[r]).join(', ')} 조건을 완화했어요.
        </p>
      )}

      {decided ? (
        <p className="mt-5 rounded-xl bg-neutral-100 px-3 py-2.5 text-center text-sm font-medium dark:bg-neutral-800">
          맛있게 드세요! 아래에서 가게를 골라보세요.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onLike}
            disabled={busy}
            className="rounded-xl bg-neutral-900 px-3 py-3.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            좋아요
          </button>
          <button
            type="button"
            onClick={onAnother}
            disabled={busy}
            className="rounded-xl border border-neutral-200 px-3 py-3.5 text-sm font-medium disabled:opacity-40 dark:border-neutral-700"
          >
            다른 거 추천
          </button>
        </div>
      )}
    </div>
  );
}
