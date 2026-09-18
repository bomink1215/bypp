import Image from 'next/image';
import Link from 'next/link';

/**
 * 화면 왼쪽 위의 로고. 누르면 첫 화면으로 간다.
 *
 * 워드마크 이미지(public/logo.png)는 태그라인까지 들어 있어 헤더에 두기엔 크다.
 * 그래서 핀 마크만 이미지로 쓰고 글자는 텍스트로 쓴다 — 작게 줄여도 번지지 않는다.
 */
export function Brand() {
  return (
    <Link href="/" className="inline-flex items-center gap-1.5" aria-label="오늘 뭐 먹지? 첫 화면으로">
      <Image src="/logo-mark.png" alt="" width={18} height={24} priority />
      <span className="text-base font-black tracking-tight">
        오늘 뭐 먹지<span className="text-brand">?</span>
      </span>
    </Link>
  );
}
