import 'server-only';

import { walkMinutesToRadius } from '../distance';
import { searchByCategory } from '../kakao/search';
import type { Restriction } from '../menu/restrictions';
import { DEFAULT_FILTERS, type MenuFilters } from '../menu/types';
import { BadRequestError } from '../params';
import { deriveCandidates } from '../recommend';
import { db } from '../supabase/client';
import { groupScorer, mergeConditions, type ParticipantInput } from './merge';
import {
  generateRoomCode,
  ROOM_TTL_HOURS,
  type ParticipantRow,
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
  const expires = new Date(Date.now() + ROOM_TTL_HOURS * 3600_000);

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

export async function castVote(code: string, token: string, menuId: string): Promise<void> {
  const room = await findRoom(code);
  if (room.status !== 'voting') throw new RoomError('지금은 투표할 수 없어요.');

  const allowed = (room.candidates ?? []).some((c) => c.menu.id === menuId);
  if (!allowed) throw new RoomError('후보에 없는 메뉴예요.');

  await db.upsert('votes', { room_code: code, token, menu_id: menuId });
}

export async function decide(code: string, token: string): Promise<void> {
  const room = await findRoom(code);
  if (room.host_token !== token) throw new RoomError('방장만 마감할 수 있어요.');
  if (room.status !== 'voting') throw new RoomError('투표 중이 아니에요.');

  const votes = await db.select<VoteRow>('votes', { room_code: `eq.${code}`, select: '*' });
  if (votes.length === 0) throw new RoomError('아직 표가 없어요.');

  const counts = new Map<string, number>();
  for (const v of votes) counts.set(v.menu_id, (counts.get(v.menu_id) ?? 0) + 1);

  // 동점이면 후보 순서(= 점수 순)가 앞선 쪽이 이긴다. 무작위보다 설명하기 쉽다.
  const order = (room.candidates ?? []).map((c) => c.menu.id);
  const winner = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]),
  )[0][0];

  await db.update('rooms', { code: `eq.${code}` }, { status: 'decided', decided_menu_id: winner });
}

/** 폴링으로 내려주는 화면용 상태. 남의 토큰은 절대 넣지 않는다. */
export async function getRoomState(code: string, token: string): Promise<RoomState> {
  const room = await findRoom(code);

  const [participants, votes] = await Promise.all([
    db.select<ParticipantRow>('participants', { room_code: `eq.${code}`, select: '*' }),
    db.select<VoteRow>('votes', { room_code: `eq.${code}`, select: '*' }),
  ]);

  const votedTokens = new Set(votes.map((v) => v.token));
  const me = participants.find((p) => p.token === token);

  const counts = new Map<string, number>();
  for (const v of votes) counts.set(v.menu_id, (counts.get(v.menu_id) ?? 0) + 1);

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
      })),
    candidates: room.candidates,
    relaxed: room.relaxed ?? [],
    conflicts: room.conflicts ?? [],
    restrictions: [...new Set(participants.flatMap((p) => p.restrictions ?? []))],
    tally: [...counts.entries()].map(([menuId, count]) => ({ menuId, count })),
    decidedMenuId: room.decided_menu_id,
  };
}
