'use client';

import Link from 'next/link';

import { useAuth } from '@/hooks/useAuth';

/** 시작하기를 누르면 가는 곳. 로그인 후에도 여기로 돌아온다. */
const START = '/recommend';

/**
 * 첫 화면.
 *
 * 추천 화면을 `/recommend`로 옮기고 여기를 안내 화면으로 뒀다. 처음 온 사람이 바로 옵션
 * 패널을 마주하면 무엇을 하는 서비스인지 모른 채 고르기부터 시작하게 된다.
 *
 * 로그인 버튼을 두되 **시작하기를 위에 둔다.** 로그인은 끝까지 선택이고, 안 해도 모든
 * 기능을 쓸 수 있다는 걸 순서로도 보여준다.
 */
export default function LandingPage() {
  const auth = useAuth();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <div className="space-y-8">
        <div className="space-y-6">
          <p className="text-xl font-medium leading-relaxed tracking-tight sm:text-2xl">
            소중한 점심시간,
            <br />
            오랜만에 만나는 친구들과 식사…
            <br />
            뭘 먹어야 좋을까?
          </p>

          <p className="text-base text-neutral-500 sm:text-lg dark:text-neutral-400">
            사소한 메뉴 고민 해결해드릴게요!
          </p>
        </div>

        <div className="space-y-2.5">
          <Link
            href={START}
            className="block w-full rounded-2xl bg-neutral-900 px-4 py-4 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-neutral-900"
          >
            시작하기
          </Link>

          {/* 이미 로그인했다면 다시 권할 이유가 없다. */}
          {auth.available && !auth.session && (
            <button
              type="button"
              disabled={auth.loading}
              onClick={() => auth.signIn(START)}
              className="w-full rounded-2xl border border-neutral-300 px-4 py-4 text-sm font-medium transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              로그인하고 더 편리하게 이용하기
            </button>
          )}

          {auth.session && (
            <p className="text-center text-xs text-neutral-400">
              {auth.nickname}님으로 로그인되어 있어요
            </p>
          )}

          {auth.error && (
            <p className="text-center text-xs text-red-600 dark:text-red-400">{auth.error}</p>
          )}
        </div>

        <p className="text-xs leading-relaxed text-neutral-400">
          로그인하면 취향과 못 먹는 것을 기억해 폰과 PC에서 같은 추천을 받아요.
          <br />
          하지 않아도 모든 기능을 쓸 수 있습니다.
        </p>
      </div>
    </main>
  );
}
