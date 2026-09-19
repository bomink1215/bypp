'use client';

import { getToken } from '@/hooks/useRoom';
import { authAvailable, supabaseBrowser } from '@/lib/supabase/browser';
import type { MyReview, MyVisit, PublicReview, RatingsResponse, ReviewPlace } from './types';

/**
 * 후기 API를 부르는 브라우저 쪽 함수들.
 *
 * 작성자는 늘 브라우저 토큰(방 참가자와 같은 것)이고, 로그인했으면 액세스 토큰을 같이 보낸다.
 * 서버가 그 토큰을 검증해 계정에 묶는다. 로그인 확인이 실패해도 게스트로 계속 된다.
 */
async function identity(): Promise<{ token: string; accessToken?: string }> {
  const token = getToken();
  if (!authAvailable()) return { token };
  try {
    const { data } = await supabaseBrowser().auth.getSession();
    return { token, accessToken: data.session?.access_token };
  } catch {
    return { token };
  }
}

async function call<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `요청 실패 (${res.status})`);
  return data;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function submitReview(input: {
  place: ReviewPlace;
  menuId: string | null;
  rating: number;
  body: string;
  nickname: string;
  roomCode?: string;
  /** 먹로그의 방문한 가게에서 쓰는 경우. 서버가 그 방문 기록의 가게·메뉴·함께한 사람을 쓴다. */
  visitId?: string;
}): Promise<void> {
  await call('/api/reviews', json('POST', { ...(await identity()), ...input }));
}

/** "여기로 정했어요". 같은 가게를 같은 날 다시 눌러도 하나만 남는다. */
export async function addVisit(input: {
  place: ReviewPlace;
  menuId: string | null;
  roomCode?: string;
}): Promise<void> {
  await call('/api/visits', json('POST', { ...(await identity()), ...input }));
}

export async function fetchMyVisits(): Promise<MyVisit[]> {
  return (await call<{ visits: MyVisit[] }>('/api/visits/mine', json('POST', await identity()))).visits;
}

export async function deleteMyVisit(id: string): Promise<void> {
  await call(`/api/visits/${id}`, json('DELETE', await identity()));
}

export async function fetchMyReviews(): Promise<MyReview[]> {
  return (await call<{ reviews: MyReview[] }>('/api/reviews/mine', json('POST', await identity()))).reviews;
}

export async function deleteMyReview(id: string): Promise<void> {
  await call(`/api/reviews/${id}`, json('DELETE', await identity()));
}

export async function fetchRatings(placeIds: string[]): Promise<RatingsResponse['ratings']> {
  if (placeIds.length === 0) return {};
  const q = encodeURIComponent(placeIds.join(','));
  return (await call<RatingsResponse>(`/api/reviews?placeIds=${q}`, { method: 'GET' })).ratings;
}

export async function fetchPlaceReviews(placeId: string): Promise<PublicReview[]> {
  const token = encodeURIComponent(getToken());
  return (await call<{ reviews: PublicReview[] }>(`/api/reviews/place/${placeId}?token=${token}`, { method: 'GET' }))
    .reviews;
}

/** 로그인 직후 한 번. 이 브라우저에서 게스트로 쓴 후기를 계정으로 옮긴다. 실패해도 조용히 넘어간다. */
export async function claimMyReviews(accessToken: string): Promise<void> {
  try {
    await call('/api/reviews/claim', json('POST', { token: getToken(), accessToken }));
  } catch {
    // 다음 로그인 때 다시 시도된다.
  }
}
