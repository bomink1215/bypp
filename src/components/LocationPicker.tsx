'use client';

import Image from 'next/image';
import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Coords } from '@/hooks/useGeolocation';
import type { GeocodeResponse } from '@/app/api/geocode/route';
import type { SearchLocationResponse } from '@/app/api/search-location/route';
import type { LocationHit } from '@/lib/kakao/search';

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

  /*
   * 이름으로 찾기. 노트북에서 지도를 끌어 먼 곳까지 가기가 불편하다는 피드백으로 붙였다.
   * 결과를 누르면 지도만 옮기고, 최종 확정은 여전히 "여기로 정하기"로 한다 — 역 출구처럼
   * 조금 옮겨서 고르고 싶을 수 있다.
   */
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationHit[] | null>(null);
  const [searching, setSearching] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    try {
      const res = await fetch(`/api/search-location?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as SearchLocationResponse & { error?: string };
      setResults(res.ok ? data.results : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const moveTo = (hit: LocationHit) => {
    setResults(null);
    setQuery(hit.name);
    centerRef.current = { lat: hit.lat, lng: hit.lng };
    // 지도가 멈추면 idle 이벤트가 주소를 다시 물어본다.
    mapRef.current?.setCenter(new window.kakao.maps.LatLng(hit.lat, hit.lng));
  };

  if (!JS_KEY) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-xs text-neutral-500">
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

      <form onSubmit={(e) => void search(e)} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={40}
          placeholder="역·건물·동네 이름으로 찾기"
          aria-label="장소 검색"
          className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={searching || query.trim().length === 0}
          className="shrink-0 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {searching ? '찾는 중…' : '찾기'}
        </button>
      </form>

      {results && (
        <ul className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-xs text-neutral-500">찾지 못했어요. 다른 이름으로 검색해보세요.</li>
          ) : (
            results.map((hit) => (
              <li key={`${hit.lat},${hit.lng},${hit.name}`} className="border-t border-neutral-100 first:border-0">
                <button
                  type="button"
                  onClick={() => moveTo(hit)}
                  className="block w-full px-3 py-2.5 text-left hover:bg-neutral-50"
                >
                  <span className="block truncate text-sm font-medium">{hit.name}</span>
                  <span className="block truncate text-xs text-neutral-500">{hit.address}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      <div className="relative h-56 overflow-hidden rounded-2xl border border-neutral-200">
        <div ref={containerRef} className="h-full w-full" />

        {/* 화면 중앙 고정 핀. 지도가 움직여도 여기가 항상 선택 지점이다. 핀 끝이 중앙에 오도록 위로 올린다. */}
        <Image
          src="/logo-mark.png"
          alt=""
          aria-hidden
          width={27}
          height={36}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full drop-shadow-md"
        />
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
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-brand/25 transition-colors hover:bg-brand-strong"
        >
          여기로 정하기
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
        >
          취소
        </button>
      </div>
    </div>
  );
}
