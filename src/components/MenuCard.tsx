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
  formal: '격식',
  meatKind: '고기 종류',
  egg: '달걀',
  dairy: '유제품',
  price: '가격대',
};

/** 가게 가격이 아니라 메뉴의 보통 가격대다. 카드에서도 '대략'임을 드러낸다. */
const PRICE_LABEL: Record<Menu['price'], string> = {
  low: '1만원 이하 정도',
  mid: '1~2만원 정도',
  high: '2만원 이상 정도',
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
  if (menu.formal) out.push('격식 있는 자리');

  out.push(menu.weight === 'heavy' ? '든든' : menu.weight === 'light' ? '가벼움' : '보통');
  out.push(PRICE_LABEL[menu.price]);
  return out;
}

export function MenuCard({ menu, relaxed, restrictions, decided, busy, onLike, onAnother }: Props) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <p className="text-xs font-semibold text-brand">오늘의 추천</p>
      <h2 className="mt-1 text-3xl font-black tracking-tight">{menu.name}</h2>

      {/*
        제약이 걸려 있다는 사실을 결과에 항상 띄운다. localStorage가 초기화되면 제약이
        조용히 사라지는데, 이 줄이 없어진 걸 눈치채야 다시 설정할 수 있다.
      */}
      {restrictions.length > 0 && (
        <p className="mt-2 text-xs text-neutral-500">
          {restrictions.map((r) => RESTRICTION_LABEL[r]).join(' · ')} 제외 중
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {traits(menu).map((t) => (
          <span
            key={t}
            className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600"
          >
            {t}
          </span>
        ))}
      </div>

      {/* 조건을 풀었으면 반드시 말한다. 조용히 넓히면 사용자는 조건이 지켜진 줄 안다. */}
      {relaxed.length > 0 && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
          조건에 맞는 게 없어 {relaxed.map((r) => RELAX_LABEL[r]).join(', ')} 조건을 완화했어요.
        </p>
      )}

      {decided ? (
        <p className="mt-5 rounded-xl bg-neutral-100 px-3 py-2.5 text-center text-sm font-medium">
          맛있게 드세요! 아래에서 가게를 골라보세요.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onLike}
            disabled={busy}
            className="rounded-xl bg-brand px-3 py-3.5 text-sm font-semibold text-white shadow-sm shadow-brand/25 transition-colors hover:bg-brand-strong disabled:opacity-40"
          >
            좋아요
          </button>
          <button
            type="button"
            onClick={onAnother}
            disabled={busy}
            className="rounded-xl border border-neutral-200 px-3 py-3.5 text-sm font-medium disabled:opacity-40"
          >
            다른 거 추천
          </button>
        </div>
      )}
    </div>
  );
}
