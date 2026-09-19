'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';

import { AuthBar } from '@/components/AuthBar';
import { Brand } from '@/components/Brand';
import { OptionPanel } from '@/components/OptionPanel';
import { PlaceList } from '@/components/PlaceList';
import { PlaceMap } from '@/components/PlaceMap';
import { ShareRoomButton } from '@/components/ShareRoomButton';
import { useAuth } from '@/hooks/useAuth';
import { askNotificationPermission, useDecisionAlert, type DecisionAlert } from '@/hooks/useDecisionAlert';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useProfile } from '@/hooks/useProfile';
import { getSavedNickname, saveNickname, useRoom } from '@/hooks/useRoom';
import { formatDistance } from '@/lib/distance';
import type { KakaoPlace } from '@/lib/kakao/types';
import { RESTRICTION_LABEL } from '@/lib/menu/restrictions';
import { DEFAULT_FILTERS, type MenuFilters } from '@/lib/menu/types';
import { getPreferencesSnapshot, recordEaten, setPreferences } from '@/lib/preference/store';
import type { RoomState } from '@/lib/room/types';
import type { When } from '@/lib/when';

const PRIMARY =
  'w-full rounded-2xl bg-brand px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-brand/25 transition-colors hover:bg-brand-strong disabled:opacity-40';
const SECONDARY =
  'w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium disabled:opacity-40';

