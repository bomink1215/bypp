'use client';

import { formatDistance } from '@/lib/distance';
import type { KakaoPlace } from '@/lib/kakao/types';

/** 전문점 표시는 서버가 붙인다(rankRelevant). 예전 방 스냅샷에는 없을 수 있다. */
type ListedPlace = KakaoPlace & { specialty?: boolean };
import { cuisineOf } from '@/lib/menu/category-map';
import { openHint } from '@/lib/menu/hours';

type Props = {
  places: ListedPlace[];
  at: Date;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/**
 * 가게 목록.
 *
 * 카카오맵 버튼이 주 버튼이다. 우리가 줄 수 없는 정보(영업시간, 메뉴, 가격, 사진)가
 * 전부 거기 있기 때문이다 — 카카오 로컬 API는 그 어느 것도 주지 않는다.
 * 그래서 "확인하러 가는 곳"을 가장 크게 두고, 무엇을 확인하면 되는지도 같이 적는다.
 */
export function PlaceList({ places, at, selectedId, onSelect }: Props) {
  return (
    <ul className="space-y-2">
      {/* 순서가 거리만이 아니라는 걸 알려야 먼 가게가 위에 있어도 헷갈리지 않는다. */}
      {places.some((p) => p.specialty) && (
        <li className="px-1 text-[11px] text-neutral-500">전문점 먼저, 같으면 가까운 순이에요.</li>
      )}
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
                ? 'border-brand bg-brand-soft/40'
                : 'border-neutral-200 bg-white hover:bg-neutral-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="flex min-w-0 items-center gap-1.5 font-medium">
                  <span className="truncate">{p.place_name}</span>
                  {p.specialty && (
                    <span className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                      전문점
                    </span>
                  )}
                </h3>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  {p.category_name.replace(/^음식점 > /, '')}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums text-neutral-600">
                {formatDistance(Number(p.distance))}
              </span>
            </div>

            <p className="mt-2 truncate text-xs text-neutral-500">
              {p.road_address_name || p.address_name}
            </p>

            {hint && <p className="mt-1 text-[11px] text-neutral-400">{hint}</p>}

            <a
              href={p.place_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#FEE500] px-4 py-3 text-neutral-900 transition-opacity hover:opacity-90"
            >
              <span className="text-left">
                <span className="block text-sm font-semibold">카카오맵에서 보기</span>
                <span className="block text-[11px] opacity-70">영업시간 · 메뉴 · 사진 확인하기</span>
              </span>
              <span aria-hidden className="text-lg leading-none">
                ↗
              </span>
            </a>

            {p.phone && (
              <a
                href={`tel:${p.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="mt-1.5 block rounded-xl px-4 py-2 text-center text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800"
              >
                전화로 물어보기 {p.phone}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
