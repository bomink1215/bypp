import type { KakaoPlace } from '../kakao/types';
import type { Restriction } from '../menu/restrictions';
import type { Candidate, MenuFilters, Relaxation } from '../menu/types';
import type { Conflict } from './merge';

/**
 * collecting 조건 모으기 → voting 메뉴 투표 → decided 메뉴 확정
 *   → (가게도 정할 때만) place_voting 가게 투표 → place_decided 가게 확정
 */
export type RoomStatus = 'collecting' | 'voting' | 'decided' | 'place_voting' | 'place_decided';

/** DB 행 그대로. snake_case인 건 PostgREST가 컬럼명을 그대로 주기 때문이다. */
export type RoomRow = {
  code: string;
  host_token: string;
  lat: number;
  lng: number;
  place_label: string;
  walk_min: number;
  eat_at: string;
  status: RoomStatus;
  candidates: Candidate[] | null;
  relaxed: Relaxation[] | null;
  conflicts: Conflict[] | null;
  decided_menu_id: string | null;
  /** 가게 투표 대상 스냅샷. 메뉴 후보와 같은 이유로 고정해 둔다. */
  place_candidates: KakaoPlace[] | null;
  decided_place_id: string | null;
  created_at: string;
  expires_at: string;
};

export type ParticipantRow = {
  room_code: string;
  token: string;
  nickname: string;
  filters: MenuFilters | null;
  restrictions: Restriction[];
  joined_at: string;
};

export type VoteRow = {
  room_code: string;
  token: string;
  menu_id: string;
};

export type PlaceVoteRow = {
  room_code: string;
  token: string;
  place_id: string;
};

/** 클라이언트에 내려보내는 방 상태. 남의 토큰은 절대 포함하지 않는다. */
export type RoomState = {
  code: string;
  /** 방장이 정한 만나는 장소. 참가자도 지도와 가게 검색에 써야 한다. */
  lat: number;
  lng: number;
  placeLabel: string;
  walkMin: number;
  eatAt: string;
  status: RoomStatus;
  /** 내가 방장인가. 요청자의 토큰으로 서버가 판단해서 내려준다. */
  isHost: boolean;
  /** 내가 조건을 냈는가. */
  hasSubmitted: boolean;
  /** 내가 투표한 메뉴. */
  myVote: string | null;
  members: { nickname: string; submitted: boolean; voted: boolean; placeVoted: boolean }[];
  candidates: Candidate[] | null;
  relaxed: Relaxation[];
  conflicts: Conflict[];
  restrictions: Restriction[];
  tally: { menuId: string; count: number }[];
  decidedMenuId: string | null;
  placeCandidates: KakaoPlace[] | null;
  placeTally: { placeId: string; count: number }[];
  myPlaceVote: string | null;
  decidedPlaceId: string | null;
};

/** 헷갈리는 글자(0/O, 1/I/L)를 뺀 알파벳. 코드를 말로 불러주기 쉬워야 한다. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/**
 * 방 유효 시간. 만든 시점부터 최소 이만큼, 그리고 약속 시각이 지나고도 `ROOM_AFTER_MEAL_HOURS`
 * 동안은 산다. 며칠 뒤 약속으로 만든 방이 그 전에 만료되면 안 된다.
 */
export const ROOM_TTL_HOURS = 24;
export const ROOM_AFTER_MEAL_HOURS = 12;
