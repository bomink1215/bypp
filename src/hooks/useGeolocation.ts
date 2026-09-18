'use client';

import { useCallback, useState } from 'react';

export type Coords = { lat: number; lng: number };

export type GeoStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'unavailable';

/**
 * 현재 위치. 권한 거부 폴백이 이 훅의 존재 이유의 절반이다.
 *
 * `navigator.geolocation`은 보안 컨텍스트에서만 동작한다(localhost는 예외, 배포는
 * Vercel HTTPS). 권한 거부는 흔하므로 거부 상태를 오류로 취급하지 않고 `denied`로
 * 구분해 지역 직접 선택으로 넘긴다.
 *
 * 좌표 순서 주의: 브라우저는 latitude/longitude, 카카오는 x=경도/y=위도다.
 * 여기서는 브라우저 기준(lat, lng)으로만 다루고 변환은 카카오 호출 직전에 한 번만 한다.
 */
export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [label, setLabel] = useState<string>('');

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }

    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLabel('현재 위치');
        setStatus('ready');
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  /** 지역 직접 선택 폴백. */
  const setManual = useCallback((next: Coords, name: string) => {
    setCoords(next);
    setLabel(name);
    setStatus('ready');
  }, []);

  return { coords, status, label, request, setManual };
}
