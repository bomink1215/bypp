import type { SupabaseClient } from '@supabase/supabase-js';

import { RESTRICTIONS, type Restriction } from '../menu/restrictions';
import type { MenuStat, PreferenceState } from '../preference/store';

/**
 * 게스트로 쌓은 것과 계정에 있는 것을 합친다.
 *
 * 로그인했다고 그동안 쌓은 게 날아가면 안 된다. 반대로 다른 기기에서 쌓은 것도 잃으면
 * 안 된다. 그래서 어느 한쪽으로 덮어쓰지 않고 병합한다.
 *
 *   제약  → **합집합**. 안전한 방향으로만 움직인다. 한쪽에서 "해산물 못 먹음"을
 *           설정했다면 그건 사실이지 기기의 속성이 아니다.
 *   취향  → **카운트 합산**. 좋아요 3번 + 좋아요 2번 = 5번. 같은 사람의 평가이므로
 *           더하는 게 맞다. 시각은 더 최근 것을 남겨 감쇠 계산이 어긋나지 않게 한다.
 */

export type RemoteProfile = {
  restrictions: Restriction[];
  preferences: PreferenceState['menus'];
};

export function mergeRestrictions(
  local: readonly Restriction[],
  remote: readonly Restriction[],
): Restriction[] {
  const union = new Set([...local, ...remote]);
  // 순서를 고정해 표시가 매번 달라지지 않게 한다.
  return RESTRICTIONS.filter((r) => union.has(r));
}

export function mergePreferences(
  local: PreferenceState['menus'],
  remote: PreferenceState['menus'],
): PreferenceState['menus'] {
  const merged: Record<string, MenuStat> = { ...remote };

  for (const [menuId, stat] of Object.entries(local)) {
    const other = merged[menuId];
    merged[menuId] = other
      ? {
          likes: other.likes + stat.likes,
          dislikes: other.dislikes + stat.dislikes,
          lastFeedbackAt: Math.max(other.lastFeedbackAt, stat.lastFeedbackAt),
        }
      : stat;
  }

  return merged;
}

const TABLE = 'user_profiles';

export async function fetchRemoteProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<RemoteProfile> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('restrictions, preferences')
    .eq('user_id', userId)
    .maybeSingle();

  // 아직 행이 없는 건 오류가 아니다. 처음 로그인한 사람이다.
  if (error) throw new Error(error.message);
  if (!data) return { restrictions: [], preferences: {} };

  return {
    restrictions: RESTRICTIONS.filter((r) => (data.restrictions ?? []).includes(r)),
    preferences: (data.preferences ?? {}) as PreferenceState['menus'],
  };
}

export async function pushProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: RemoteProfile,
): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      restrictions: profile.restrictions,
      preferences: profile.preferences,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) throw new Error(error.message);
}
