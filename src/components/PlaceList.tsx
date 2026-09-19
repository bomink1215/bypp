'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ReviewSheet, Stars } from './ReviewSheet';
import { formatDistance } from '@/lib/distance';
import type { KakaoPlace } from '@/lib/kakao/types';
import { cuisineOf } from '@/lib/menu/category-map';
import { openHint } from '@/lib/menu/hours';
import { deleteMyReview, fetchPlaceReviews, fetchRatings } from '@/lib/review/client';
import type { PublicReview, RatingSummary, ReviewPlace } from '@/lib/review/types';

/** 전문점 표시는 서버가 붙인다(rankRelevant). 예전 방 스냅샷에는 없을 수 있다. */
type ListedPlace = KakaoPlace & { specialty?: boolean };

type Props = {
  places: ListedPlace[];
  at: Date;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** 무엇을 먹으러 간 가게인가. 있으면 "다녀왔어요" 버튼이 생긴다(먹로그 카드에 남는다). */
  menuId?: string | null;
  menuName?: string | null;
  /** 방에서 정한 한 끼면 함께한 사람이 먹로그에 같이 남는다. */
  roomCode?: string;
};

function toReviewPlace(p: KakaoPlace): ReviewPlace {
  return {
    id: p.id,
    name: p.place_name,
    category: p.category_name.replace(/^음식점 > /, ''),
    address: p.road_address_name || p.address_name,
    url: p.place_url,
  };
}

/**
 * 가게 목록.
 *
 * 카카오맵 버튼이 주 버튼이다. 우리가 줄 수 없는 정보(영업시간, 메뉴, 가격, 사진)가
 * 전부 거기 있기 때문이다 — 카카오 로컬 API는 그 어느 것도 주지 않는다.
 * 그래서 "확인하러 가는 곳"을 가장 크게 두고, 무엇을 확인하면 되는지도 같이 적는다.
 *
 * 별점은 우리 사용자가 남긴 것이다(카카오는 별점을 주지 않는다). 그래서 "이 앱 평점"이라고
 * 출처를 밝히고 개수를 같이 보여준다 — 한두 개짜리 평균을 카카오 별점처럼 보이게 하지 않는다.
 */
