import 'server-only';

import { MENU_BY_ID } from '../menu/seed';
import { BadRequestError } from '../params';
import { db, SupabaseError } from '../supabase/client';
import type { ParticipantRow, RoomRow } from '../room/types';
import {
  REVIEW_BODY_MAX,
  type MyReview,
  type PublicReview,
  type RatingSummary,
  type ReviewPlace,
  type ReviewRow,
} from './types';

/**
 * 후기 쓰기·읽기.
 *
 * 작성자는 브라우저 토큰(게스트)이고, 로그인했으면 user id도 함께다. 공개 응답에는 토큰도
 * 함께한 사람도 넣지 않는다 — 이름은 작성자가 고른 닉네임뿐이다.
 */

/** 누가 요청했나. userId는 서버가 액세스 토큰을 검증해서 채운다(클라이언트 말을 믿지 않는다). */
export type Author = { token: string; userId: string | null };

/**
 * 브라우저 토큰 모양 검사.
 *
 * 이 값은 PostgREST `or=(…)` 필터 안에 들어간다. 쉼표·괄호가 섞이면 조건을 바꿔치기할 수 있으니
 * `crypto.randomUUID()`가 만드는 글자만 받는다.
 */
export function requireReviewToken(raw: unknown): string {
  if (typeof raw !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(raw)) {
    throw new BadRequestError('사용자 토큰이 올바르지 않아요.');
  }
  return raw;
}

function mineFilter({ token, userId }: Author): string {
  return userId ? `(author_token.eq.${token},user_id.eq.${userId})` : `(author_token.eq.${token})`;
}

/** 한국 날짜(YYYY-MM-DD). "하루 한 번"의 하루는 한국 기준이다. */
function koreanDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d);
}

function cleanText(raw: unknown, max: number): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return t.length === 0 ? null : t.slice(0, max);
}

function parsePlace(raw: unknown): ReviewPlace {
  const p = (raw ?? {}) as Record<string, unknown>;
  const id = typeof p.id === 'string' ? p.id : '';
  // 카카오 장소 id는 숫자다. 아무 문자열이나 받으면 가짜 가게에 별점을 쌓을 수 있다.
  if (!/^\d{1,20}$/.test(id)) throw new BadRequestError('가게 정보가 올바르지 않아요.');

  const name = cleanText(p.name, 100);
  if (!name) throw new BadRequestError('가게 이름이 없어요.');

  // 링크는 카카오맵 장소 페이지만 받는다. 다른 주소를 저장해 두면 먹로그에서 엉뚱한 곳으로 보낸다.
  const url = typeof p.url === 'string' && /^https?:\/\/place\.map\.kakao\.com\/\d+$/.test(p.url) ? p.url : '';

  return {
    id,
    name,
    category: cleanText(p.category, 100) ?? '',
    address: cleanText(p.address, 200) ?? '',
    url,
  };
}

/** 방에서 정한 한 끼면 함께한 사람을 채운다. 클라이언트가 보낸 이름은 믿지 않고 방에서 읽는다. */
async function companionsFromRoom(roomCode: string, token: string): Promise<{ companions: string[]; eatAt: string | null }> {
  // 방이 만료돼도(약속 후 12시간) 행은 남아 있으므로 만료 검사를 하지 않고 읽는다. 후기는 보통 먹고 나서 쓴다.
  const [rooms, participants] = await Promise.all([
    db.select<RoomRow>('rooms', { code: `eq.${roomCode}`, select: 'code,eat_at' }),
    db.select<ParticipantRow>('participants', { room_code: `eq.${roomCode}`, select: 'token,nickname' }),
  ]);
  if (!rooms[0] || !participants.some((p) => p.token === token)) return { companions: [], eatAt: null };

  return {
    companions: participants.filter((p) => p.token !== token).map((p) => p.nickname),
    eatAt: rooms[0].eat_at,
  };
}

