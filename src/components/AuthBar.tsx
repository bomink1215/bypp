'use client';

import { useState } from 'react';

import { useAuth } from '@/hooks/useAuth';

/**
 * 상단 로그인 줄.
 *
 * 로그인은 **선택**이라는 걸 UI로도 분명히 한다. 막지 않고, 이득을 설명하고, 게스트로도
 * 전부 쓸 수 있다고 말한다. 로그인해야만 쓸 수 있는 기능은 하나도 없다.
 */
export function AuthBar() {
  const auth = useAuth();
  const [explaining, setExplaining] = useState(false);

  if (!auth.available) return null;

  if (auth.session) {
    return (
      <div className="flex items-center justify-end gap-2 text-xs text-neutral-500">
        <span className="truncate">
          {auth.nickname}
          {auth.syncing && <span className="ml-1 text-neutral-400">· 동기화 중</span>}
        </span>
        <button
          type="button"
          onClick={auth.signOut}
          className="shrink-0 underline underline-offset-2 hover:text-neutral-800"
        >
          로그아웃
        </button>
      </div>
    );
  }

  if (!explaining) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          disabled={auth.loading}
          onClick={() => setExplaining(true)}
          className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800 disabled:opacity-40"
        >
          로그인
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">로그인하면 취향을 더 잘 기억해요</h2>
        <button
          type="button"
          onClick={() => setExplaining(false)}
          className="shrink-0 text-xs text-neutral-400 underline underline-offset-2"
        >
          닫기
        </button>
      </div>

      <p className="text-xs leading-relaxed text-neutral-500">
        지금도 취향과 못 먹는 것은 저장되지만 <span className="font-medium">이 브라우저에만</span>{' '}
        남아요. 로그인하면 폰과 PC에서 같은 취향으로 추천받고, 기록을 지워도 남습니다.
        <br />
        지금까지 쌓인 기록은 <span className="font-medium">사라지지 않고 계정에 합쳐집니다.</span>
      </p>

      <button
        type="button"
        onClick={() => auth.signIn()}
        className="w-full rounded-xl bg-[#FEE500] px-4 py-3 text-sm font-semibold text-neutral-900 transition-opacity hover:opacity-90"
      >
        카카오로 계속하기
      </button>

      <p className="text-[11px] text-neutral-400">
        닉네임만 받아요. 로그인하지 않아도 모든 기능을 쓸 수 있습니다.
      </p>

      {auth.error && <p className="text-xs text-red-600">{auth.error}</p>}
    </div>
  );
}
