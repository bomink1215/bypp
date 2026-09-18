'use client';

import { formatDistance } from '@/lib/distance';
import type { KakaoPlace } from '@/lib/kakao/types';
import { cuisineOf } from '@/lib/menu/category-map';
import { openHint } from '@/lib/menu/hours';

type Props = {
  places: KakaoPlace[];
  at: Date;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** 마지막 남는 불확실성은 전화가 가장 빨리 없앤다. 추정 배지로 우기지 않는다. */
export function PlaceList({ places, at, selectedId, onSelect }: Props) {
  return (
    <ul className="space-y-2">
      {places.map((p) => {
        const cuisine = cuisineOf(p.category_name);
        const hint = cuisine ? openHint(cuisine, at) : null;
        const selected = p.id === selectedId;

        return (
          <li
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`rounded-2xl border p-4 transition-colors ${
              selected
                ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800'
                : 'border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/60'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-medium">{p.place_name}</h3>
                <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {p.category_name.replace(/^음식점 > /, '')}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums text-neutral-600 dark:text-neutral-300">
                {formatDistance(Number(p.distance))}
              </span>
            </div>

            <p className="mt-2 truncate text-xs text-neutral-500 dark:text-neutral-400">
              {p.road_address_name || p.address_name}
            </p>

            {hint && <p className="mt-1 text-[11px] text-neutral-400">{hint} · 방문 전 확인하세요</p>}

            <div className="mt-3 flex gap-2">
              {p.phone ? (
                <a
                  href={`tel:${p.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 rounded-xl bg-neutral-900 px-3 py-2 text-center text-xs font-medium text-white dark:bg-white dark:text-neutral-900"
                >
                  전화 {p.phone}
                </a>
              ) : (
                <span className="flex-1 rounded-xl bg-neutral-100 px-3 py-2 text-center text-xs text-neutral-400 dark:bg-neutral-800">
                  전화번호 없음
                </span>
              )}
              <a
                href={p.place_url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium dark:border-neutral-700"
              >
                카카오맵
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
