import Link from 'next/link';

import { AuthBar } from './AuthBar';

/** 헤더 오른쪽. 먹로그로 가는 길과 로그인. 로그인하지 않아도 먹로그는 열린다. */
export function HeaderNav() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/mokrog"
        className="shrink-0 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
      >
        나의 먹로그
      </Link>
      <AuthBar />
    </div>
  );
}
