import 'server-only';

import { walkMinutesToRadius } from '../distance';
import { filterRelevant } from '../kakao/relevance';
import { searchByCategory, searchByKeyword } from '../kakao/search';
import type { Restriction } from '../menu/restrictions';
import { MENU_BY_ID } from '../menu/seed';
import { DEFAULT_FILTERS, type MenuFilters } from '../menu/types';
import { BadRequestError } from '../params';
import { deriveCandidates } from '../recommend';
import { db } from '../supabase/client';
import { groupScorer, mergeConditions, type ParticipantInput } from './merge';
import {
  generateRoomCode,
  ROOM_AFTER_MEAL_HOURS,
  ROOM_TTL_HOURS,
  type ParticipantRow,
  type PlaceVoteRow,
  type RoomRow,
  type RoomState,
  type VoteRow,
} from './types';

export class RoomError extends BadRequestError {}

async function findRoom(code: string): Promise<RoomRow> {
  const rows = await db.select<RoomRow>('rooms', { code: `eq.${code}`, select: '*' });
  const room = rows[0];
  if (!room) throw new RoomError('방을 찾을 수 없어요. 코드를 다시 확인해주세요.');
  if (new Date(room.expires_at) < new Date()) throw new RoomError('만료된 방이에요.');
  return room;
}

export async function createRoom(input: {
  hostToken: string;
  nickname: string;
  lat: number;
  lng: number;
  placeLabel: string;
  walkMin: number;
  eatAt: Date;
}): Promise<string> {
  const expires = new Date(
    Math.max(
      Date.now() + ROOM_TTL_HOURS * 3600_000,
      input.eatAt.getTime() + ROOM_AFTER_MEAL_HOURS * 3600_000,
    ),
  );

  // 코드가 겹칠 확률은 낮지만 0은 아니다. 몇 번 다시 뽑아본다.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const existing = await db.select<RoomRow>('rooms', { code: `eq.${code}`, select: 'code' });
    if (existing.length > 0) continue;

    await db.insert('rooms', {
      code,
      host_token: input.hostToken,
      lat: input.lat,
      lng: input.lng,
      place_label: input.placeLabel,
      walk_min: input.walkMin,
      eat_at: input.eatAt.toISOString(),
      expires_at: expires.toISOString(),
    });

    // 방장도 참가자다. 따로 입장할 필요 없이 바로 조건을 낼 수 있어야 한다.
    await db.insert('participants', {
      room_code: code,
      token: input.hostToken,
      nickname: input.nickname,
    });

    return code;
  }

  throw new RoomError('방 코드를 만들지 못했어요. 잠시 후 다시 시도해주세요.');
}

export async function joinRoom(code: string, token: string, nickname: string): Promise<void> {
  const room = await findRoom(code);
  if (room.status !== 'collecting') {
    throw new RoomError('이미 조건 입력이 끝난 방이에요.');
  }

  // 같은 사람이 새로고침해도 중복 참가가 되지 않도록 upsert한다.
  await db.upsert('participants', { room_code: code, token, nickname });
}

export async function submitConditions(
  code: string,
  token: string,
  filters: MenuFilters,
  restrictions: Restriction[],
): Promise<void> {
  const room = await findRoom(code);
  if (room.status !== 'collecting') {
    throw new RoomError('이미 조건 입력이 끝난 방이에요.');
  }

  const rows = await db.update<ParticipantRow>(
    'participants',
    { room_code: `eq.${code}`, token: `eq.${token}` },
    { filters, restrictions },
  );
  if (rows.length === 0) throw new RoomError('이 방의 참가자가 아니에요.');
}

/**
 * 조건을 합쳐 후보를 뽑고 투표를 연다.
 *
 * 후보를 방에 **스냅샷으로 저장**하는 게 핵심이다. 투표 중에 후보가 바뀌면 이미 던진 표가
 * 무슨 의미인지 알 수 없게 된다.
 */
