'use client';

import { useState } from 'react';

import { LocationPicker } from './LocationPicker';
import { walkMinutesToRadius } from '@/lib/distance';
import { RESTRICTIONS, RESTRICTION_LABEL, type Restriction } from '@/lib/menu/restrictions';
import type { MenuFilters, Taste, Toggle } from '@/lib/menu/types';
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
  restrictions: readonly Restriction[];
  onToggleRestriction: (r: Restriction) => void;
  /** 지도 초기 중심. 현재 위치를 이미 잡았다면 거기서 시작한다. */
  currentCoords: Coords | null;
  /** 방에서는 위치와 시간을 방장이 정하므로 참가자에게는 감춘다. */
  hideLocationAndTime?: boolean;
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

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-neutral-100 pt-4 first:border-0 first:pt-0 dark:border-neutral-800">
      <h3 className="text-xs font-semibold tracking-wide text-neutral-400">{title}</h3>
      {children}
    </section>
  );
}

/**
 * 슬라이더 칸 → 맛 값.
 *
 * 맛은 0~3 네 단계인데, 네 칸짜리 바에는 정중앙이 없어 "상관없음"이 한쪽으로 치우친다.
 * 그래서 칸을 다섯 개로 두고 **가운데 칸을 상관없음(null)** 으로 쓴다. 양극단 바에서
 * 가운데가 "어느 쪽도 아님"인 건 의미상으로도 맞다.
 *
 *   0      1      2       3      4   ← 슬라이더 칸
 *   순함 ──────── 상관없음 ──────── 매움
 *   0      1     (null)    2      3   ← 맛 값
 */
const POSITIONS: readonly Taste[] = [0, 1, null, 2, 3];
const CENTER = 2;

