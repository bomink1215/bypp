import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { BadRequestError } from '@/lib/params';
import { requireNickname, requireToken } from '@/lib/room/request';
import { createRoom } from '@/lib/room/service';
import { MAX_DAYS_AHEAD } from '@/lib/when';

export type CreateRoomResponse = { code: string };

/** 방을 만든다. 만드는 사람이 곧 방장이자 첫 참가자다. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || lat < 33 || lat > 39) throw new BadRequestError('위도가 올바르지 않아요.');
    if (!Number.isFinite(lng) || lng < 124 || lng > 132) throw new BadRequestError('경도가 올바르지 않아요.');

    const walkMin = Number(body.walkMin);
    if (!Number.isFinite(walkMin) || walkMin < 1 || walkMin > 60) {
      throw new BadRequestError('도보 시간은 1~60분 사이여야 해요.');
    }

    const eatAt = new Date(String(body.eatAt ?? ''));
    if (Number.isNaN(eatAt.getTime())) throw new BadRequestError('시각이 올바르지 않아요.');
    // 화면(lib/when.ts)과 같은 범위. 한 시간 여유는 isPast와 맞춘 것이다.
    const now = Date.now();
    if (eatAt.getTime() < now - 3_600_000) throw new BadRequestError('이미 지난 시각이에요.');
    if (eatAt.getTime() > now + (MAX_DAYS_AHEAD + 1) * 86_400_000) {
      throw new BadRequestError(`${MAX_DAYS_AHEAD}일 뒤까지만 정할 수 있어요.`);
    }

    const placeLabel = String(body.placeLabel ?? '').trim().slice(0, 60) || '만나는 곳';

    const code = await createRoom({
      hostToken: requireToken(body),
      nickname: requireNickname(body),
      lat,
      lng,
      placeLabel,
      walkMin,
      eatAt,
    });

    const res: CreateRoomResponse = { code };
    return Response.json(res);
  } catch (e) {
    return toErrorResponse(e);
  }
}