export async function startVoting(code: string, token: string): Promise<void> {
  const room = await findRoom(code);
  if (room.host_token !== token) throw new RoomError('방장만 시작할 수 있어요.');
  if (room.status !== 'collecting') throw new RoomError('이미 투표가 시작됐어요.');

  const participants = await db.select<ParticipantRow>('participants', {
    room_code: `eq.${code}`,
    select: '*',
  });

  const ready: ParticipantInput[] = participants
    .filter((p) => p.filters !== null)
    .map((p) => ({
      nickname: p.nickname,
      filters: p.filters as MenuFilters,
      restrictions: p.restrictions ?? [],
    }));

  if (ready.length === 0) throw new RoomError('아직 아무도 조건을 내지 않았어요.');

  const merged = mergeConditions(ready);
  const radius = walkMinutesToRadius(room.walk_min);
  const widened = walkMinutesToRadius(room.walk_min * 1.5);

  const sweep = await searchByCategory({ lat: room.lat, lng: room.lng }, widened);

  const derived = deriveCandidates({
    placesWide: sweep.places,
    requestedRadius: radius,
    widenedRadius: widened,
    // 하드 필터는 걸지 않는다. 제약만 걸러내고 나머지 선호는 점수로 반영한다.
    // 교집합으로 걸러내면 사람이 늘수록 후보가 붕괴한다(merge.ts의 groupScorer 주석 참조).
    filters: DEFAULT_FILTERS,
    at: new Date(room.eat_at),
    gate: sweep.complete,
    restrictions: merged.restrictions,
    tasteScorer: groupScorer(ready),
  });

  // 투표지가 너무 길면 고르기 어렵다. 상위 5개만 올린다.
  const shortlist = derived.candidates.slice(0, 5);
  if (shortlist.length === 0) {
    throw new RoomError('모두의 조건을 만족하는 메뉴를 찾지 못했어요. 조건을 조금 풀어보세요.');
  }

  await db.update(
    'rooms',
    { code: `eq.${code}` },
    {
      status: 'voting',
      candidates: shortlist,
      relaxed: derived.relaxed,
      conflicts: merged.conflicts,
    },
  );
}

async function requireParticipant(code: string, token: string): Promise<ParticipantRow[]> {
  const participants = await db.select<ParticipantRow>('participants', {
    room_code: `eq.${code}`,
    select: '*',
  });
  if (!participants.some((p) => p.token === token)) {
    throw new RoomError('이 방의 참가자가 아니에요.');
  }
  return participants;
}

/**
 * 표를 센다. 동점이면 후보 순서가 앞선 쪽이 이긴다 — 메뉴는 점수 순, 가게는 거리 순이라
 * 무작위보다 설명하기 쉽다.
 */
function winnerOf(votedIds: string[], order: string[]): string {
  const counts = new Map<string, number>();
  for (const id of votedIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]),
  )[0][0];
}

/** 참가자 전원이 표를 냈는가. 마감을 방장에게만 맡기면 방장이 자리를 비울 때 방이 멈춘다. */
function everyoneVoted(participants: ParticipantRow[], votes: { token: string }[]): boolean {
  const voted = new Set(votes.map((v) => v.token));
  return participants.length > 0 && participants.every((p) => voted.has(p.token));
}

/**
 * 메뉴 투표를 마감한다.
 *
 * `status=eq.voting` 조건을 건 채 갱신한다. 마지막 두 사람이 거의 동시에 투표해 둘 다
 * 자동 마감을 부르더라도 한 번만 반영된다.
 */
async function closeMenuVoting(room: RoomRow, votes: VoteRow[]): Promise<void> {
  const order = (room.candidates ?? []).map((c) => c.menu.id);
  const winner = winnerOf(
    votes.map((v) => v.menu_id),
    order,
  );
  await db.update(
    'rooms',
    { code: `eq.${room.code}`, status: 'eq.voting' },
    { status: 'decided', decided_menu_id: winner },
  );
}