function TasteBar({
  left,
  right,
  value,
  onChange,
}: {
  left: string;
  right: string;
  value: Taste;
  onChange: (v: Taste) => void;
}) {
  const pos = value === null ? CENTER : POSITIONS.indexOf(value);
  const active = value !== null;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={`flex-1 ${pos < CENTER ? 'font-semibold' : 'text-neutral-500'}`}>{left}</span>

        {active ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 text-[11px] text-neutral-400 underline underline-offset-2 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            상관없음으로
          </button>
        ) : (
          <span className="shrink-0 text-[11px] text-neutral-400">상관없음</span>
        )}

        <span className={`flex-1 text-right ${pos > CENTER ? 'font-semibold' : 'text-neutral-500'}`}>
          {right}
        </span>
      </div>

      <div className="relative mt-1.5">
        {/* 가운데가 어디인지 눈으로 알 수 있게 눈금을 하나 둔다. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-neutral-200 dark:bg-neutral-700"
        />
        <input
          type="range"
          min={0}
          max={POSITIONS.length - 1}
          step={1}
          value={pos}
          onChange={(e) => onChange(POSITIONS[Number(e.target.value)])}
          className={`relative w-full ${
            active
              ? 'accent-neutral-900 dark:accent-white'
              : 'accent-neutral-300 dark:accent-neutral-600'
          }`}
          aria-label={`${left} ↔ ${right}`}
          aria-valuetext={active ? (pos < CENTER ? left : right) : '상관없음'}
        />
      </div>
    </div>
  );
}

/** 있음 / 없음 / 상관없음. 식재료·기타처럼 답이 분명한 축에 쓴다. */
function ToggleRow({
  label,
  value,
  onChange,
  yes = '있음',
  no = '없음',
}: {
  label: string;
  value: Toggle;
  onChange: (v: Toggle) => void;
  yes?: string;
  no?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1.5">
        <Chip active={value === 'any'} onClick={() => onChange('any')}>
          상관없음
        </Chip>
        <Chip active={value === 'yes'} onClick={() => onChange('yes')}>
          {yes}
        </Chip>
        <Chip active={value === 'no'} onClick={() => onChange('no')}>
          {no}
        </Chip>
      </div>
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
  restrictions,
  onToggleRestriction,
  currentCoords,
  hideLocationAndTime = false,
}: Props) {
  const [picking, setPicking] = useState(false);

  const set = <K extends keyof MenuFilters>(key: K, value: MenuFilters[K]) =>
    onFiltersChange({ ...filters, [key]: value });

  return (
    <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      {/*
        못 먹는 것은 매번 고르는 옵션이 아니라 저장되는 설정이다. 섞이면 "오늘은 고기 말고"와
        "고기를 못 먹는다"를 혼동하게 되므로 배경을 달리해 시각적으로 떼어놓는다.
      */}
      <section className="-m-1 space-y-2.5 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-neutral-500 dark:text-neutral-400">
            못 먹는 것
          </h3>
          <span className="text-[11px] text-neutral-400">
            {restrictions.length > 0 ? '이 브라우저에 저장됨' : '한 번만 정해두세요'}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {RESTRICTIONS.map((r) => (
            <Chip key={r} active={restrictions.includes(r)} onClick={() => onToggleRestriction(r)}>
              {RESTRICTION_LABEL[r]}
            </Chip>
          ))}
        </div>

        <p className="text-[11px] leading-relaxed text-neutral-400">
          고른 것은 추천에서 <span className="font-medium">항상 빠집니다.</span> 다만 가게별 조리법까지는
          알 수 없으니 알레르기가 있다면 주문 전에 직접 확인하세요.
        </p>
      </section>

      {!hideLocationAndTime && (
      <Group title="위치와 시간">
        {picking ? (
          <LocationPicker
            initial={currentCoords}
            onPick={(c, name) => {
              onPickRegion(c, name);
              setPicking(false);
            }}
            onCancel={() => setPicking(false)}
          />
        ) : geoStatus === 'ready' ? (
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{locationLabel}</span>
            <div className="flex shrink-0 gap-2 text-xs text-neutral-500">
              <button
                type="button"
                onClick={onRequestLocation}
                className="underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200"
              >
                현재 위치
              </button>
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200"
              >
                지도에서
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
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

            <button
              type="button"
              onClick={() => setPicking(true)}
              className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium dark:border-neutral-700"
            >
              지도에서 직접 찍기
            </button>

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

        <div className="flex flex-wrap items-center gap-2">
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
          <span className="text-xs text-neutral-400">{formatWhen(when)} 기준</span>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm">도보 {walkMin}분 이내</span>
            <span className="text-xs text-neutral-400">반경 약 {walkMinutesToRadius(walkMin)}m</span>
          </div>
          <input
            type="range"
            min={3}
            max={30}
            step={1}
            value={walkMin}
            onChange={(e) => onWalkMinChange(Number(e.target.value))}
            className="mt-1.5 w-full accent-neutral-900 dark:accent-white"
            aria-label="도보 시간"
          />
          <p className="text-[11px] text-neutral-400">
            직선거리 기준 근사예요. 실제 걷는 길은 조금 더 멀 수 있어요.
          </p>
        </div>
      </Group>
      )}

      <Group title="맛">
        <div className="space-y-4">
          <TasteBar left="순함" right="매움" value={filters.spicy} onChange={(v) => set('spicy', v)} />
          <TasteBar
            left="담백함"
            right="느끼함"
            value={filters.richness}
            onChange={(v) => set('richness', v)}
          />
          <TasteBar
            left="시원함"
            right="뜨끈함"
            value={filters.temperature}
            onChange={(v) => set('temperature', v)}
          />
        </div>
      </Group>

      <Group title="식재료">
        <div className="space-y-2.5">
          <ToggleRow label="고기" value={filters.meat} onChange={(v) => set('meat', v)} />
          <ToggleRow label="해물" value={filters.seafood} onChange={(v) => set('seafood', v)} />
          <ToggleRow label="밀가루" value={filters.flour} onChange={(v) => set('flour', v)} />
        </div>
      </Group>

      <Group title="양">
        <div className="flex flex-wrap gap-2">
          <Chip active={filters.weight === 'any'} onClick={() => set('weight', 'any')}>
            상관없음
          </Chip>
          <Chip active={filters.weight === 'light'} onClick={() => set('weight', 'light')}>
            가볍게
          </Chip>
          <Chip active={filters.weight === 'heavy'} onClick={() => set('weight', 'heavy')}>
            든든하게
          </Chip>
        </div>
      </Group>

      <Group title="기타">
        <div className="space-y-2.5">
          <ToggleRow label="국물" value={filters.soup} onChange={(v) => set('soup', v)} />
          <ToggleRow
            label="혼밥"
            value={filters.solo}
            onChange={(v) => set('solo', v)}
            yes="가능한 것"
            no="여럿이"
          />
          <ToggleRow
            label="빨리 먹기"
            value={filters.quick}
            onChange={(v) => set('quick', v)}
            yes="가능한 것"
            no="천천히"
          />
        </div>
      </Group>
    </div>
  );
}
