'use client';

import { walkMinutesToRadius } from '@/lib/distance';
import type { MenuFilters } from '@/lib/menu/types';
import { REGIONS } from '@/lib/regions';
import { formatWhen, type When } from '@/lib/when';
import type { Coords, GeoStatus } from '@/hooks/useGeolocation';

type Props = {
  when: When;
  onWhenChange: (w: When) => void;
  walkMin: number;
  onWalkMinChange: (n: number) => void;
  filters: MenuFilters;
  onFiltersChange: (f: MenuFilters) => void;
  geoStatus: GeoStatus;
  locationLabel: string;
  onRequestLocation: () => void;
  onPickRegion: (c: Coords, name: string) => void;
};

const HOURS = [7, 8, 9, 11, 12, 13, 15, 17, 18, 19, 20, 21, 22, 23, 1, 3];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function OptionPanel({
  when,
  onWhenChange,
  walkMin,
  onWalkMinChange,
  filters,
  onFiltersChange,
  geoStatus,
  locationLabel,
  onRequestLocation,
  onPickRegion,
}: Props) {
  const set = <K extends keyof MenuFilters>(key: K, value: MenuFilters[K]) =>
    onFiltersChange({ ...filters, [key]: value });

  return (
    <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <Field label="위치">
        {geoStatus === 'ready' ? (
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-sm font-medium">{locationLabel}</span>
            <button
              type="button"
              onClick={onRequestLocation}
              className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              다시 잡기
            </button>
          </div>
        ) : (
          <div className="w-full space-y-2">
            <button
              type="button"
              onClick={onRequestLocation}
              disabled={geoStatus === 'loading'}
              className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
            >
              {geoStatus === 'loading' ? '위치 확인 중…' : '현재 위치 사용'}
            </button>

            {/* 권한 거부는 흔하다. 폴백이 없으면 그 사용자는 아무것도 못 한다. */}
            {(geoStatus === 'denied' || geoStatus === 'unavailable') && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                {geoStatus === 'denied'
                  ? '위치 권한이 거부됐어요. 지역을 직접 골라주세요.'
                  : '이 브라우저에서 위치를 쓸 수 없어요. 지역을 직접 골라주세요.'}
              </p>
            )}

            <select
              defaultValue=""
              onChange={(e) => {
                const r = REGIONS.find((x) => x.id === e.target.value);
                if (r) onPickRegion({ lat: r.lat, lng: r.lng }, r.name);
              }}
              className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2.5 text-sm dark:border-neutral-700"
            >
              <option value="" disabled>
                지역 직접 선택
              </option>
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </Field>

      <Field label={`언제 — ${formatWhen(when)}`}>
        <Chip active={when.kind === 'now'} onClick={() => onWhenChange({ kind: 'now' })}>
          지금
        </Chip>
        <Chip
          active={when.kind === 'today'}
          onClick={() => onWhenChange({ kind: 'today', hour: 12 })}
        >
          오늘
        </Chip>
        <Chip
          active={when.kind === 'tomorrow'}
          onClick={() => onWhenChange({ kind: 'tomorrow', hour: 12 })}
        >
          내일
        </Chip>

        {when.kind !== 'now' && (
          <select
            value={when.hour}
            onChange={(e) => onWhenChange({ kind: when.kind, hour: Number(e.target.value) })}
            className="rounded-full border border-neutral-200 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h < 12 ? '오전' : '오후'} {h % 12 === 0 ? 12 : h % 12}시
              </option>
            ))}
          </select>
        )}
      </Field>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            도보 시간
          </span>
          <span className="text-sm font-medium">
            {walkMin}분 이내
            <span className="ml-1 text-xs font-normal text-neutral-400">
              (반경 약 {walkMinutesToRadius(walkMin)}m)
            </span>
          </span>
        </div>
        <input
          type="range"
          min={3}
          max={30}
          step={1}
          value={walkMin}
          onChange={(e) => onWalkMinChange(Number(e.target.value))}
          className="w-full accent-neutral-900 dark:accent-white"
        />
        <p className="text-[11px] text-neutral-400">
          직선거리 기준 근사예요. 실제 걷는 길은 조금 더 멀 수 있어요.
        </p>
      </div>

      <Field label="매운맛">
        <Chip active={filters.spicy === 'any'} onClick={() => set('spicy', 'any')}>
          상관없음
        </Chip>
        <Chip active={filters.spicy === 'none'} onClick={() => set('spicy', 'none')}>
          안 매운 것
        </Chip>
        <Chip active={filters.spicy === 'mild'} onClick={() => set('spicy', 'mild')}>
          순한 맛
        </Chip>
        <Chip active={filters.spicy === 'hot'} onClick={() => set('spicy', 'hot')}>
          매운 것
        </Chip>
      </Field>

      <Field label="고기">
        <Chip active={filters.meat === 'any'} onClick={() => set('meat', 'any')}>
          상관없음
        </Chip>
        <Chip active={filters.meat === 'required'} onClick={() => set('meat', 'required')}>
          고기 있는 것
        </Chip>
        <Chip active={filters.meat === 'none'} onClick={() => set('meat', 'none')}>
          고기 없는 것
        </Chip>
      </Field>

      <Field label="국물">
        <Chip active={filters.soup === 'any'} onClick={() => set('soup', 'any')}>
          상관없음
        </Chip>
        <Chip active={filters.soup === 'yes'} onClick={() => set('soup', 'yes')}>
          국물 있는 것
        </Chip>
        <Chip active={filters.soup === 'no'} onClick={() => set('soup', 'no')}>
          국물 없는 것
        </Chip>
      </Field>

      <Field label="양">
        <Chip active={filters.weight === 'any'} onClick={() => set('weight', 'any')}>
          상관없음
        </Chip>
        <Chip active={filters.weight === 'light'} onClick={() => set('weight', 'light')}>
          가볍게
        </Chip>
        <Chip active={filters.weight === 'heavy'} onClick={() => set('weight', 'heavy')}>
          든든하게
        </Chip>
      </Field>
    </div>
  );
}
