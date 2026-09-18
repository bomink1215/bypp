import type { NextRequest } from 'next/server';

import { toErrorResponse } from '@/lib/api-error';
import { RESTRICTIONS, type Restriction } from '@/lib/menu/restrictions';
import { DEFAULT_FILTERS, type MenuFilters } from '@/lib/menu/types';
import { requireCode, requireToken } from '@/lib/room/request';
import { submitConditions } from '@/lib/room/service';

/** 클라이언트가 보낸 조건을 그대로 믿지 않고 우리가 아는 모양으로 다시 만든다. */
function sanitize(raw: unknown): MenuFilters {
  const f = (raw ?? {}) as Partial<MenuFilters>;
  const taste = (v: unknown) => (typeof v === 'number' && v >= 0 && v <= 3 ? (v as 0 | 1 | 2 | 3) : null);
  const toggle = (v: unknown) => (v === 'yes' || v === 'no' ? v : 'any');

  return {
    ...DEFAULT_FILTERS,
    spicy: taste(f.spicy),
    richness: taste(f.richness),
    temperature: taste(f.temperature),
    meat: toggle(f.meat),
    seafood: toggle(f.seafood),
    flour: toggle(f.flour),
    soup: toggle(f.soup),
    solo: toggle(f.solo),
    quick: toggle(f.quick),
    weight: f.weight === 'light' || f.weight === 'heavy' ? f.weight : 'any',
  };
}

export async function POST(request: NextRequest, ctx: RouteContext<'/api/rooms/[code]/submit'>) {
  try {
    const { code } = await ctx.params;
    const payload = (await request.json()) as Record<string, unknown>;

    const sent = Array.isArray(payload.restrictions) ? payload.restrictions : [];
    const restrictions: Restriction[] = RESTRICTIONS.filter((r) => sent.includes(r));

    await submitConditions(
      requireCode(code),
      requireToken(payload),
      sanitize(payload.filters),
      restrictions,
    );
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
