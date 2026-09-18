'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Restriction } from '@/lib/menu/restrictions';
import type { MenuFilters } from '@/lib/menu/types';
import type { RoomState } from '@/lib/room/types';

/** 방 상태를 몇 초마다 다시 읽을지. 3초면 체감상 실시간과 거의 같다. */
const POLL_MS = 3000;

const TOKEN_KEY = 'bypp.token.v1';
const NICKNAME_KEY = 'bypp.nickname.v1';

/**
 * 참가자 토큰.
 *
 * 로그인이 없으므로 브라우저가 만든 임의 문자열이 신원 역할을 한다. 한 번 만들면
 * 계속 재사용해야 새로고침해도 "아까 그 사람"으로 인식된다.
 */
export function getToken(): string {
  try {
    const existing = localStorage.getItem(TOKEN_KEY);
    if (existing) return existing;

    const fresh = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, fresh);
    return fresh;
  } catch {
    // 저장소가 막히면 세션 동안만 유효한 토큰을 쓴다. 새로고침하면 새 사람이 된다.
    return crypto.randomUUID();
  }
}

export function getSavedNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveNickname(name: string): void {
  try {
    localStorage.setItem(NICKNAME_KEY, name);
  } catch {
    // 무시. 다음에 다시 입력하면 된다.
  }
}

async function post(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? `요청 실패 (${res.status})`);
  }
}

/** 방 하나를 구독한다. 3초 폴링으로 참가자·투표 현황을 따라간다. */
export function useRoom(code: string) {
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tokenRef = useRef<string>('');

  const refresh = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;

    try {
      const res = await fetch(`/api/rooms/${code}?token=${encodeURIComponent(token)}`);
      const data = (await res.json()) as RoomState & { error?: string };
      if (!res.ok) {
        setError(data.error ?? '방을 불러오지 못했어요.');
        return;
      }
      setState(data);
      setError(null);
    } catch {
      // 일시적인 네트워크 오류로 화면을 비우지 않는다. 다음 폴링에서 회복된다.
    }
  }, [code]);

  useEffect(() => {
    tokenRef.current = getToken();
    void refresh();

    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  /** 액션은 전부 "보내고 곧바로 다시 읽기"다. 폴링을 기다리지 않아 반응이 즉각적이다. */
  const act = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      setError(null);
      try {
        await fn();
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : '알 수 없는 오류');
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return {
    state,
    error,
    busy,
    join: (nickname: string) =>
      act(() => post(`/api/rooms/${code}/join`, { token: tokenRef.current, nickname })),
    submit: (filters: MenuFilters, restrictions: readonly Restriction[]) =>
      act(() =>
        post(`/api/rooms/${code}/submit`, {
          token: tokenRef.current,
          filters,
          restrictions,
        }),
      ),
    start: () => act(() => post(`/api/rooms/${code}/start`, { token: tokenRef.current })),
    vote: (menuId: string) =>
      act(() => post(`/api/rooms/${code}/vote`, { token: tokenRef.current, menuId })),
    decide: () => act(() => post(`/api/rooms/${code}/decide`, { token: tokenRef.current })),
  };
}
