'use client';

import { useCallback, useRef, useState, useSyncExternalStore } from 'react';

import type { KakaoPlace, PlacesResponse } from '@/lib/kakao/types';
import {
  filtersToParams,
  type Candidate,
  type CandidatesResponse,
  type Menu,
  type MenuFilters,
  type Relaxation,
} from '@/lib/menu/types';
import { EXPLORE_RATE, buildPreferenceModel } from '@/lib/preference/score';
import {
  clearPreferences,
  getPreferencesServerSnapshot,
  getPreferencesSnapshot,
  isSkippedToday,
  recordFeedback,
  setPreferences,
  subscribePreferences,
  type PreferenceState,
} from '@/lib/preference/store';
import { pickWeighted } from '@/lib/recommend';
import { serializeRestrictions, type Restriction } from '@/lib/menu/restrictions';
import type { Coords } from './useGeolocation';

export type RecStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

export type Query = {
  coords: Coords;
  walkMin: number;
  at: Date;
  filters: MenuFilters;
  /** 못 먹는 것. 서버에서 완화 없이 제외된다. */
  restrictions: readonly Restriction[];
};

/**
 * 키워드 검색이 0건인 메뉴를 만났을 때 다음 후보로 넘어가는 최대 횟수.
 *
 * 밀집 지역에서는 서버가 후보를 걸러내지 못한다(카카오 45건 노출 상한 때문에 주변
 * 업종 표본이 반경 전체를 대표하지 못한다). 그래서 실제 존재 확인이 이 루프로 넘어온다.
 * 사용자에게는 가게가 1곳 이상 잡힌 메뉴만 보여준다.
 */
const MAX_ATTEMPTS = 6;

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `요청에 실패했습니다 (${res.status})`);
  }
  return res.json() as Promise<T>;
}

/**
 * 추천 상태 기계.
 *
 * 후보 목록은 한 번만 받아서 들고 있는다. "다른거 추천해주세요"는 이 목록에서 다시
 * 뽑을 뿐이라 카카오를 재호출하지 않는다 — 즉시 응답하고 쿼터도 안 쓴다.
 *
 * 취향 기록은 전부 localStorage에 있고 서버로 가지 않는다.
 */
export function useRecommendation() {
  const [status, setStatus] = useState<RecStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [places, setPlaces] = useState<KakaoPlace[]>([]);
  const [relaxed, setRelaxed] = useState<Relaxation[]>([]);
  const [decided, setDecided] = useState(false);

  const prefs = useSyncExternalStore(
    subscribePreferences,
    getPreferencesSnapshot,
    getPreferencesServerSnapshot,
  );

  const candidatesRef = useRef<Candidate[]>([]);
  const shownRef = useRef<Set<string>>(new Set());
  const queryRef = useRef<Query | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /**
   * 후보에서 하나 뽑고 그 메뉴의 가게를 불러온다.
   *
   * 후보 단계에서 업종은 확인됐지만 키워드 검색은 상호명 기준이라 0건일 수 있다.
   * 그러면 그 메뉴를 버리고 다음 후보로 간다.
   */
  const selectAndLoad = useCallback(async (state: PreferenceState) => {
    const query = queryRef.current;
    if (!query) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('loading');
    setError(null);
    setDecided(false);

    try {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        let pool = candidatesRef.current.filter(
          (c) => !shownRef.current.has(c.menu.id) && !isSkippedToday(state, c.menu.id),
        );

        // 이번 세션에서 다 돌았으면 한 바퀴 비우고 다시 돈다. 당일 제외는 유지한다.
        if (pool.length === 0) {
          shownRef.current.clear();
          pool = candidatesRef.current.filter((c) => !isSkippedToday(state, c.menu.id));
        }
        if (pool.length === 0) {
          setStatus('empty');
          return;
        }

        // 원칙 3 — 일정 확률로 취향을 통째로 무시한다. 없으면 같은 메뉴만 돈다.
        const explore = Math.random() < EXPLORE_RATE;
        const model = buildPreferenceModel(state);
        const chosen = pickWeighted(pool, explore ? () => 1 : (c) => model.boost(c.menu));
        if (!chosen) {
          setStatus('empty');
          return;
        }

        shownRef.current.add(chosen.menu.id);

        const params = new URLSearchParams({
          menuId: chosen.menu.id,
          lat: String(query.coords.lat),
          lng: String(query.coords.lng),
          walkMin: String(query.walkMin),
        });
        const data = await getJson<PlacesResponse>(`/api/places?${params}`, controller.signal);

        if (data.places.length > 0) {
          setMenu(chosen.menu);
          setPlaces(data.places);
          setStatus('ready');
          return;
        }
      }

      setStatus('empty');
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : '알 수 없는 오류');
      setStatus('error');
    }
  }, []);

  const start = useCallback(
    async (query: Query) => {
      queryRef.current = query;
      shownRef.current.clear();

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus('loading');
      setError(null);
      setMenu(null);
      setPlaces([]);

      try {
        const params = new URLSearchParams({
          lat: String(query.coords.lat),
          lng: String(query.coords.lng),
          walkMin: String(query.walkMin),
          at: query.at.toISOString(),
          exclude: serializeRestrictions(query.restrictions),
          ...filtersToParams(query.filters),
        });
        const data = await getJson<CandidatesResponse>(
          `/api/candidates?${params}`,
          controller.signal,
        );

        candidatesRef.current = data.candidates;
        setRelaxed(data.relaxed);

        if (data.candidates.length === 0) {
          setStatus('empty');
          return;
        }

        await selectAndLoad(prefs);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : '알 수 없는 오류');
        setStatus('error');
      }
    },
    [prefs, selectAndLoad],
  );

  /** "좋아요" — 확정. 지속 가점이 남는다. */
  const like = useCallback(() => {
    if (!menu) return;
    setPreferences(recordFeedback(prefs, menu.id, 'like'));
    setDecided(true);
  }, [menu, prefs]);

  /** "다른 거" — 당일 후보에서 빼고, 장기 취향에는 약하게만 반영한 뒤 다시 뽑는다. */
  const another = useCallback(() => {
    if (!menu) return;
    const next = recordFeedback(prefs, menu.id, 'pass');
    setPreferences(next);
    void selectAndLoad(next);
  }, [menu, prefs, selectAndLoad]);

  const model = buildPreferenceModel(prefs);

  return {
    status,
    error,
    menu,
    places,
    relaxed,
    decided,
    trained: model.trained,
    feedbackCount: Object.keys(prefs.menus).length,
    start,
    like,
    another,
    reset: clearPreferences,
  };
}
