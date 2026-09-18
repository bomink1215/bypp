'use client';

import { useEffect, useRef, useState } from 'react';

import type { RoomStatus } from '@/lib/room/types';

/** 알림을 띄울 전환. 메뉴가 정해졌을 때와 가게가 정해졌을 때. */
export type DecisionAlert = 'menu' | 'place';

function alertFor(status: RoomStatus): DecisionAlert | null {
  if (status === 'decided') return 'menu';
  if (status === 'place_decided') return 'place';
  return null;
}

/**
 * 방이 "정해졌다"로 바뀌는 순간을 알린다.
 *
 * 투표가 모두 끝나면 자동으로 마감되므로, 마지막 표를 던진 사람 말고는 언제 정해졌는지
 * 모른다. 3초 폴링으로 바뀐 걸 알아채면
 *  - 화면 안에서는 확인 창을 띄우고
 *  - 다른 탭을 보고 있으면 브라우저 알림을 보낸다(권한을 준 경우만).
 *
 * **처음 불러왔을 때 이미 정해져 있으면 알리지 않는다.** 전환을 본 경우에만 알린다 —
 * 새로고침할 때마다 창이 뜨면 방해가 된다.
 *
 * 한계: 페이지가 열려 있어야 한다. 브라우저를 닫은 사람에게 보내려면 서비스 워커와
 * 푸시 서버가 필요하다.
 */
export function useDecisionAlert(status: RoomStatus | null, title: (a: DecisionAlert) => string) {
  const [seen, setSeen] = useState<RoomStatus | null>(status);
  const [alert, setAlert] = useState<DecisionAlert | null>(null);

  // 렌더 중에 이전 값과 비교해 상태를 맞춘다. effect에서 setState로 하면 한 번 더 렌더된다.
  if (status !== seen) {
    setSeen(status);
    const next = status ? alertFor(status) : null;
    if (seen !== null && next) setAlert(next);
  }

  // 시스템 알림은 화면 밖의 부수효과라 effect에서 보낸다.
  const prevRef = useRef<RoomStatus | null>(status);
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = status;
    if (prev === null || !status || prev === status) return;

    const next = alertFor(status);
    if (!next) return;

    navigator.vibrate?.(200);
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title(next), { icon: '/icon.png' });
    }
  }, [status, title]);

  return { alert, dismiss: () => setAlert(null) };
}

/**
 * 브라우저 알림 권한을 묻는다. 투표 버튼처럼 **사용자가 직접 누른 순간에만** 부를 것 —
 * 페이지를 열자마자 물으면 대부분 거절하고, 한 번 거절하면 다시 물을 수 없다.
 */
export function askNotificationPermission(): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') void Notification.requestPermission();
}
