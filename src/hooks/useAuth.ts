'use client';

import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

import {
  getPreferencesSnapshot,
  setPreferences,
  type PreferenceState,
} from '@/lib/preference/store';
import { getProfileSnapshot, setRestrictions } from '@/lib/profile/store';
import {
  fetchRemoteProfile,
  mergePreferences,
  mergeRestrictions,
  pushProfile,
} from '@/lib/profile/sync';
import { authAvailable, supabaseBrowser } from '@/lib/supabase/browser';

export type AuthState = {
  available: boolean;
  /** 아직 세션을 확인하는 중. 로그인 버튼이 깜빡이지 않게 쓴다. */
  loading: boolean;
  session: Session | null;
  nickname: string | null;
  syncing: boolean;
  error: string | null;
  signIn: (next?: string) => void;
  signOut: () => void;
};

/** 카카오 프로필의 닉네임. 제공 안 하면 이메일 앞부분으로 떨어진다. */
function nicknameOf(session: Session | null): string | null {
  if (!session) return null;
  const meta = session.user.user_metadata as Record<string, unknown>;
  const candidates = [meta.name, meta.full_name, meta.preferred_username, meta.nickname];
  const found = candidates.find((v) => typeof v === 'string' && v.length > 0);
  return (found as string) ?? session.user.email?.split('@')[0] ?? '사용자';
}

/**
 * 카카오 로그인과 취향 동기화.
 *
 * 로그인은 **선택이다.** 안 해도 모든 기능이 그대로 돌아가고, 하면 취향이 기기 간에 유지된다.
 * 그래서 로그인 실패가 앱을 막지 않도록 오류를 삼키고 게스트 상태를 유지한다.
 */
export function useAuth(): AuthState {
  const available = authAvailable();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(available);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 로컬에 쌓인 것과 계정에 있는 것을 합쳐 양쪽에 반영한다.
   *
   * 로그인 직후와 이후 변경 시 모두 이걸 부른다. 게스트로 쓰던 기록이 사라지지 않는 게 핵심이다.
   */
  const syncNow = useCallback(async (userId: string) => {
    setSyncing(true);
    try {
      const supabase = supabaseBrowser();
      const remote = await fetchRemoteProfile(supabase, userId);

      const localProfile = getProfileSnapshot();
      const localPrefs = getPreferencesSnapshot();

      const restrictions = mergeRestrictions(localProfile.restrictions, remote.restrictions);
      const preferences = mergePreferences(localPrefs.menus, remote.preferences);

      // 로컬을 병합 결과로 맞춘다. 화면은 계속 로컬을 본다.
      setRestrictions(restrictions);
      setPreferences({ ...localPrefs, menus: preferences } as PreferenceState);

      await pushProfile(supabase, userId, { restrictions, preferences });
      setError(null);
    } catch (e) {
      // 동기화가 실패해도 앱은 게스트처럼 계속 동작해야 한다.
      setError(e instanceof Error ? e.message : '동기화에 실패했어요.');
    } finally {
      setSyncing(false);
    }
  }, []);

  /**
   * 콜백이 `#kakao_id_token=…`으로 남긴 토큰을 세션으로 바꾼다.
   *
   * 프래그먼트는 서버로 전송되지 않아 로그나 리퍼러에 남지 않는다. 한 번 쓰면 바로 지워서
   * 새로고침해도 다시 쓰이지 않게 한다.
   */
  const consumeIdToken = useCallback(async (): Promise<boolean> => {
    // 한 틱 물러난다. effect 본문에서 동기적으로 상태를 건드리면
    // 연쇄 렌더가 생기고 react-hooks/set-state-in-effect가 막는다.
    await Promise.resolve();

    // 콜백이 오류를 URL로 실어 보냈으면 먼저 꺼내 보여준다.
    const failure = new URLSearchParams(window.location.search).get('login_error');
    if (failure) {
      setError(failure);
      const url = new URL(window.location.href);
      url.searchParams.delete('login_error');
      history.replaceState(null, '', url.pathname + url.search);
    }

    if (!window.location.hash.includes('kakao_id_token=')) return false;

    const token = new URLSearchParams(window.location.hash.slice(1)).get('kakao_id_token');
    history.replaceState(null, '', window.location.pathname + window.location.search);
    if (!token) return false;

    const { error: signInError } = await supabaseBrowser().auth.signInWithIdToken({
      provider: 'kakao',
      token,
    });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return false;
    }
    return true;
  }, []);

  useEffect(() => {
    if (!available) return;

    const supabase = supabaseBrowser();

    /*
     * `getSession()`을 따로 부르지 않는다. 구독하면 `INITIAL_SESSION`이 먼저 한 번 오기
     * 때문에 초기 상태도 여기서 처리된다. 외부 시스템의 변화를 콜백으로 받는 형태라
     * effect 안에서 상태를 동기적으로 건드리지도 않는다.
     */
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setLoading(false);

      // 로그인 직후는 물론, 이미 로그인된 채로 다시 들어왔을 때도 원격 변경을 끌어온다.
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && next) {
        void syncNow(next.user.id);
      }
    });

    /*
     * 콜백에서 돌아온 경우 프래그먼트의 id_token을 세션으로 바꾼다. 성공하면 위 구독이 받는다.
     *
     * eslint-disable 이유: 이 규칙은 effect가 상태를 동기적으로 바꿔 연쇄 렌더를 만드는 걸
     * 막는다. 여기는 OAuth 리다이렉트로 돌아왔을 때 URL에 실려온 토큰을 한 번 회수하는
     * 부트스트랩이라 매 렌더마다 돌지 않고, 실패했을 때 사용자에게 사유를 보여주려면
     * 상태를 건드릴 수밖에 없다. 성공 경로는 setState 없이 위 구독이 처리한다.
     */
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 1회성 OAuth 복귀 처리
    void consumeIdToken();

    return () => sub.subscription.unsubscribe();
  }, [available, syncNow, consumeIdToken]);

  const signIn = useCallback((nextPath?: string) => {
    /*
     * Supabase의 `signInWithOAuth({ provider: 'kakao' })`를 쓰지 않는다.
     * 그쪽은 scope에 `account_email`을 하드코딩해 보내는데, 개인 개발자 앱에는 그 동의항목이
     * 없어 KOE205로 거절당한다(우리가 `scopes`로 빼려 해도 덧붙기만 한다).
     *
     * 대신 인가 요청을 직접 만들어 `openid profile_nickname`만 요청하고, 받은 id_token을
     * 아래 `signInWithIdToken`으로 넘긴다. 세션 관리는 여전히 Supabase가 한다.
     */
    // 안내 화면처럼 "로그인하고 바로 시작"인 경우엔 돌아갈 곳을 따로 지정한다.
    const next = nextPath ?? window.location.pathname + window.location.search;
    const start = new URL('/api/auth/kakao/start', window.location.origin);
    start.searchParams.set('next', next);

    // 라우터가 아니라 전체 이동이어야 한다. 이 요청은 카카오 도메인으로 302된다.
    window.location.assign(start.toString());
  }, []);

  const signOut = useCallback(() => {
    // 로그아웃해도 localStorage의 취향은 남긴다. 게스트로 계속 쓰면 되니까.
    void supabaseBrowser().auth.signOut();
  }, []);

  return {
    available,
    loading,
    session,
    nickname: nicknameOf(session),
    syncing,
    error,
    signIn,
    signOut,
  };
}
