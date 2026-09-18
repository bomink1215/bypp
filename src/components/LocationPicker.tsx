'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Coords } from '@/hooks/useGeolocation';
import type { GeocodeResponse } from '@/app/api/geocode/route';

type Props = {
  /** 지도를 처음 띄울 중심. 보통 현재 위치이고, 없으면 서울시청. */
  initial: Coords | null;
  onPick: (coords: Coords, label: string) => void;
  onCancel: () => void;
};

const JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
const SEOUL: Coords = { lat: 37.5665, lng: 126.978 };

/**
 * 지도를 움직여 한 지점을 고른다.
 *
 * 마커를 끄는 대신 **지도를 움직이고 화면 중앙의 고정 핀이 가리키는 곳**을 고르는 방식이다.
 * 손가락이 핀을 가리지 않아 모바일에서 훨씬 정확하다. 지도 이동이 멈추면 그때 주소를
 * 물어본다(움직이는 내내 부르면 쿼터를 낭비한다).
 */
export function LocationPicker({ initial, onPick, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const centerRef = useRef<Coords>(initial ?? SEOUL);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookUp = useCallback(async (coords: Coords) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/geocode?lat=${coords.lat}&lng=${coords.lng}`);
      const data = (await res.json()) as GeocodeResponse & { error?: string };
      setLabel(res.ok ? data.label : null);
    } catch {
      setLabel(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current || !window.kakao) return;

    const maps = window.kakao.maps;
    const start = centerRef.current;

    // LatLng는 (위도, 경도) 순이다. 카카오 REST의 x/y와 반대라 여기서 헷갈리기 쉽다.
    const map = new maps.Map(containerRef.current, {
      center: new maps.LatLng(start.lat, start.lng),
      level: 4,
    });
    mapRef.current = map;

    maps.event.addListener(map, 'idle', () => {
      const c = map.getCenter();
      const next = { lat: c.getLat(), lng: c.getLng() };
      centerRef.current = next;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void lookUp(next), 300);
    });

    void lookUp(start);
  }, [ready, lookUp]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!JS_KEY) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-xs text-neutral-500 dark:border-neutral-700">
        지도를 쓰려면 <code>NEXT_PUBLIC_KAKAO_JS_KEY</code>가 필요합니다.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${JS_KEY}&autoload=false`}
        strategy="afterInteractive"
        onReady={() => window.kakao?.maps.load(() => setReady(true))}
      />

      <div className="relative h-56 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <div ref={containerRef} className="h-full w-full" />

        {/* 화면 중앙 고정 핀. 지도가 움직여도 여기가 항상 선택 지점이다. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-2xl drop-shadow"
        >
          📍
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="min-w-0 flex-1 truncate">
          {loading ? (
            <span className="text-neutral-400">주소 확인 중…</span>
          ) : (
            label ?? <span className="text-neutral-400">주소를 찾지 못했어요</span>
          )}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          onClick={() => onPick(centerRef.current, label ?? '지도에서 고른 위치')}
          className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          여기로 정하기
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm dark:border-neutral-700"
        >
          취소
        </button>
      </div>
    </div>
  );
}
