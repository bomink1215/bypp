'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { getSavedNickname, getToken, saveNickname } from '@/hooks/useRoom';
import type { CreateRoomResponse } from '@/app/api/rooms/route';
import type { Coords } from '@/hooks/useGeolocation';

type Props = {
  /** 방장이 정한 만나는 장소. 아직 위치를 안 정했으면 null. */
  coords: Coords | null;
  placeLabel: string;
  walkMin: number;
  eatAt: Date;
};

/**
 * 같이 고르기 진입점.
 *
 * 방을 만들 때는 **방장이 정한 위치**가 그대로 방의 기준이 된다. 참가자에게 위치 권한을
 * 따로 묻지 않으므로 마찰이 적다.
 */
export function RoomLauncher({ coords, placeLabel, walkMin, eatAt }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle');
  const [nickname, setNickname] = useState(() => getSavedNickname());
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!coords) return;
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
          lat: coords.lat,
          lng: coords.lng,
          placeLabel,
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

  if (mode === 'idle') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('create')}
          className="rounded-2xl border border-neutral-300 px-4 py-3 text-sm font-medium dark:border-neutral-700"
        >
          같이 고르기
        </button>
        <button
          type="button"
          onClick={() => setMode('join')}
          className="rounded-2xl border border-neutral-300 px-4 py-3 text-sm font-medium dark:border-neutral-700"
        >
          코드로 입장
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">
          {mode === 'create' ? '같이 고르기' : '코드로 입장'}
        </h3>
        <button
          type="button"
          onClick={() => {
            setMode('idle');
            setError(null);
          }}
          className="text-xs text-neutral-400 underline underline-offset-2"
        >
          닫기
        </button>
      </div>

      {mode === 'create' ? (
        <>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            지금 정한 <span className="font-medium">{placeLabel}</span> · 도보 {walkMin}분이 방의
            기준이 돼요. 참가자는 위치를 켜지 않아도 됩니다.
          </p>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={12}
            placeholder="닉네임 (최대 12자)"
            className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2.5 text-sm dark:border-neutral-700"
          />
          <button
            type="button"
            disabled={!coords || nickname.trim().length === 0 || busy}
            onClick={() => void create()}
            className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {!coords ? '먼저 위치를 정해주세요' : busy ? '만드는 중…' : '방 만들기'}
          </button>
        </>
      ) : (
        <>
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
            className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            입장하기
          </button>
        </>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
