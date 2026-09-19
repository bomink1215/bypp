'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Brand } from '@/components/Brand';
import { HeaderNav } from '@/components/HeaderNav';
import { ReviewSheet, Stars } from '@/components/ReviewSheet';
import { useAuth } from '@/hooks/useAuth';
import { MENU_BY_ID } from '@/lib/menu/seed';
import { computeBadges, type Badge } from '@/lib/review/badges';
import { deleteMyReview, deleteMyVisit, fetchMyReviews, fetchMyVisits } from '@/lib/review/client';
import type { MyReview, MyVisit } from '@/lib/review/types';

/**
 * 나의 먹로그.
 *
 * 다녀온 한 끼가 카드로 쌓인다. 친구와 같이 정한 한 끼면 함께한 사람의 이름이 남는다 —
 * 평가 데이터이기 전에 추억이라는 걸 화면에서 먼저 보여준다. 함께한 사람은 여기서만 보인다
 * (가게 목록의 공개 후기에는 나가지 않는다).
 */
export default function MokrogPage() {
  const auth = useAuth();
  const [reviews, setReviews] = useState<MyReview[] | null>(null);
  const [visits, setVisits] = useState<MyVisit[]>([]);
  const [writing, setWriting] = useState<MyVisit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // 로그인 상태가 정해진 뒤에 부른다. 로그인했으면 다른 기기에서 쓴 기록까지 같이 온다.
  const sessionKey = auth.loading ? null : (auth.session?.user.id ?? 'guest');
  useEffect(() => {
    if (sessionKey === null) return;
    let alive = true;
    Promise.all([fetchMyReviews(), fetchMyVisits()])
      .then(([list, pending]) => {
        if (!alive) return;
        setReviews(list);
        setVisits(pending);
        setError(null);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : '기록을 불러오지 못했어요.'));
    return () => {
      alive = false;
    };
  }, [sessionKey, reloadKey]);

  const badges = useMemo(() => computeBadges(reviews ?? []), [reviews]);

  const removeVisit = async (id: string) => {
    if (!window.confirm('방문한 가게에서 뺄까요?')) return;
    try {
      await deleteMyVisit(id);
    } finally {
      setReloadKey((k) => k + 1);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('이 기록을 지울까요? 가게에 남긴 별점과 후기도 함께 지워져요.')) return;
    try {
      await deleteMyReview(id);
    } finally {
      setReloadKey((k) => k + 1);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <Brand />
        <HeaderNav />
      </div>

      <header>
        <h1 className="text-2xl font-black tracking-tight">나의 먹로그</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {reviews && reviews.length > 0 ? (
            <>
              지금까지 <span className="font-semibold text-brand">{reviews.length}끼</span>를 기록했어요.
            </>
          ) : (
            '가게 목록에서 "여기로 정했어요"를 누르고, 다녀와서 후기를 쓰면 여기에 쌓여요.'
          )}
        </p>
        {!auth.session && auth.available && (
          <p className="mt-2 text-[11px] text-neutral-400">
            지금은 이 브라우저에만 남아요. 로그인하면 폰과 PC에서 같은 먹로그를 볼 수 있어요.
          </p>
        )}
      </header>

      {/*
        방문한 가게를 업적보다 위에 둔다. 먹로그에 들어오는 가장 흔한 이유가 "아까 거기 후기 쓰기"라
        할 일을 먼저 보여준다.
      */}
      {visits.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-neutral-400">
            방문한 가게 · 후기를 기다려요 {visits.length}
          </h2>
          <ul className="space-y-2">
            {visits.map((v) => (
              <li key={v.id}>
                <VisitCard
                  visit={v}
                  onWrite={() => setWriting(v)}
                  onRemove={() => void removeVisit(v.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <BadgeShelf badges={badges} />

      {writing && (
        <ReviewSheet
          place={writing.place}
          menuId={writing.menuId}
          menuName={writing.menuId ? (MENU_BY_ID.get(writing.menuId)?.name ?? null) : null}
          visitId={writing.id}
          hasCompanions={writing.companions.length > 0}
          onClose={() => setWriting(null)}
          onDone={() => {
            setWriting(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {reviews === null && !error && <p className="text-center text-sm text-neutral-400">불러오는 중…</p>}

      {reviews && reviews.length === 0 && (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          아직 기록이 없어요.
          <div className="mt-3 flex justify-center gap-2">
            <Link href="/recommend" className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white">
              메뉴 추천받기
            </Link>
            <Link href="/room" className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-medium">
              친구와 정하기
            </Link>
          </div>
        </div>
      )}

      {reviews && reviews.length > 0 && (
        <ol className="space-y-3">
          {reviews.map((r, i) => (
            <li key={r.id}>
              <MealCard review={r} nth={reviews.length - i} onDelete={() => void remove(r.id)} />
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}

/** 후기를 기다리는 한 끼. 누르면 바로 후기 쓰기로 간다. */
function VisitCard({ visit, onWrite, onRemove }: { visit: MyVisit; onWrite: () => void; onRemove: () => void }) {
  const menu = visit.menuId ? MENU_BY_ID.get(visit.menuId) : null;
  const date = new Date(visit.eatenAt).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-brand/40 bg-white p-4">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-neutral-500">{date}</p>
        <p className="truncate font-bold">{visit.place.name}</p>
        <p className="truncate text-xs text-neutral-500">
          {[menu?.name, visit.companions.length > 0 ? `${visit.companions.join(' · ')}와 함께` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <button
          type="button"
          onClick={onWrite}
          className="rounded-full bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-brand/25"
        >
          후기 쓰기
        </button>
        <button type="button" onClick={onRemove} className="text-[11px] text-neutral-400 underline underline-offset-2">
          빼기
        </button>
      </div>
    </div>
  );
}

/** 달성한 배지는 진하게, 아직인 건 흐리게 진행도와 함께. 다음 목표가 보여야 기록할 이유가 생긴다. */
function BadgeShelf({ badges }: { badges: Badge[] }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-neutral-400">업적</h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {badges.map((b) => {
          const done = b.progress >= 1;
          return (
            <li
              key={b.id}
              className={`rounded-2xl border p-3 ${done ? 'border-brand/30 bg-brand-soft' : 'border-neutral-200 bg-white'}`}
            >
              <p className={`text-2xl ${done ? '' : 'opacity-30 grayscale'}`} aria-hidden>
                {b.emoji}
              </p>
              <p className={`mt-1 text-sm font-bold ${done ? '' : 'text-neutral-400'}`}>{b.title}</p>
              <p className="text-[11px] text-neutral-500">{b.description}</p>
              {!done && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <div className="h-full rounded-full bg-brand/60" style={{ width: `${b.progress * 100}%` }} />
                  </div>
                  <span className="text-[10px] tabular-nums text-neutral-400">{b.progressLabel}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** 한 끼 카드. 몇 번째 한 끼인지, 누구와 먹었는지를 같이 남긴다. */
function MealCard({ review, nth, onDelete }: { review: MyReview; nth: number; onDelete: () => void }) {
  const menu = review.menuId ? MENU_BY_ID.get(review.menuId) : null;
  const date = new Date(review.eatenAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <article className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      {/* 카드 왼쪽 띠. 친구와 먹은 끼니는 코랄, 혼자는 잉크 — 목록을 훑을 때 구분된다. */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1.5 ${review.companions.length > 0 ? 'bg-brand' : 'bg-neutral-300'}`}
      />

      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-neutral-500">{date}</p>
        <span className="shrink-0 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-bold text-white">
          {nth}번째 한 끼
        </span>
      </div>

      <h3 className="mt-1 text-xl font-black tracking-tight">{review.place.name}</h3>
      <p className="text-sm text-neutral-500">
        {[menu?.name, review.place.category].filter(Boolean).join(' · ')}
      </p>

      <div className="mt-2">
        <Stars value={review.rating} size="text-lg" />
      </div>

      {review.body && (
        <blockquote className="mt-3 whitespace-pre-line rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
          “{review.body}”
        </blockquote>
      )}

      {review.companions.length > 0 && (
        <div className="mt-3 rounded-2xl bg-brand-soft px-4 py-3">
          <p className="text-[11px] font-semibold text-brand">함께한 사람</p>
          <p className="mt-0.5 text-sm font-medium">{review.companions.join(' · ')}</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs">
        {review.place.url ? (
          <a href={review.place.url} target="_blank" rel="noreferrer" className="text-neutral-500 underline underline-offset-2">
            카카오맵 ↗
          </a>
        ) : (
          <span />
        )}
        <button type="button" onClick={onDelete} className="text-neutral-400 underline underline-offset-2">
          지우기
        </button>
      </div>
    </article>
  );
}
