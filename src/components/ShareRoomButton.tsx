'use client';

import { useState } from 'react';

/**
 * 방 링크 공유.
 *
 * 모바일은 OS 공유 시트(`navigator.share`)를 띄워 카톡을 바로 고를 수 있게 하고, 공유 시트가
 * 없는 PC는 클립보드에 복사한다. 링크를 카톡에 붙이면 `opengraph-image.png`가 미리보기로 뜬다.
 * 카카오톡 공유 SDK를 쓰지 않는 이유: 콘솔 설정이 하나 더 필요하고, 공유 시트로 카톡을 고르는
 * 것과 사용자 입장에서 차이가 거의 없다.
 */
export function ShareRoomButton({ code, placeLabel }: { code: string; placeLabel: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/room/${code}`;
    const text = `${placeLabel}에서 뭐 먹을지 같이 골라요! 코드 ${code}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: '오늘 뭐 먹지?', text, url });
        return;
      } catch (e) {
        // 사용자가 공유 시트를 닫은 건 실패가 아니다. 그 외 오류면 복사로 넘어간다.
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한도 없으면 주소를 직접 보여주는 수밖에 없다.
      window.prompt('이 링크를 복사해서 보내주세요', url);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand/25 bg-brand-soft px-4 py-3 text-sm font-semibold transition-colors hover:border-brand/60"
    >
      {copied ? (
        '링크를 복사했어요 ✓'
      ) : (
        <>
          친구 초대하기 <span className="text-brand">링크 공유</span>
        </>
      )}
    </button>
  );
}