export function PlaceList({ places, at, selectedId, onSelect, menuId = null, menuName = null, roomCode }: Props) {
  const [ratings, setRatings] = useState<Record<string, RatingSummary>>({});
  const [reloadKey, setReloadKey] = useState(0);
  const [openReviews, setOpenReviews] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, PublicReview[]>>({});
  const [writing, setWriting] = useState<ListedPlace | null>(null);
  const [saved, setSaved] = useState(false);

  const idsKey = places.map((p) => p.id).join(',');
  useEffect(() => {
    let alive = true;
    fetchRatings(idsKey.split(',').filter(Boolean))
      .then((r) => alive && setRatings(r))
      .catch(() => {
        // 별점을 못 불러와도 가게 목록은 그대로 보여준다.
      });
    return () => {
      alive = false;
    };
  }, [idsKey, reloadKey]);

  const loadReviews = async (placeId: string) => {
    try {
      const list = await fetchPlaceReviews(placeId);
      setReviews((prev) => ({ ...prev, [placeId]: list }));
    } catch {
      setReviews((prev) => ({ ...prev, [placeId]: [] }));
    }
  };

  const toggleReviews = (placeId: string) => {
    if (openReviews === placeId) {
      setOpenReviews(null);
      return;
    }
    setOpenReviews(placeId);
    if (!reviews[placeId]) void loadReviews(placeId);
  };

  const remove = async (placeId: string, id: string) => {
    try {
      await deleteMyReview(id);
    } finally {
      setReloadKey((k) => k + 1);
      void loadReviews(placeId);
    }
  };

  return (
    <>
      <ul className="space-y-2">
        {/* 순서가 거리만이 아니라는 걸 알려야 먼 가게가 위에 있어도 헷갈리지 않는다. */}
        {places.some((p) => p.specialty) && (
          <li className="px-1 text-[11px] text-neutral-500">전문점 먼저, 같으면 가까운 순이에요.</li>
        )}

        {saved && (
          <li className="flex items-center justify-between gap-2 rounded-2xl bg-brand-soft px-4 py-3 text-sm">
            <span>먹로그에 남겼어요 🎉</span>
            <Link href="/mokrog" className="shrink-0 font-semibold text-brand underline underline-offset-2">
              보러 가기
            </Link>
          </li>
        )}

        {places.map((p) => {
          const cuisine = cuisineOf(p.category_name);
          const hint = cuisine ? openHint(cuisine, at) : null;
          const selected = p.id === selectedId;
          const rating = ratings[p.id];
          const list = reviews[p.id];

          return (
            <li
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`rounded-2xl border p-4 transition-colors ${
                selected ? 'border-brand bg-brand-soft/40' : 'border-neutral-200 bg-white hover:bg-neutral-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="flex min-w-0 items-center gap-1.5 font-medium">
                    <span className="truncate">{p.place_name}</span>
                    {p.specialty && (
                      <span className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                        전문점
                      </span>
                    )}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {p.category_name.replace(/^음식점 > /, '')}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums text-neutral-600">
                  {formatDistance(Number(p.distance))}
                </span>
              </div>

              <p className="mt-2 truncate text-xs text-neutral-500">{p.road_address_name || p.address_name}</p>

              {hint && <p className="mt-1 text-[11px] text-neutral-400">{hint}</p>}

              {/* 이 앱 사용자가 남긴 별점. 없으면 아무것도 띄우지 않는다. */}
              {rating && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleReviews(p.id);
                  }}
                  className="mt-2 flex items-center gap-1.5 text-xs"
                >
                  <Stars value={rating.average} size="text-sm" />
                  <span className="font-semibold">{rating.average.toFixed(1)}</span>
                  <span className="text-neutral-500">
                    이 앱 평점 {rating.count}개 · {openReviews === p.id ? '접기' : '후기 보기'}
                  </span>
                </button>
              )}

              {openReviews === p.id && (
                <div className="mt-2 space-y-2 rounded-xl bg-neutral-50 p-3" onClick={(e) => e.stopPropagation()}>
                  {!list ? (
                    <p className="text-xs text-neutral-400">불러오는 중…</p>
                  ) : list.filter((r) => r.body || r.mine).length === 0 ? (
                    <p className="text-xs text-neutral-400">아직 글로 남긴 후기가 없어요.</p>
                  ) : (
                    list
                      .filter((r) => r.body || r.mine)
                      .map((r) => (
                        <div key={r.id} className="text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1">
                              <Stars value={r.rating} size="text-xs" />
                              <span className="font-medium">{r.nickname}</span>
                              <span className="text-neutral-400">{r.eatenOn}</span>
                            </span>
                            {r.mine && (
                              <button
                                type="button"
                                onClick={() => void remove(p.id, r.id)}
                                className="text-[11px] text-neutral-400 underline underline-offset-2"
                              >
                                지우기
                              </button>
                            )}
                          </div>
                          {r.body && <p className="mt-0.5 whitespace-pre-line text-neutral-700">{r.body}</p>}
                        </div>
                      ))
                  )}
                </div>
              )}

              <a
                href={p.place_url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#FEE500] px-4 py-3 text-neutral-900 transition-opacity hover:opacity-90"
              >
                <span className="text-left">
                  <span className="block text-sm font-semibold">카카오맵에서 보기</span>
                  <span className="block text-[11px] opacity-70">영업시간 · 메뉴 · 사진 확인하기</span>
                </span>
                <span aria-hidden className="text-lg leading-none">
                  ↗
                </span>
              </a>

              <div className="mt-1.5 flex items-center justify-between gap-2 px-1">
                {p.phone ? (
                  <a
                    href={`tel:${p.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="py-2 text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800"
                  >
                    전화 {p.phone}
                  </a>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSaved(false);
                    setWriting(p);
                  }}
                  className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium transition-colors hover:border-brand hover:text-brand"
                >
                  다녀왔어요 · 후기 쓰기
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {writing && (
        <ReviewSheet
          place={toReviewPlace(writing)}
          menuId={menuId}
          menuName={menuName}
          roomCode={roomCode}
          onClose={() => setWriting(null)}
          onDone={() => {
            const id = writing.id;
            setWriting(null);
            setSaved(true);
            setReloadKey((k) => k + 1);
            setReviews((prev) => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          }}
        />
      )}
    </>
  );
}