export async function castVote(code: string, token: string, menuId: string): Promise<void> {
  const room = await findRoom(code);
  if (room.status !== 'voting') throw new RoomError('지금은 투표할 수 없어요.');

  const allowed = (room.candidates ?? []).some((c) => c.menu.id === menuId);
  if (!allowed) throw new RoomError('후보에 없는 메뉴예요.');

  // 참가자가 아닌 표가 섞이면 "모두 투표했나"를 셀 수 없다.
  const participants = await requireParticipant(code, token);
  await db.upsert('votes', { room_code: code, token, menu_id: menuId });

  const votes = await db.select<VoteRow>('votes', { room_code: `eq.${code}`, select: '*' });
  if (everyoneVoted(participants, votes)) await closeMenuVoting(room, votes);
}

/** 방장이 수동으로 마감. 모두 투표하면 자동으로 닫히지만, 안 오는 사람을 기다리지 않게. */
export async function decide(code: string, token: string): Promise<void> {
  const room = await findRoom(code);
  if (room.host_token !== token) throw new RoomError('방장만 마감할 수 있어요.');
  if (room.status !== 'voting') throw new RoomError('투표 중이 아니에요.');

  const votes = await db.select<VoteRow>('votes', { room_code: `eq.${code}`, select: '*' });
  if (votes.length === 0) throw new RoomError('아직 표가 없어요.');

  await closeMenuVoting(room, votes);
}

// ── 가게 투표 ────────────────────────────────────────────────────

/** 가게 투표지 길이. 메뉴와 같은 이유로 짧게 둔다. */
const PLACE_SHORTLIST = 5;

/**
 * "가게도 정할까요?" — 확정된 메뉴를 파는 가게로 투표를 연다.
 *
 * 방장이 아니어도 누구나 열 수 있다. 메뉴가 정해진 뒤 가게를 정할지는 먼저 원하는 사람이
 * 꺼내면 되는 일이고, 방장만 가능하게 하면 방장이 자리를 비웠을 때 또 멈춘다.
 * 여러 명이 동시에 눌러도 한 번만 열리도록 `status=eq.decided` 조건으로 갱신한다.
 */
export async function startPlaceVoting(code: string, token: string): Promise<void> {
  const room = await findRoom(code);
  await requireParticipant(code, token);

  // 이미 열렸으면 조용히 넘어간다. 늦게 누른 사람에게 오류를 보일 이유가 없다.
  if (room.status === 'place_voting' || room.status === 'place_decided') return;
  if (room.status !== 'decided') throw new RoomError('메뉴가 정해진 뒤에 가게를 정할 수 있어요.');

  const menu = MENU_BY_ID.get(room.decided_menu_id ?? '');
  if (!menu) throw new RoomError('정해진 메뉴를 찾을 수 없어요.');

  // /api/places와 같은 규칙이다. 그 메뉴를 파는 게 확실한 가게만, 가까운 순으로.
  const found = await searchByKeyword(
    menu.name,
    { lat: room.lat, lng: room.lng },
    walkMinutesToRadius(room.walk_min),
  );
  const shortlist = filterRelevant(found, menu).slice(0, PLACE_SHORTLIST);
  if (shortlist.length === 0) throw new RoomError('근처에서 이 메뉴를 파는 가게를 찾지 못했어요.');

  await db.update(
    'rooms',
    { code: `eq.${code}`, status: 'eq.decided' },
    { status: 'place_voting', place_candidates: shortlist },
  );
}

async function closePlaceVoting(room: RoomRow, votes: PlaceVoteRow[]): Promise<void> {
  const order = (room.place_candidates ?? []).map((p) => p.id);
  const winner = winnerOf(
    votes.map((v) => v.place_id),
    order,
  );
  await db.update(
    'rooms',
    { code: `eq.${room.code}`, status: 'eq.place_voting' },
    { status: 'place_decided', decided_place_id: winner },
  );
}

