'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AuthBar } from '@/components/AuthBar';
import { LocationPicker } from '@/components/LocationPicker';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getSavedNickname, getToken, saveNickname } from '@/hooks/useRoom';
import { walkMinutesToRadius } from '@/lib/distance';
import { REGIONS } from '@/lib/regions';
import { formatWhen, resolveWhen, type When } from '@/lib/when';
import type { CreateRoomResponse } from '@/app/api/rooms/route';

const HOURS = [7, 8, 9, 11, 12, 13, 15, 17, 18, 19, 20, 21, 22, 23, 1, 3];

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
  const canCreate = Boolean(geo.coords) && nickname.trim().length > 0 && !busy;

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
        <Link
          href="/recommend"
          className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          ← 혼자 고르기
        </Link>
        <AuthBar />
      </div>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">친구와 함께 정하기</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          만날 곳과 시간을 정하고 링크를 공유하면, 각자 조건을 내고 투표해서 정해요.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
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
                <p className="rounded-xl bg-neutral-50 px-3 py-2.5 text-sm font-medium dark:bg-neutral-800/50">
                  {geo.label}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className="rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-medium dark:border-neutral-700"
                >
                  지도에서 찍기
                </button>
                <button
                  type="button"
                  onClick={geo.request}
                  disabled={geo.status === 'loading'}
                  className="rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
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
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2.5 text-sm dark:border-neutral-700"
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

        <div className="space-y-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-400">언제 먹나요?</h2>
          <div className="flex flex-wrap items-center gap-2">
            {(['now', 'today', 'tomorrow'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setWhen(kind === 'now' ? { kind } : { kind, hour: 12 })}
                aria-pressed={when.kind === kind}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  when.kind === kind
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                {kind === 'now' ? '지금' : kind === 'today' ? '오늘' : '내일'}
              </button>
            ))}

            {when.kind !== 'now' && (
              <select
                value={when.hour}
                onChange={(e) => setWhen({ kind: when.kind, hour: Number(e.target.value) })}
                className="rounded-full border border-neutral-200 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h < 12 ? '오전' : '오후'} {h % 12 === 0 ? 12 : h % 12}시
                  </option>
                ))}
              </select>
            )}
            <span className="text-xs text-neutral-400">{formatWhen(when)}</span>
          </div>
        </div>

        <div className="space-y-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
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
            className="w-full accent-neutral-900 dark:accent-white"
            aria-label="도보 시간"
          />
        </div>

        <div className="space-y-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-400">어떻게 부를까요?</h2>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={12}
            placeholder="닉네임 (최대 12자)"
            className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2.5 text-sm dark:border-neutral-700"
          />
        </div>

        <button
          type="button"
          disabled={!canCreate}
          onClick={() => void create()}
          className="w-full rounded-2xl bg-neutral-900 px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
        >
          {busy
            ? '만드는 중…'
            : !geo.coords
              ? '먼저 만날 곳을 정해주세요'
              : nickname.trim().length === 0
                ? '닉네임을 입력해주세요'
                : '방 만들기'}
        </button>

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </section>

      <section className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-xs font-semibold tracking-wide text-neutral-400">
          이미 만들어진 방이 있다면
        </h2>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="6자리 코드"
          className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2.5 text-center text-lg font-semibold tracking-[0.3em] dark:border-neutral-700"
        />
        <button
          type="button"
          disabled={code.length !== 6}
          onClick={() => router.push(`/room/${code}`)}
          className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium disabled:opacity-40 dark:border-neutral-700"
        >
          코드로 입장
        </button>
      </section>
    </main>
  );
}
