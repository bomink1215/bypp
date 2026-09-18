'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

import type { Coords } from '@/hooks/useGeolocation';
import type { KakaoPlace } from '@/lib/kakao/types';

type Props = {
  center: Coords;
  places: KakaoPlace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

/** 내 위치 표시용 점. 가게 마커(기본 핀)와 구분되게 둔다. */
const ME_ICON =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"><circle cx="11" cy="11" r="7" fill="#2563eb" stroke="white" stroke-width="3"/></svg>`,
  );

/**
 * 결과 가게를 지도에 표시한다.
 *
 * SDK는 `autoload=false`로 불러온다. 스크립트가 붙자마자 지도를 만들려 하면
 * 내부 모듈이 아직 준비되지 않아 터지므로, 반드시 `kakao.maps.load()` 콜백 안에서만
 * 지도와 마커를 만든다.
 */
export function PlaceMap({ center, places, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const markersRef = useRef<kakao.maps.Marker[]>([]);
  const [ready, setReady] = useState(false);

  // 지도 생성 (한 번만)
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current || !window.kakao) return;

    // 카카오는 x=경도 / y=위도지만 LatLng 생성자는 (위도, 경도) 순이다.
    // 이 순서를 뒤집으면 마커가 서해에 찍힌다.
    mapRef.current = new window.kakao.maps.Map(containerRef.current, {
      center: new window.kakao.maps.LatLng(center.lat, center.lng),
      level: 4,
    });
  }, [ready, center.lat, center.lng]);

  // 마커 갱신
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !window.kakao) return;

    const maps = window.kakao.maps;

    for (const m of markersRef.current) m.setMap(null);
    markersRef.current = [];

    const bounds = new maps.LatLngBounds();

    const me = new maps.LatLng(center.lat, center.lng);
    const meMarker = new maps.Marker({
      position: me,
      map,
      title: '내 위치',
      image: new maps.MarkerImage(ME_ICON, new maps.Size(22, 22)),
      zIndex: 1,
    });
    markersRef.current.push(meMarker);
    bounds.extend(me);

    for (const p of places) {
      const pos = new maps.LatLng(Number(p.y), Number(p.x));
      const marker = new maps.Marker({
        position: pos,
        map,
        title: p.place_name,
        zIndex: p.id === selectedId ? 5 : 2,
      });
      maps.event.addListener(marker, 'click', () => onSelect(p.id));
      markersRef.current.push(marker);
      bounds.extend(pos);
    }

    if (places.length > 0) map.setBounds(bounds);
    else map.setCenter(me);
  }, [ready, places, center.lat, center.lng, selectedId, onSelect]);

  if (!JS_KEY) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-xs text-neutral-500">
        지도를 보려면 <code className="mx-1">NEXT_PUBLIC_KAKAO_JS_KEY</code>를 설정하고, 그 키의
        JavaScript SDK 도메인에 <code className="mx-1">http://localhost:3000</code>을 등록하세요.
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${JS_KEY}&autoload=false`}
        strategy="afterInteractive"
        onReady={() => window.kakao?.maps.load(() => setReady(true))}
      />
      <div
        ref={containerRef}
        className="h-full min-h-[240px] w-full overflow-hidden rounded-2xl border border-neutral-200"
      />
    </>
  );
}
