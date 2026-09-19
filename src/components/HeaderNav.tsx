'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AuthBar } from './AuthBar';
import { fetchMyVisits } from '@/lib/review/client';

/**
 * 헤더 오른쪽. 먹로그로 가는 길과 로그인. 로그인하지 않아도 먹로그는 열린다.
 *
 * 먹로그 버튼은 잉크색으로 채운다. 코랄 채움은 화면마다 주 행동 하나의 몫이라(CLAUDE.md 디자인)
 * 헤더까지 코랄이면 둘이 시선을 다툰다. 대신 후기를 기다리는 방문한 가게가 있으면 코랄 숫자를
 * 붙여 "쓸 게 있다"를 알린다.
 */
export function HeaderNav() {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchMyVisits()
      .then((v) => alive && setPending(v.length))
      .catch(() => {
        // 못 불러와도 버튼은 그대로 보인다. 숫자만 없을 뿐이다.
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/mokrog"
        className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5"
      >
        <span aria-hidden>📒</span>
        나의 먹로그
        {pending > 0 && (
          <span
            className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white ring-2 ring-cream"
            aria-label={`후기를 기다리는 가게 ${pending}곳`}
          >
            {pending}
          </span>
        )}
      </Link>
      <AuthBar />
    </div>
  );
}
