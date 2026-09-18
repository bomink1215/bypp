'use client';

import { use, useMemo, useState } from 'react';

import { OptionPanel } from '@/components/OptionPanel';
import { PlaceList } from '@/components/PlaceList';
import { PlaceMap } from '@/components/PlaceMap';
import { AuthBar } from '@/components/AuthBar';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useProfile } from '@/hooks/useProfile';
import { getSavedNickname, saveNickname, useRoom } from '@/hooks/useRoom';
import type { KakaoPlace } from '@/lib/kakao/types';
import { RESTRICTION_LABEL } from '@/lib/menu/restrictions';
import { DEFAULT_FILTERS, type MenuFilters } from '@/lib/menu/types';
import type { When } from '@/lib/when';

/** 방 참가자 화면. 조건 모으기 → 투표 → 확정을 한 페이지에서 상태로 전환한다. */
export default function RoomPage({ params }: PageProps<'/room/[code]'>) {
  const { code } = use(params);
  const room = useRoom(code.toUpperCase());
  const profile = useProfile();
  const geo = useGeolocation();
  const auth = useAuth();

  // 로그인했으면 카카오 닉네임을, 아니면 지난번에 쓴 이름을 기본값으로.
  const [nicknameInput, setNicknameInput] = useState(() => getSavedNickname());
  const nickname = nicknameInput || auth.nickname || '';
  const [joined, setJoined] = useState(false);
  const [filters, setFilters] = useState<MenuFilters>(DEFAULT_FILTERS);
  const [places, setPlaces] = useState<KakaoPlace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const state = room.state;
  const eatAt = useMemo(() => (state ? new Date(state.eatAt) : new Date()), [state]);

  const decidedMenu = useMemo(
    () => state?.candidates?.find((c) => c.menu.id === state.decidedMenuId)?.menu ?? null,
    [state],
  );

  // 확정되면 그 메뉴를 파는 가게를 불러온다. 방장이 정한 위치 기준이다.
  const loadPlaces = async () => {
    if (!state || !decidedMenu) return;
    const res = await fetch(
      `/api/places?menuId=${decidedMenu.id}&lat=${state.lat}&lng=${state.lng}&walkMin=${state.walkMin}`,
    );
    if (res.ok) setPlaces(((await res.json()) as { places: KakaoPlace[] }).places);
  };

  if (!state) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <p className="text-center text-sm text-neutral-500">
          {room.error ?? '방을 불러오는 중…'}
        </p>
      </main>
    );
  }

  const everyoneSubmitted = state.members.length > 0 && state.members.every((m) => m.submitted);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-6">
      <div>
        <AuthBar />
      </div>

      <header>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">같이 고르기 · {state.code}</p>
        <h1 className="mt-1 text-xl font-bold">{state.placeLabel}</h1>
        <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
          도보 {state.walkMin}분 이내 ·{' '}
          {eatAt.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric' })}
        </p>
      </header>

      {/* 참가자 현황 — 누가 들어왔고 누가 냈는지 */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-xs font-semibold tracking-wide text-neutral-400">
          참가자 {state.members.length}명
        </h2>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {state.members.map((m) => {
            const done = state.status === 'collecting' ? m.submitted : m.voted;
            return (
              <li
                key={m.nickname}
                className={`rounded-full px-3 py-1 text-sm ${
                  done
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                }`}
              >
                {m.nickname}
                {done ? ' ✓' : ''}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[11px] text-neutral-400">
          {state.status === 'collecting' ? '체크된 사람은 조건을 냈어요' : '체크된 사람은 투표했어요'}
        </p>
      </section>

      {room.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {room.error}
        </p>
      )}

      {/* 1) 입장 — 닉네임을 정해야 참가자로 잡힌다 */}
      {!joined && !state.hasSubmitted && (
        <section className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <label htmlFor="nickname" className="text-sm font-medium">
            어떻게 부를까요?
          </label>
          <input
            id="nickname"
            value={nickname}
            onChange={(e) => setNicknameInput(e.target.value)}
            maxLength={12}
            placeholder="닉네임 (최대 12자)"
            className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2.5 text-sm dark:border-neutral-700"
          />
          <button
            type="button"
            disabled={nickname.trim().length === 0 || room.busy}
            onClick={async () => {
              saveNickname(nickname.trim());
              await room.join(nickname.trim());
              setJoined(true);
            }}
            className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            입장하기
          </button>
        </section>
      )}

      {/* 2) 조건 내기 */}
      {state.status === 'collecting' && (joined || state.hasSubmitted) && (
        <section className="space-y-3">
          {state.hasSubmitted ? (
            <p className="rounded-2xl border border-neutral-200 bg-white p-4 text-center text-sm dark:border-neutral-800 dark:bg-neutral-900">
              조건을 냈어요. 다른 사람을 기다리는 중…
            </p>
          ) : (
            <>
              <OptionPanel
                when={{ kind: 'now' } as When}
                onWhenChange={() => {}}
                walkMin={state.walkMin}
                onWalkMinChange={() => {}}
                filters={filters}
                onFiltersChange={setFilters}
                geoStatus="ready"
                locationLabel={state.placeLabel}
                onRequestLocation={() => {}}
                onPickRegion={() => {}}
                restrictions={profile.restrictions}
                onToggleRestriction={profile.toggle}
                currentCoords={geo.coords}
                hideLocationAndTime
              />
              <button
                type="button"
                disabled={room.busy}
                onClick={() => void room.submit(filters, profile.restrictions)}
                className="w-full rounded-2xl bg-neutral-900 px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
              >
                이 조건으로 낼게요
              </button>
            </>
          )}

          {state.isHost && (
            <button
              type="button"
              disabled={room.busy}
              onClick={() => void room.start()}
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm font-medium disabled:opacity-40 dark:border-neutral-700"
            >
              {everyoneSubmitted ? '모두 냈어요 — 후보 뽑기' : '지금까지 낸 조건으로 후보 뽑기'}
            </button>
          )}
        </section>
      )}

      {/* 3) 투표 */}
      {state.status === 'voting' && state.candidates && (
        <section className="space-y-3">
          <ConditionNotes state={state} />

          <ul className="space-y-2">
            {state.candidates.map((c) => {
              const count = state.tally.find((t) => t.menuId === c.menu.id)?.count ?? 0;
              const mine = state.myVote === c.menu.id;
              return (
                <li key={c.menu.id}>
                  <button
                    type="button"
                    disabled={room.busy}
                    onClick={() => void room.vote(c.menu.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors disabled:opacity-40 ${
                      mine
                        ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                        : 'border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span className="font-medium">{c.menu.name}</span>
                    <span className="text-sm tabular-nums">{count}표</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {state.isHost && (
            <button
              type="button"
              disabled={room.busy}
              onClick={() => void room.decide()}
              className="w-full rounded-2xl bg-neutral-900 px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
            >
              투표 마감하고 정하기
            </button>
          )}
        </section>
      )}

      {/* 4) 확정 */}
      {state.status === 'decided' && decidedMenu && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">오늘의 결정</p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight">{decidedMenu.name}</h2>
            {places.length === 0 && (
              <button
                type="button"
                onClick={() => void loadPlaces()}
                className="mt-4 w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
              >
                근처 가게 보기
              </button>
            )}
          </div>

          {places.length > 0 && (
            <>
              <div className="h-[260px]">
                <PlaceMap
                  center={{ lat: state.lat, lng: state.lng }}
                  places={places}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </div>
              <PlaceList
                places={places}
                at={eatAt}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </>
          )}
        </section>
      )}
    </main>
  );
}

/** 합치는 과정에서 무엇이 빠졌고 무엇이 충돌했는지. 조용히 넘어가지 않는다. */
function ConditionNotes({ state }: { state: NonNullable<ReturnType<typeof useRoom>['state']> }) {
  if (state.restrictions.length === 0 && state.conflicts.length === 0) return null;

  return (
    <div className="space-y-1 rounded-xl bg-neutral-50 px-3 py-2.5 text-xs text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-300">
      {state.restrictions.length > 0 && (
        <p>{state.restrictions.map((r) => RESTRICTION_LABEL[r]).join(' · ')} 은(는) 빼고 뽑았어요.</p>
      )}
      {state.conflicts.length > 0 && (
        <p>
          {state.conflicts.map((c) => c.label).join(', ')} 조건은 서로 달라서 해제했어요.
        </p>
      )}
    </div>
  );
}