/**
 * 방 참가자 화면. 한 페이지에서 상태로 전환한다.
 *
 *   조건 모으기 → 메뉴 투표 → 메뉴 확정 → (원하면) 가게 투표 → 가게 확정
 *
 * 투표는 모두 표를 내면 서버가 자동으로 마감한다. 방장은 안 오는 사람을 기다리지 않도록
 * 수동으로 마감할 수도 있다.
 */
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
  const decidedPlace = useMemo(
    () => state?.placeCandidates?.find((p) => p.id === state.decidedPlaceId) ?? null,
    [state],
  );

  const alertTitle = useCallback(
    (a: DecisionAlert) =>
      a === 'menu'
        ? `메뉴가 정해졌어요: ${decidedMenu?.name ?? ''}`
        : `가게가 정해졌어요: ${decidedPlace?.place_name ?? ''}`,
    [decidedMenu, decidedPlace],
  );
  const decision = useDecisionAlert(state?.status ?? null, alertTitle);

  /*
   * 정해진 메뉴를 이 기기의 "최근 먹은 것"에 남긴다. 다음 혼자 고르기에서 며칠 덜 나온다.
   * 시각은 정한 때가 아니라 먹기로 한 때다 — 사흘 뒤 약속이면 그날부터 센다.
   * 취향 카운트는 건드리지 않는다. 투표로 정해진 메뉴는 내가 원한 게 아닐 수 있다.
   */
  const decidedMenuId = state?.decidedMenuId ?? null;
  const eatAtMs = eatAt.getTime();
  useEffect(() => {
    if (!decidedMenuId) return;
    const prefs = getPreferencesSnapshot();
    if (prefs.eaten?.[decidedMenuId] === eatAtMs) return;
    setPreferences(recordEaten(prefs, decidedMenuId, eatAtMs));
  }, [decidedMenuId, eatAtMs]);

  // 가게를 투표 없이 둘러만 볼 때. 방장이 정한 위치 기준이다.
  const browsePlaces = async () => {
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
  const choosingPlace = state.status === 'place_voting' || state.status === 'place_decided';

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <Brand />
        <AuthBar />
      </div>

      <header>
        <p className="text-xs text-neutral-500">같이 고르기 · {state.code}</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">{state.placeLabel}</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          도보 {state.walkMin}분 이내 ·{' '}
          {eatAt.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric' })}
        </p>
      </header>

      {/* 입장은 조건을 모으는 동안만 된다. 그 뒤에 링크를 받아도 들어올 수 없으니 그때만 띄운다. */}
      {state.status === 'collecting' && (
        <ShareRoomButton code={state.code} placeLabel={state.placeLabel} />
      )}

      <Members state={state} />

      {room.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {room.error}
        </p>
      )}

      {/* 1) 입장 — 닉네임을 정해야 참가자로 잡힌다 */}
      {state.status === 'collecting' && !joined && !state.hasSubmitted && (
        <section className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-4">
          <label htmlFor="nickname" className="text-sm font-medium">
            어떻게 부를까요?
          </label>
          <input
            id="nickname"
            value={nickname}
            onChange={(e) => setNicknameInput(e.target.value)}
            maxLength={12}
            placeholder="닉네임 (최대 12자)"
            className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2.5 text-sm"
          />
          <button
            type="button"
            disabled={nickname.trim().length === 0 || room.busy}
            onClick={async () => {
              saveNickname(nickname.trim());
              await room.join(nickname.trim());
              setJoined(true);
            }}
            className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-brand/25 transition-colors hover:bg-brand-strong disabled:opacity-40"
          >
            입장하기
          </button>
        </section>
      )}

      {/* 2) 조건 내기 */}
      {state.status === 'collecting' && (joined || state.hasSubmitted) && (
        <section className="space-y-3">
          {state.hasSubmitted ? (
            <p className="rounded-2xl border border-neutral-200 bg-white p-4 text-center text-sm">
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
                defaultExpanded
              />
              <button
                type="button"
                disabled={room.busy}
                onClick={() => void room.submit(filters, profile.restrictions)}
                className={PRIMARY}
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
              className={SECONDARY}
            >
              {everyoneSubmitted ? '모두 냈어요 — 후보 뽑기' : '지금까지 낸 조건으로 후보 뽑기'}
            </button>
          )}
        </section>
      )}

      {/* 3) 메뉴 투표 */}
      {state.status === 'voting' && state.candidates && (
        <section className="space-y-3">
          <ConditionNotes state={state} />

          <ul className="space-y-2">
            {state.candidates.map((c) => {
              const count = state.tally.find((t) => t.menuId === c.menu.id)?.count ?? 0;
              return (
                <li key={c.menu.id}>
                  <VoteButton
                    label={c.menu.name}
                    count={count}
                    mine={state.myVote === c.menu.id}
                    disabled={room.busy}
                    onClick={() => {
                      // 투표는 사용자가 직접 누른 순간이라 알림 권한을 묻기에 알맞다.
                      askNotificationPermission();
                      void room.vote(c.menu.id);
                    }}
                  />
                </li>
              );
            })}
          </ul>

          <p className="text-center text-xs text-neutral-500">모두 투표하면 자동으로 정해져요.</p>

          {state.isHost && (
            <button
              type="button"
              disabled={room.busy}
              onClick={() => void room.decide()}
              className={SECONDARY}
            >
              기다리지 않고 지금 표로 마감하기
            </button>
          )}
        </section>
      )}

      {/* 4) 메뉴 확정 — 가게도 정할지 고른다 */}
      {state.status === 'decided' && decidedMenu && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-center">
            <p className="text-xs font-semibold text-brand">오늘의 메뉴</p>
            <h2 className="mt-1 text-3xl font-black tracking-tight">{decidedMenu.name}</h2>

            <div className="mt-5 space-y-2">
              <button
                type="button"
                disabled={room.busy}
                onClick={() => {
                  askNotificationPermission();
                  void room.startPlaceVoting();
                }}
                className={PRIMARY}
              >
                가게도 정할까요?
              </button>
              {places.length === 0 && (
                <button
                  type="button"
                  onClick={() => void browsePlaces()}
                  className="w-full py-2 text-xs text-neutral-500 underline underline-offset-2"
                >
                  아니요, 가게 목록만 볼게요
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-neutral-400">
              누구든 누르면 모두에게 가게 투표가 열려요.
            </p>
          </div>

          {places.length > 0 && (
            <PlacesWithMap
              center={{ lat: state.lat, lng: state.lng }}
              places={places}
              at={eatAt}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </section>
      )}

      {/* 5) 가게 투표 */}
      {state.status === 'place_voting' && state.placeCandidates && (
        <section className="space-y-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-center">
            <p className="text-xs text-neutral-500">
              <span className="font-semibold text-brand">{decidedMenu?.name}</span> 먹을 가게를 골라요
            </p>
          </div>

          <div className="h-[240px]">
            <PlaceMap
              center={{ lat: state.lat, lng: state.lng }}
              places={state.placeCandidates}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>

          <ul className="space-y-2">
            {state.placeCandidates.map((p) => {
              const count = state.placeTally.find((t) => t.placeId === p.id)?.count ?? 0;
              return (
                <li key={p.id}>
                  <VoteButton
                    label={p.place_name}
                    sub={`${p.category_name.replace(/^음식점 > /, '')} · ${formatDistance(Number(p.distance))}`}
                    count={count}
                    mine={state.myPlaceVote === p.id}
                    disabled={room.busy}
                    onClick={() => {
                      setSelectedId(p.id);
                      void room.votePlace(p.id);
                    }}
                  />
                  <a
                    href={p.place_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block px-4 text-right text-[11px] text-neutral-500 underline underline-offset-2"
                  >
                    카카오맵에서 영업시간·메뉴 확인 ↗
                  </a>
                </li>
              );
            })}
          </ul>

          <p className="text-center text-xs text-neutral-500">모두 투표하면 자동으로 정해져요.</p>

          {state.isHost && (
            <button
              type="button"
              disabled={room.busy}
              onClick={() => void room.decidePlace()}
              className={SECONDARY}
            >
              기다리지 않고 지금 표로 마감하기
            </button>
          )}
        </section>
      )}

      {/* 6) 가게 확정 */}
      {state.status === 'place_decided' && decidedPlace && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-center">
            <p className="text-xs font-semibold text-brand">여기서 만나요</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">{decidedPlace.place_name}</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {decidedMenu?.name} ·{' '}
              {eatAt.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric' })}
            </p>
          </div>
          <PlacesWithMap
            center={{ lat: state.lat, lng: state.lng }}
            places={[decidedPlace]}
            at={eatAt}
            selectedId={decidedPlace.id}
            onSelect={setSelectedId}
          />
        </section>
      )}

      {decision.alert && (
        <DecisionDialog
          alert={decision.alert}
          menuName={decidedMenu?.name ?? ''}
          placeName={decidedPlace?.place_name ?? ''}
          canChoosePlace={!choosingPlace}
          busy={room.busy}
          onChoosePlace={() => {
            decision.dismiss();
            void room.startPlaceVoting();
          }}
          onClose={decision.dismiss}
        />
      )}
    </main>
  );
}

/** 참가자 현황 — 지금 단계에서 할 일을 한 사람에게 체크를 붙인다. */
function Members({ state }: { state: RoomState }) {
  const done = (m: RoomState['members'][number]) => {
    switch (state.status) {
      case 'collecting':
        return m.submitted;
      case 'voting':
      case 'decided':
        return m.voted;
      case 'place_voting':
      case 'place_decided':
        return m.placeVoted;
    }
  };

  const hint =
    state.status === 'collecting'
      ? '체크된 사람은 조건을 냈어요'
      : state.status === 'place_voting' || state.status === 'place_decided'
        ? '체크된 사람은 가게에 투표했어요'
        : '체크된 사람은 메뉴에 투표했어요';

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 className="text-xs font-semibold tracking-wide text-neutral-400">
        참가자 {state.members.length}명
      </h2>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {state.members.map((m) => (
          <li
            key={m.nickname}
            className={`rounded-full px-3 py-1 text-sm ${
              done(m) ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            {m.nickname}
            {done(m) ? ' ✓' : ''}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-neutral-400">{hint}</p>
    </section>
  );
}

function VoteButton({
  label,
  sub,
  count,
  mine,
  disabled,
  onClick,
}: {
  label: string;
  sub?: string;
  count: number;
  mine: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={mine}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors disabled:opacity-40 ${
        mine ? 'border-brand bg-brand-soft' : 'border-neutral-200 bg-white hover:bg-neutral-50'
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate font-medium">{label}</span>
        {sub && <span className="mt-0.5 block truncate text-xs text-neutral-500">{sub}</span>}
      </span>
      <span
        className={`shrink-0 text-sm tabular-nums ${mine ? 'font-semibold text-brand' : 'text-neutral-500'}`}
      >
        {count}표
      </span>
    </button>
  );
}

function PlacesWithMap({
  center,
  places,
  at,
  selectedId,
  onSelect,
}: {
  center: { lat: number; lng: number };
  places: KakaoPlace[];
  at: Date;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <div className="h-[260px]">
        <PlaceMap center={center} places={places} selectedId={selectedId} onSelect={onSelect} />
      </div>
      <PlaceList places={places} at={at} selectedId={selectedId} onSelect={onSelect} />
    </>
  );
}

/**
 * "정해졌어요" 확인 창.
 *
 * 투표가 자동 마감되면 마지막 표를 낸 사람 말고는 결과가 언제 났는지 모른다. 그 순간을
 * 붙잡아 알리고, 메뉴가 정해진 경우엔 가게도 정할지 선택지를 준다.
 */
function DecisionDialog({
  alert,
  menuName,
  placeName,
  canChoosePlace,
  busy,
  onChoosePlace,
  onClose,
}: {
  alert: DecisionAlert;
  menuName: string;
  placeName: string;
  canChoosePlace: boolean;
  busy: boolean;
  onChoosePlace: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-3xl" aria-hidden>
          🎉
        </p>
        <p id="decision-title" className="mt-2 text-sm font-semibold text-brand">
          {alert === 'menu' ? '메뉴가 정해졌어요' : '가게가 정해졌어요'}
        </p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">
          {alert === 'menu' ? menuName : placeName}
        </h2>
        {alert === 'place' && <p className="mt-1 text-sm text-neutral-500">{menuName}</p>}

        <div className="mt-6 space-y-2">
          {alert === 'menu' && canChoosePlace && (
            <button type="button" disabled={busy} onClick={onChoosePlace} className={PRIMARY}>
              가게도 정할까요?
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={alert === 'menu' && canChoosePlace ? SECONDARY : PRIMARY}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

/** 합치는 과정에서 무엇이 빠졌고 무엇이 충돌했는지. 조용히 넘어가지 않는다. */
function ConditionNotes({ state }: { state: RoomState }) {
  if (state.restrictions.length === 0 && state.conflicts.length === 0) return null;

  return (
    <div className="space-y-1 rounded-xl bg-neutral-50 px-3 py-2.5 text-xs text-neutral-600">
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
