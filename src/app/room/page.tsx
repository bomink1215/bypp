'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AuthBar } from '@/components/AuthBar';
import { Brand } from '@/components/Brand';
import { LocationPicker } from '@/components/LocationPicker';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getSavedNickname, getToken, saveNickname } from '@/hooks/useRoom';
import { walkMinutesToRadius } from '@/lib/distance';
import { REGIONS } from '@/lib/regions';
import {
  addDays,
  defaultDate,
  defaultHour,
  formatHour,
  formatWhen,
  HOURS,
  isPast,
  MAX_DAYS_AHEAD,
  resolveWhen,
  toDateInput,
  type When,
} from '@/lib/when';
import type { CreateRoomResponse } from '@/app/api/rooms/route';

/**
 * 방 만들기 / 코드로 입장.
 *
 * 홈과 분리한 이유: 방장이 정하는 건 "**만나는** 장소"라서 홈의 "내 현재 위치"와 성격이
 * 다르다. 한 화면에 섞으면 무엇을 정하는 중인지 흐려진다. 맛·식재료 같은 취향은 여기서
 * 받지 않는다 — 그건 참가자마다 다르니 각자 방 안에서 낸다.
 */
export default function RoomEntryPage() {
  const router = useRouter();
  const geo = useGeolocation();

  const [nickname, setNickname] = useState(() => getSavedNickname());
  const [when, setWhen] = useState<When>({ kind: 'now' });
  const [walkMin, setWalkMin] = useState(10);
  const [picking, setPicking] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eatAt = useMemo(() => resolveWhen(when), [when]);
  const past = useMemo(() => isPast(when), [when]);
  // 오늘부터 MAX_DAYS_AHEAD일 뒤까지. 방은 그 약속이 지날 때까지 살아 있어야 한다.
  const dateRange = useMemo(() => {
    const today = new Date();
    return { min: toDateInput(today), max: toDateInput(addDays(today, MAX_DAYS_AHEAD)) };
  }, []);
  const canCreate = Boolean(geo.coords) && nickname.trim().length > 0 && !past && !busy;

  const create = async () => {
    if (!geo.coords) return;
    setBusy(true);
    setError(null);
    try {
      saveNickname(nickname.trim());
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: getToken(),
          nickname: nickname.trim(),
          lat: geo.coords.lat,
          lng: geo.coords.lng,
          placeLabel: geo.label || '만나는 곳',
          walkMin,
          eatAt: eatAt.toISOString(),
        }),
      });
      const data = (await res.json()) as CreateRoomResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? '방을 만들지 못했어요.');
      router.push(`/room/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류');
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-5 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <Brand />
        <AuthBar />
      </div>

      <header>
        <Link
          href="/recommend"
          className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800"
        >
          ← 혼자 고르기
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight">친구와 함께 정하기</h1>
        <p className="mt-1 text-sm text-neutral-500">
          만날 곳과 시간을 정하고 링크를 공유하면, 각자 조건을 내고 투표해서 정해요.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-400">어디서 만나나요?</h2>

          {picking ? (
            <LocationPicker
              initial={geo.coords}
              onPick={(c, name) => {
                geo.setManual(c, name);
                setPicking(false);
              }}
              onCancel={() => setPicking(false)}
            />
          ) : (
            <>
              {geo.status === 'ready' && (
                <p className="rounded-xl bg-neutral-50 px-3 py-2.5 text-sm font-medium">
                  {geo.label}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className="rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-medium"
                >
                  지도에서 찍기
                </button>
                <button
                  type="button"
                  onClick={geo.request}
                  disabled={geo.status === 'loading'}
                  className="rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {geo.status === 'loading' ? '확인 중…' : '현재 위치'}
                </button>
              </div>

              <select
                defaultValue=""
                onChange={(e) => {
                  const r = REGIONS.find((x) => x.id === e.target.value);
                  if (r) geo.setManual({ lat: r.lat, lng: r.lng }, r.name);
                }}
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2.5 text-sm"
              >
                <option value="" disabled>
                  지역으로 선택
                </option>
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <p className="text-[11px] text-neutral-400">
            여기가 방의 기준이 돼요. 참가자는 위치를 켤 필요가 없습니다.
          </p>
        </div>

        <div className="space-y-2 border-t border-neutral-100 pt-4">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-400">언제 먹나요?</h2>
          <div className="flex flex-wrap items-center gap-2">
            {(['now', 'date'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() =>
                  when.kind !== kind &&
                  setWhen(
                    kind === 'now'
                      ? { kind }
                      : { kind, date: defaultDate(), hour: defaultHour() },
                  )
                }
                aria-pressed={when.kind === kind}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  when.kind === kind
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {kind === 'now' ? '지금' : '날짜·시간 설정'}
              </button>
            ))}
            {when.kind === 'now' && <span className="text-xs text-neutral-400">바로 만나요</span>}
          </div>

          {/* 약속은 며칠 뒤일 수 있다. 혼자 고르기와 달리 날짜를 받는다(lib/when.ts). */}
          {when.kind === 'date' && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="date"
                  value={when.date}
                  min={dateRange.min}
                  max={dateRange.max}
                  onChange={(e) => e.target.value && setWhen({ ...when, date: e.target.value })}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                  aria-label="날짜"
                />
                <select
                  value={when.hour}
                  onChange={(e) => setWhen({ ...when, hour: Number(e.target.value) })}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                  aria-label="시각"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {formatHour(h)}
                    </option>
                  ))}
                </select>
              </div>
              <p className={`text-xs ${past ? 'text-red-600' : 'text-neutral-500'}`}>
                {past ? '이미 지난 시각이에요. 다시 골라주세요.' : `${formatWhen(when)}에 만나요`}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-neutral-100 pt-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-neutral-400">얼마나 걸어서?</h2>
            <span className="text-sm">
              도보 {walkMin}분
              <span className="ml-1 text-xs text-neutral-400">
                (반경 약 {walkMinutesToRadius(walkMin)}m)
              </span>
            </span>
          </div>
          <input
            type="range"
            min={3}
            max={30}
            step={1}
            value={walkMin}
            onChange={(e) => setWalkMin(Number(e.target.value))}
            className="w-full text-brand"
            aria-label="도보 시간"
          />
        </div>

        <div className="space-y-2 border-t border-neutral-100 pt-4">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-400">어떻게 부를까요?</h2>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={12}
            placeholder="닉네임 (최대 12자)"
            className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2.5 text-sm"
          />
        </div>

        <button
          type="button"
          disabled={!canCreate}
          onClick={() => void create()}
          className="w-full rounded-2xl bg-brand px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-brand/25 transition-colors hover:bg-brand-strong disabled:opacity-40"
        >
          {busy
            ? '만드는 중…'
            : !geo.coords
              ? '먼저 만날 곳을 정해주세요'
              : past
                ? '지난 시각은 고를 수 없어요'
              : nickname.trim().length === 0
                ? '닉네임을 입력해주세요'
                : '방 만들기'}
        </button>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </section>

      <section className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-xs font-semibold tracking-wide text-neutral-400">
          이미 만들어진 방이 있다면
        </h2>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="6자리 코드"
          className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2.5 text-center text-lg font-semibold tracking-[0.3em]"
        />
        <button
          type="button"
          disabled={code.length !== 6}
          onClick={() => router.push(`/room/${code}`)}
          className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium disabled:opacity-40"
        >
          코드로 입장
        </button>
      </section>
    </main>
  );
}
