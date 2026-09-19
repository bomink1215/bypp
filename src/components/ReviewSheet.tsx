'use client';

import { useState } from 'react';

import { getSavedNickname } from '@/hooks/useRoom';
import { submitReview } from '@/lib/review/client';
import { REVIEW_BODY_MAX, type ReviewPlace } from '@/lib/review/types';

/** 별 다섯 개. 입력용과 표시용을 같이 쓴다. */
export function Stars({
  value,
  onChange,
  size = 'text-base',
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: string;
}) {
  return (
    <span className={`inline-flex ${size}`} aria-label={`별점 ${value}점`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n}점`}
            aria-pressed={n === value}
            className={`px-0.5 leading-none transition-transform active:scale-110 ${n <= value ? 'text-brand' : 'text-neutral-300'}`}
          >
            ★
          </button>
        ) : (
          <span key={n} aria-hidden className={n <= Math.round(value) ? 'text-brand' : 'text-neutral-300'}>
            ★
          </span>
        ),
      )}
    </span>
  );
}

/**
 * 후기 쓰기 창.
 *
 * 별점은 가게에 준다. 먹은 메뉴는 먹로그 카드에 기록으로만 남는다.
 * 방에서 정한 한 끼면 함께한 사람은 서버가 방 참가자로 채운다 — 여기서 입력받지 않는다.
 * 후기 글과 닉네임은 가게 목록에 공개되지만, 함께한 사람은 내 먹로그에만 남는다.
 */
export function ReviewSheet({
  place,
  menuId,
  menuName,
  roomCode,
  visitId,
  hasCompanions = false,
  onClose,
  onDone,
}: {
  place: ReviewPlace;
  menuId: string | null;
  menuName: string | null;
  roomCode?: string;
  /** 먹로그의 방문한 가게에서 여는 경우. 가게·메뉴·함께한 사람은 그 기록을 그대로 쓴다. */
  visitId?: string;
  /** 함께한 사람이 남는 한 끼인가. 안내 문구에만 쓴다. */
  hasCompanions?: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [nickname, setNickname] = useState(() => getSavedNickname());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await submitReview({ place, menuId, rating, body, nickname, roomCode, visitId });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : '후기를 남기지 못했어요.');
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-xs font-semibold text-brand">다녀왔어요</p>
          <h2 id="review-title" className="mt-0.5 text-xl font-black tracking-tight">
            {place.name}
          </h2>
          {menuName && <p className="text-sm text-neutral-500">{menuName}</p>}
        </div>

        <div className="text-center">
          <Stars value={rating} onChange={setRating} size="text-4xl" />
          <p className="mt-1 text-xs text-neutral-500">
            {rating === 0 ? '별점을 골라주세요' : ['', '별로였어요', '아쉬웠어요', '괜찮았어요', '좋았어요', '최고였어요'][rating]}
          </p>
        </div>

        <div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, REVIEW_BODY_MAX))}
            rows={3}
            placeholder="어땠나요? (선택)"
            className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
          />
          <p className="text-right text-[11px] text-neutral-400">
            {body.length}/{REVIEW_BODY_MAX}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <span className="shrink-0 text-neutral-500">표시할 이름</span>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={12}
            placeholder="비우면 익명"
            className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm"
          />
        </label>

        <p className="text-[11px] leading-relaxed text-neutral-400">
          별점과 글은 이 가게를 보는 다른 사람에게도 보여요.
          {(roomCode || hasCompanions) && ' 함께한 친구 이름은 내 먹로그에만 남아요.'}
        </p>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            disabled={rating === 0 || busy}
            onClick={() => void submit()}
            className="rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-brand/25 transition-colors hover:bg-brand-strong disabled:opacity-40"
          >
            {busy ? '남기는 중…' : '먹로그에 남기기'}
          </button>
          <button type="button" onClick={onClose} className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm">
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
