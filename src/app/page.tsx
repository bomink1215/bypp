'use client';

import Image from 'next/image';
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
      <div className="space-y-10 text-center">
        {/* 태그라인(지금 여기서, 딱 맞는 한 끼)이 로고 안에 있으니 따로 쓰지 않는다. */}
        <h1>
          <Image
            src="/logo.png"
            alt="오늘 뭐 먹지? — 지금 여기서, 딱 맞는 한 끼"
            width={1000}
            height={280}
            priority
            className="mx-auto h-auto w-full max-w-[320px]"
          />
        </h1>

        <div className="space-y-4">
          {/* 상황을 깔아주는 도입부라 한 톤 낮춘다. 강조는 아래 한 줄이 가져간다. */}
          <p className="text-base leading-relaxed text-neutral-500">
            소중한 점심시간,
            <br />
            오랜만에 만나는 친구들과 밥 약속,
            <br />
            윗사람과 식사 대접 자리…
            <br />
            뭘 먹어야 좋을까?
            <br />
            겨우 찾았더니 근처에 없네...
          </p>

          <p className="text-2xl font-black leading-snug tracking-tight sm:text-[1.7rem]">
            사소한 메뉴 고민,
            <br />
            <span className="text-brand">해결해드릴게요!</span>
          </p>
        </div>

        <div className="space-y-2.5">
          <Link
            href={START}
            className="block w-full rounded-2xl bg-brand px-4 py-4 text-center text-sm font-semibold text-white shadow-sm shadow-brand/25 transition-colors hover:bg-brand-strong"
          >
            시작하기
          </Link>

          {/* 이미 로그인했다면 다시 권할 이유가 없다. */}
          {auth.available && !auth.session && (
            <button
              type="button"
              disabled={auth.loading}
              onClick={() => auth.signIn(START)}
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm font-medium transition-colors hover:bg-neutral-50 disabled:opacity-40"
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
            <p className="text-center text-xs text-red-600">{auth.error}</p>
          )}
        </div>

        <Link
          href="/mokrog"
          className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5"
        >
          <span aria-hidden>📒</span>
          나의 먹로그 보기
        </Link>

        <p className="text-xs leading-relaxed text-neutral-400">
          로그인하면 취향과 못 먹는 것을 기억해요
          <br />
          하지만 로그인하지 않아도 모든 기능을 사용할 수 있습니다.
        </p>
      </div>
    </main>
  );
}
