'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import { AuthBar } from '@/components/AuthBar';
import { Brand } from '@/components/Brand';
import { MenuCard } from '@/components/MenuCard';
import { OptionPanel } from '@/components/OptionPanel';
import { PlaceList } from '@/components/PlaceList';
import { PlaceMap } from '@/components/PlaceMap';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useProfile } from '@/hooks/useProfile';
import { useRecommendation } from '@/hooks/useRecommendation';
import { RESTRICTION_LABEL } from '@/lib/menu/restrictions';
import { DEFAULT_FILTERS, type MenuFilters } from '@/lib/menu/types';
import { resolveWhen, type When } from '@/lib/when';

export default function Home() {
  const geo = useGeolocation();
  const rec = useRecommendation();
  const profile = useProfile();

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
    void rec.start({ coords: geo.coords, walkMin, at, filters, restrictions: profile.restrictions });
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-2">
        <Brand />
        <AuthBar />
      </div>

      <header className="mb-4">
        <h1 className="text-2xl font-black tracking-tight">혼자 고르기</h1>
        <p className="mt-1 text-sm text-neutral-500">
          지금 있는 곳 근처에서, 지금 먹을 만한 걸 골라드려요.
        </p>
      </header>

      {/*
        같이 고르기가 이 서비스의 무게중심이라(CLAUDE.md) 작은 링크로 두면 안 된다.
        코랄 채움은 이 화면의 주 행동(추천받기) 몫이라, 여기는 옅은 코랄 바탕으로 구분한다.
      */}
      <Link
        href="/room"
        className="group mb-6 flex items-center gap-3 rounded-2xl border border-brand/25 bg-brand-soft px-4 py-3.5 transition-colors hover:border-brand/60"
      >
        <span aria-hidden className="text-2xl leading-none">
          🧑‍🤝‍🧑
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">친구와 함께 정하기</span>
          <span className="block text-xs text-neutral-600">
            링크를 공유하면 각자 조건을 내고, 투표로 정해요
          </span>
        </span>
        <span
          aria-hidden
          className="text-lg font-bold text-brand transition-transform group-hover:translate-x-0.5"
        >
          →
        </span>
      </Link>

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
            restrictions={profile.restrictions}
            onToggleRestriction={profile.toggle}
            currentCoords={geo.coords}
          />

          <button
            type="button"
            onClick={handleRecommend}
            disabled={!geo.coords || busy}
            className="w-full rounded-2xl bg-brand px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-brand/25 transition-colors hover:bg-brand-strong disabled:opacity-40"
          >
            {busy ? '찾는 중…' : geo.coords ? '메뉴 추천받기' : '먼저 위치를 정해주세요'}
          </button>

          {rec.trained && (
            <div className="flex items-center justify-between px-1 text-[11px] text-neutral-400">
              <span>{rec.feedbackCount}개 메뉴의 취향을 학습했어요</span>
              <button
                type="button"
                onClick={rec.reset}
                className="underline underline-offset-2 hover:text-neutral-600"
              >
                기록 초기화
              </button>
            </div>
          )}
        </div>

        <section className="space-y-4">
          {rec.status === 'idle' && (
            <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
              위치와 조건을 정하고 추천을 받아보세요.
            </div>
          )}

          {rec.status === 'error' && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {rec.error}
            </div>
          )}

          {rec.status === 'empty' && (
            <div className="rounded-2xl border border-neutral-200 p-6 text-center text-sm text-neutral-500">
              조건에 맞는 메뉴를 찾지 못했어요. 도보 시간을 늘리거나 조건을 줄여보세요.
              {profile.restrictions.length > 0 && (
                <span className="mt-1 block text-xs text-neutral-400">
                  {profile.restrictions.map((r) => RESTRICTION_LABEL[r]).join(' · ')} 은(는)
                  제외한 채로 찾았어요. 이건 자동으로 풀지 않습니다.
                </span>
              )}
            </div>
          )}

          {rec.menu && (
            <MenuCard
              menu={rec.menu}
              relaxed={rec.relaxed}
              restrictions={profile.restrictions}
              decided={rec.decided}
              busy={busy}
              onLike={rec.like}
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
