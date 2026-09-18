/**
 * 시드 메뉴가 설계 원칙 1을 지키는지 검사한다.
 *
 *   "그 이름으로 카카오 키워드 검색을 했을 때 가게가 실제로 잡히는 수준까지만 내려간다"
 *
 * 이 규칙을 사람 기억이 아니라 스크립트로 강제하기 위한 것이다. 히트가 0이면
 * 그 메뉴는 추천해봤자 보여줄 가게가 없으니 시드에서 빼야 한다.
 *
 *   npm run verify:seed
 *
 * 전국 단위(좌표 없이)로 검색하므로 "내 주변에 있는가"가 아니라
 * "카카오가 이 이름을 장소로 아는가"를 본다.
 */
import { MENUS } from '../src/lib/menu/seed.ts';

const KEY = process.env.KAKAO_REST_API_KEY;
if (!KEY) {
  console.error('KAKAO_REST_API_KEY가 없습니다. .env.local을 확인하세요.');
  process.exit(1);
}

/** 이보다 적게 잡히면 시드에서 빼는 것을 검토한다. */
const WARN_THRESHOLD = 30;

async function countFor(query: string): Promise<number> {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json');
  url.searchParams.set('query', query);
  url.searchParams.set('category_group_code', 'FD6');
  url.searchParams.set('size', '1');

  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } });
  if (!res.ok) throw new Error(`${query}: 카카오 API ${res.status}`);

  const body = (await res.json()) as { meta: { total_count: number } };
  return body.meta.total_count;
}

const failed: string[] = [];
const weak: string[] = [];

for (const menu of MENUS) {
  const count = await countFor(menu.name);
  const mark = count === 0 ? 'FAIL' : count < WARN_THRESHOLD ? 'WEAK' : 'ok  ';

  console.log(`${mark}  ${menu.name.padEnd(8)} ${String(count).padStart(7)}건  (${menu.cuisine})`);

  if (count === 0) failed.push(menu.name);
  else if (count < WARN_THRESHOLD) weak.push(menu.name);

  // 쿼터는 넉넉하지만 연속 호출은 조금 띄운다.
  await new Promise((r) => setTimeout(r, 60));
}

console.log(`\n총 ${MENUS.length}개 검사`);
if (weak.length > 0) console.log(`검토 필요(${WARN_THRESHOLD}건 미만): ${weak.join(', ')}`);

if (failed.length > 0) {
  console.error(`\n0건이라 시드에서 빼야 합니다: ${failed.join(', ')}`);
  process.exit(1);
}

console.log('모든 시드가 원칙 1을 통과했습니다.');