export async function castPlaceVote(code: string, token: string, placeId: string): Promise<void> {
  const room = await findRoom(code);
  if (room.status !== 'place_voting') throw new RoomError('지금은 가게 투표를 할 수 없어요.');

  const allowed = (room.place_candidates ?? []).some((p) => p.id === placeId);
  if (!allowed) throw new RoomError('후보에 없는 가게예요.');

  const participants = await requireParticipant(code, token);
  await db.upsert('place_votes', { room_code: code, token, place_id: placeId });

  const votes = await db.select<PlaceVoteRow>('place_votes', {
    room_code: `eq.${code}`,
    select: '*',
  });
  if (everyoneVoted(participants, votes)) await closePlaceVoting(room, votes);
}

export async function decidePlace(code: string, token: string): Promise<void> {
  const room = await findRoom(code);
  if (room.host_token !== token) throw new RoomError('방장만 마감할 수 있어요.');
  if (room.status !== 'place_voting') throw new RoomError('가게 투표 중이 아니에요.');

  const votes = await db.select<PlaceVoteRow>('place_votes', {
    room_code: `eq.${code}`,
    select: '*',
  });
  if (votes.length === 0) throw new RoomError('아직 표가 없어요.');

  await closePlaceVoting(room, votes);
}

/** 폴링으로 내려주는 화면용 상태. 남의 토큰은 절대 넣지 않는다. */
export async function getRoomState(code: string, token: string): Promise<RoomState> {
  const room = await findRoom(code);

  // 가게 투표 전에는 place_votes를 읽을 필요가 없다. 3초마다 부르는 경로라 한 번이라도 아낀다.
  const placePhase = room.status === 'place_voting' || room.status === 'place_decided';
  const [participants, votes, placeVotes] = await Promise.all([
    db.select<ParticipantRow>('participants', { room_code: `eq.${code}`, select: '*' }),
    db.select<VoteRow>('votes', { room_code: `eq.${code}`, select: '*' }),
    placePhase
      ? db.select<PlaceVoteRow>('place_votes', { room_code: `eq.${code}`, select: '*' })
      : Promise.resolve([] as PlaceVoteRow[]),
  ]);

  const votedTokens = new Set(votes.map((v) => v.token));
  const placeVotedTokens = new Set(placeVotes.map((v) => v.token));
  const me = participants.find((p) => p.token === token);

  const counts = new Map<string, number>();
  for (const v of votes) counts.set(v.menu_id, (counts.get(v.menu_id) ?? 0) + 1);

  const placeCounts = new Map<string, number>();
  for (const v of placeVotes) placeCounts.set(v.place_id, (placeCounts.get(v.place_id) ?? 0) + 1);

  return {
    code: room.code,
    lat: room.lat,
    lng: room.lng,
    placeLabel: room.place_label,
    walkMin: room.walk_min,
    eatAt: room.eat_at,
    status: room.status,
    isHost: room.host_token === token,
    hasSubmitted: me?.filters != null,
    myVote: votes.find((v) => v.token === token)?.menu_id ?? null,
    members: participants
      .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
      .map((p) => ({
        nickname: p.nickname,
        submitted: p.filters != null,
        voted: votedTokens.has(p.token),
        placeVoted: placeVotedTokens.has(p.token),
      })),
    candidates: room.candidates,
    relaxed: room.relaxed ?? [],
    conflicts: room.conflicts ?? [],
    restrictions: [...new Set(participants.flatMap((p) => p.restrictions ?? []))],
    tally: [...counts.entries()].map(([menuId, count]) => ({ menuId, count })),
    decidedMenuId: room.decided_menu_id,
    placeCandidates: room.place_candidates ?? null,
    placeTally: [...placeCounts.entries()].map(([placeId, count]) => ({ placeId, count })),
    myPlaceVote: placeVotes.find((v) => v.token === token)?.place_id ?? null,
    decidedPlaceId: room.decided_place_id ?? null,
  };
}
