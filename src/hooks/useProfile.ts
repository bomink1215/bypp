'use client';

import { useSyncExternalStore } from 'react';

import type { Restriction } from '@/lib/menu/restrictions';
import {
  getProfileServerSnapshot,
  getProfileSnapshot,
  setRestrictions,
  subscribeProfile,
  toggleRestriction,
} from '@/lib/profile/store';

/** 못 먹는 것 설정. localStorage에 저장되며 로그인 없이도 이 브라우저에서는 유지된다. */
export function useProfile() {
  const profile = useSyncExternalStore(
    subscribeProfile,
    getProfileSnapshot,
    getProfileServerSnapshot,
  );

  return {
    restrictions: profile.restrictions,
    toggle: (r: Restriction) => setRestrictions(toggleRestriction(profile.restrictions, r)),
    clear: () => setRestrictions([]),
  };
}