export async function createReview(
  author: Author,
  input: {
    nickname: unknown;
    place: unknown;
    menuId: unknown;
    rating: unknown;
    body: unknown;
    roomCode: unknown;
  },
): Promise<void> {
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new BadRequestError('별점은 1~5 사이로 골라주세요.');
  }

  const place = parsePlace(input.place);
  const menuId = typeof input.menuId === 'string' && MENU_BY_ID.has(input.menuId) ? input.menuId : null;

  let companions: string[] = [];
  let roomCode: string | null = null;
  let eatenAt = new Date();

  if (typeof input.roomCode === 'string' && /^[A-Z0-9]{6}$/.test(input.roomCode)) {
    const fromRoom = await companionsFromRoom(input.roomCode, author.token);
    if (fromRoom.eatAt) {
      roomCode = input.roomCode;
      companions = fromRoom.companions;
      // 약속 시각이 지났으면 그때 먹은 것으로 남긴다. 아직 전이면(미리 쓰는 경우) 지금으로.
      const planned = new Date(fromRoom.eatAt);
      if (planned.getTime() <= Date.now()) eatenAt = planned;
    }
  }

  try {
    await db.insert('reviews', {
      author_token: author.token,
      user_id: author.userId,
      nickname: cleanText(input.nickname, 12),
      place_id: place.id,
      place_name: place.name,
      place_category: place.category || null,
      place_address: place.address || null,
      place_url: place.url || null,
      menu_id: menuId,
      rating,
      body: cleanText(input.body, REVIEW_BODY_MAX),
      companions,
      room_code: roomCode,
      eaten_at: eatenAt.toISOString(),
      eaten_on: koreanDate(eatenAt),
    });
  } catch (e) {
    // reviews_one_per_day 유니크 제약. 평균을 부풀리는 걸 막는 최소한의 장치다.
    if (e instanceof SupabaseError && e.status === 409) {
      throw new BadRequestError('오늘 이 가게에는 이미 후기를 남겼어요.');
    }
    throw e;
  }
}

function toMine(r: ReviewRow): MyReview {
  return {
    id: r.id,
    place: {
      id: r.place_id,
      name: r.place_name,
      category: r.place_category ?? '',
      address: r.place_address ?? '',
      url: r.place_url ?? '',
    },
    menuId: r.menu_id,
    rating: r.rating,
    body: r.body ?? '',
    companions: r.companions ?? [],
    fromRoom: r.room_code !== null,
    eatenAt: r.eaten_at,
  };
}

/** 내 먹로그. 게스트 토큰으로 쓴 것과 로그인 계정으로 쓴 것을 합쳐서 보여준다. */
export async function listMine(author: Author): Promise<MyReview[]> {
  const rows = await db.select<ReviewRow>('reviews', {
    or: mineFilter(author),
    select: '*',
    order: 'eaten_at.desc',
    limit: '300',
  });
  return rows.map(toMine);
}

/** 가게 여러 곳의 별점 요약. 가게 목록 한 화면에 필요한 만큼만 받는다. */
export async function ratingsFor(placeIds: string[]): Promise<Record<string, RatingSummary>> {
  const ids = [...new Set(placeIds)].filter((id) => /^\d{1,20}$/.test(id)).slice(0, 30);
  if (ids.length === 0) return {};

  const rows = await db.select<Pick<ReviewRow, 'place_id' | 'rating'>>('reviews', {
    place_id: `in.(${ids.join(',')})`,
    select: 'place_id,rating',
  });

  const acc = new Map<string, { sum: number; count: number }>();
  for (const r of rows) {
    const a = acc.get(r.place_id) ?? { sum: 0, count: 0 };
    a.sum += r.rating;
    a.count += 1;
    acc.set(r.place_id, a);
  }

  return Object.fromEntries(
    [...acc.entries()].map(([id, a]) => [id, { average: Math.round((a.sum / a.count) * 10) / 10, count: a.count }]),
  );
}

/** 한 가게의 최근 후기. 공개 응답이라 함께한 사람·토큰·방 코드는 넣지 않는다. */
export async function reviewsForPlace(placeId: string, author: Author | null): Promise<PublicReview[]> {
  if (!/^\d{1,20}$/.test(placeId)) throw new BadRequestError('가게 정보가 올바르지 않아요.');

  const rows = await db.select<ReviewRow>('reviews', {
    place_id: `eq.${placeId}`,
    select: 'id,author_token,user_id,nickname,rating,body,eaten_on',
    order: 'created_at.desc',
    limit: '20',
  });

  return rows.map((r) => ({
    id: r.id,
    nickname: r.nickname ?? '익명',
    rating: r.rating,
    body: r.body ?? '',
    eatenOn: r.eaten_on,
    mine: author !== null && (r.author_token === author.token || (!!author.userId && r.user_id === author.userId)),
  }));
}

export async function deleteReview(id: string, author: Author): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new BadRequestError('후기 정보가 올바르지 않아요.');
  // 내 것만 지워진다. 남의 후기 id를 보내도 조건에 걸리지 않아 아무 일도 없다.
  await db.remove('reviews', { id: `eq.${id}`, or: mineFilter(author) });
}

/** 로그인하면 이 브라우저에서 게스트로 쓴 후기를 계정에 묶는다. 다른 기기에서도 보이게 된다. */
export async function claimReviews(token: string, userId: string): Promise<void> {
  await db.update('reviews', { author_token: `eq.${token}`, user_id: 'is.null' }, { user_id: userId });
}
