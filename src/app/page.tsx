'use client';

import { useMemo, useState } from 'react';

import { MenuCard } from '@/components/MenuCard';
import { OptionPanel } from '@/components/OptionPanel';
import { PlaceList } from '@/components/PlaceList';
import { PlaceMap } from '@/components/PlaceMap';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useRecommendation } from '@/hooks/useRecommendation';
import { DEFAULT_FILTERS, type MenuFilters } from '@/lib/menu/types';
import { resolveWhen, type When } from '@/lib/when';

export default function Home() {
  const geo = useGeolocation();
  const rec = useRecommendation();

  const [when, setWhen] = useState<When>({ kind: 'now' });
  const [walkMin, setWalkMin] = useState(10);
  const [filters, setFilters] = useState<MenuFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // when이 그대로면 같은 Date를 유지해 하위 컴포넌트가 헛돌지 않게 한다.
  const at = useMemo(() => resolveWhen(when), [when]);

  const busy = rec.status === 'loading';

  const handleRecommend = () => {
    if (!geo.coords) return;
    setSelectedId(null);
    void rec.start({ coords: geo.coords, walkMin, at, filters });
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">뭐 먹지</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          지금 있는 곳 근처에서, 지금 먹을 만한 걸 골라드려요.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr] lg:items-start">
        <div className="space-y-4">
          <OptionPanel
            when={when}
            onWhenChange={setWhen}
            walkMin={walkMin}
            onWalkMinChange={setWalkMin}
            filters={filters}
            onFiltersChange={setFilters}
            geoStatus={geo.status}
            locationLabel={geo.label}
            onRequestLocation={geo.request}
            onPickRegion={geo.setManual}
          />

          <button
            type="button"
            onClick={handleRecommend}
            disabled={!geo.coords || busy}
            className="w-full rounded-2xl bg-neutral-900 px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {busy ? '찾는 중…' : geo.coords ? '메뉴 추천받기' : '먼저 위치를 정해주세요'}
          </button>

          {rec.trained && (
            <div className="flex items-center justify-between px-1 text-[11px] text-neutral-400">
              <span>{rec.feedbackCount}개 메뉴의 취향을 학습했어요</span>
              <button
                type="button"
                onClick={rec.reset}
                className="underline underline-offset-2 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                기록 초기화
              </button>
            </div>
          )}
        </div>

        <section className="space-y-4">
          {rec.status === 'idle' && (
            <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
              위치와 조건을 정하고 추천을 받아보세요.
            </div>
          )}

          {rec.status === 'error' && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {rec.error}
            </div>
          )}

          {rec.status === 'empty' && (
            <div className="rounded-2xl border border-neutral-200 p-6 text-center text-sm text-neutral-500 dark:border-neutral-800">
              조건에 맞는 메뉴를 찾지 못했어요. 도보 시간을 늘리거나 조건을 줄여보세요.
            </div>
          )}

          {rec.menu && (
            <MenuCard
              menu={rec.menu}
              relaxed={rec.relaxed}
              decided={rec.decided}
              busy={busy}
              onLike={rec.like}
              onDislike={rec.dislike}
              onAnother={rec.another}
            />
          )}

          {geo.coords && rec.places.length > 0 && (
            <>
              <div className="h-[280px]">
                <PlaceMap
                  center={geo.coords}
                  places={rec.places}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </div>

              <PlaceList
                places={rec.places}
                at={at}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
