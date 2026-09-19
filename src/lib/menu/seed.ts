import type { Menu } from './types';

/**
 * 메뉴 시드 데이터.
 *
 * 편입 기준은 취향이 아니라 테스트 가능한 규칙이다(설계 원칙 1):
 * **그 이름으로 카카오 키워드 검색을 했을 때 가게가 실제로 잡히는 수준까지만 내려간다.**
 * 카카오가 주는 정보는 `음식점 > 한식 > 국밥`까지라, 그 집이 순대국밥을 파는지
 * 고기국밥을 파는지는 알 수 없다. 그래서 "국밥"은 넣고 "고기국밥"은 넣지 않는다.
 * 추천이 약속하지 않은 것은 어긋날 수 없다.
 *
 * 항목을 추가하면 `npm run verify:seed`로 히트 수를 확인할 것.
 *
 * `kakaoCategories`는 카카오 `category_name`에서 찾을 부분 문자열이다.
 * 하나라도 포함되면 그 업종의 가게로 본다.
 *
 * **조각은 좁게 잡는다.** "찌개"처럼 넓게 잡으면 김치찌개집이 부대찌개 결과에 섞인다.
 * 좁혀도 실제 가게를 놓치지 않는 건 `filterRelevant`가 상호명 매칭을 OR로 받쳐주기
 * 때문이다("놀부부대찌개"는 업종이 `찌개,전골`이어도 상호로 잡힌다).
 * 단, 한 가게에서 같이 파는 게 분명한 것들은 공유해도 된다(중국집의 짜장면·짬뽕·탕수육,
 * 백반집의 김치찌개·된장찌개·제육볶음).
 *
 * 맛 3축은 0~3이다.
 *   spicy       0 순함   → 3 매움
 *   richness    0 담백함 → 3 느끼함
 *   temperature 0 시원함 → 3 뜨끈함
 * solo는 혼자 먹을 수 있는가(삼겹살·족발은 2인분부터라 false),
 * quick은 빨리 먹고 나올 수 있는가(굽거나 끓여 먹는 것은 false).
 * formal은 격식 있는 자리에 내놓을 만한가. 메뉴 자체로 판단한다 — 초밥은 true지만 그 동네
 * 초밥집이 회전초밥일 수는 있다. 가게 분위기까지는 약속하지 않는다(원칙 1).
 * pork/beef/chicken은 meat의 세부다. 대표 구성 기준이고, 둘 다 흔하면 둘 다 true다(곱창 = 소곱창·
 * 돼지막창, 갈비 = 소갈비·돼지갈비). 양꼬치처럼 셋에 안 드는 고기는 meat만 true.
 * egg/dairy도 대표 구성 기준이다(라멘의 반숙란, 부대찌개의 치즈 사리).
 * staple은 무엇으로 배를 채우나다. 밥이 딸려 나오면 rice(찌개·국밥·돈까스), 면이면 noodle(수제비·
 * 쌀국수 포함), 고기·요리·빵·떡 위주면 other(삼겹살·족발·피자·떡볶이). 감자탕·닭볶음탕은 나눠 먹는
 * 요리가 중심이라 other다.
 * **업종으로 못 가리는 메뉴는 상호로만 확인한다**(막국수·쭈꾸미·낙지·훠궈). 막국수는 `한식 > 국수`가
 * 잔치국수집과 겹치고, 쭈꾸미·낙지는 `해물,생선`이 횟집과 겹치고, 훠궈는 중식·샤브샤브로 흩어진다.
 * 넓은 업종 조각을 넣으면 횟집을 쭈꾸미집으로 보여주게 되므로 넣지 않는다. 대가로 한산한 동네
 * (카테고리 전수 조회가 되는 곳)에서는 후보에 오르지 못한다 — 틀린 가게를 보여주는 것보다 낫다.
 * 덮밥·브런치·채식·비건은 업종이 흩어지고 상호에도 드물어 넣지 않았다(2026-09 검사).
 * price는 1인 기준 보통 가격대다(low ~1만원 / mid 1~2만원 / high 2만원~). 가게 가격이 아니다.
 * 한정식은 반찬이 여럿이라 고기·해물·밀가루(전)를 전부 true로 둔다. 제약 쪽에서는
 * 넣고 빼는 게 아니라 빼는 쪽으로 틀리는 게 안전하다.
 */
export const MENUS: Menu[] = [
  // ── 한식 · 탕/국 ────────────────────────────────────────────────
  { id: 'gukbap', name: '국밥', cuisine: 'korean-soup', kakaoCategories: ['국밥', '순대'], spicy: 1, richness: 1, temperature: 3, meat: true, pork: true, beef: false, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'rice', soup: true, solo: true, quick: true, formal: false, price: 'mid', weight: 'heavy' },
  { id: 'haejangguk', name: '해장국', cuisine: 'korean-soup', kakaoCategories: ['해장국'], spicy: 2, richness: 1, temperature: 3, meat: true, pork: true, beef: true, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'rice', soup: true, solo: true, quick: true, formal: false, price: 'mid', weight: 'normal' },
  { id: 'seolleongtang', name: '설렁탕', cuisine: 'korean-soup', kakaoCategories: ['설렁탕', '곰탕'], spicy: 0, richness: 1, temperature: 3, meat: true, pork: false, beef: true, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'rice', soup: true, solo: true, quick: true, formal: false, price: 'mid', weight: 'normal' },
  { id: 'galbitang', name: '갈비탕', cuisine: 'korean-soup', kakaoCategories: ['갈비탕', '설렁탕'], spicy: 0, richness: 1, temperature: 3, meat: true, pork: false, beef: true, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'rice', soup: true, solo: true, quick: true, formal: true, price: 'mid', weight: 'normal' },
  { id: 'samgyetang', name: '삼계탕', cuisine: 'korean-soup', kakaoCategories: ['삼계탕'], spicy: 0, richness: 2, temperature: 3, meat: true, pork: false, beef: false, chicken: true, seafood: false, flour: false, egg: false, dairy: false, staple: 'rice', soup: true, solo: true, quick: false, formal: false, price: 'mid', weight: 'heavy' },
  { id: 'kalguksu', name: '칼국수', cuisine: 'korean-soup', kakaoCategories: ['칼국수', '국수'], spicy: 0, richness: 1, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: true, flour: true, egg: false, dairy: false, staple: 'noodle', soup: true, solo: true, quick: true, formal: false, price: 'mid', weight: 'normal' },
  { id: 'sujebi', name: '수제비', cuisine: 'korean-soup', kakaoCategories: ['칼국수'], spicy: 0, richness: 1, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: true, flour: true, egg: false, dairy: false, staple: 'noodle', soup: true, solo: true, quick: true, formal: false, price: 'mid', weight: 'light' },
  { id: 'chueotang', name: '추어탕', cuisine: 'korean-soup', kakaoCategories: ['추어탕'], spicy: 1, richness: 1, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: true, flour: false, egg: false, dairy: false, staple: 'rice', soup: true, solo: true, quick: true, formal: false, price: 'mid', weight: 'normal' },
  { id: 'naengmyeon', name: '냉면', cuisine: 'korean-soup', kakaoCategories: ['냉면'], spicy: 1, richness: 0, temperature: 0, meat: true, pork: false, beef: true, chicken: false, seafood: false, flour: true, egg: true, dairy: false, staple: 'noodle', soup: true, solo: true, quick: true, formal: false, price: 'mid', weight: 'normal' },
  { id: 'makguksu', name: '막국수', cuisine: 'korean-soup', kakaoCategories: ['막국수'], spicy: 1, richness: 0, temperature: 0, meat: false, pork: false, beef: false, chicken: false, seafood: false, flour: true, egg: true, dairy: false, staple: 'noodle', soup: false, solo: true, quick: true, formal: false, price: 'mid', weight: 'light' },

  // ── 한식 · 찌개 ────────────────────────────────────────────────
  { id: 'kimchi-jjigae', name: '김치찌개', cuisine: 'korean-stew', kakaoCategories: ['김치찌개', '백반', '가정식'], spicy: 2, richness: 2, temperature: 3, meat: true, pork: true, beef: false, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'rice', soup: true, solo: true, quick: true, formal: false, price: 'mid', weight: 'normal' },
  { id: 'doenjang-jjigae', name: '된장찌개', cuisine: 'korean-stew', kakaoCategories: ['된장', '백반', '가정식'], spicy: 0, richness: 1, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'rice', soup: true, solo: true, quick: true, formal: false, price: 'mid', weight: 'normal' },
  { id: 'sundubu', name: '순두부찌개', cuisine: 'korean-stew', kakaoCategories: ['두부'], spicy: 2, richness: 1, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: true, flour: false, egg: true, dairy: false, staple: 'rice', soup: true, solo: true, quick: true, formal: false, price: 'mid', weight: 'normal' },
  { id: 'budae-jjigae', name: '부대찌개', cuisine: 'korean-stew', kakaoCategories: ['부대찌개'], spicy: 2, richness: 3, temperature: 3, meat: true, pork: true, beef: false, chicken: false, seafood: false, flour: true, egg: false, dairy: true, staple: 'rice', soup: true, solo: false, quick: false, formal: false, price: 'mid', weight: 'heavy' },
  { id: 'gamjatang', name: '감자탕', cuisine: 'korean-stew', kakaoCategories: ['감자탕'], spicy: 2, richness: 2, temperature: 3, meat: true, pork: true, beef: false, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'other', soup: true, solo: false, quick: false, formal: false, price: 'mid', weight: 'heavy' },
  { id: 'dakbokkeumtang', name: '닭볶음탕', cuisine: 'korean-stew', kakaoCategories: ['닭볶음탕'], spicy: 3, richness: 2, temperature: 3, meat: true, pork: false, beef: false, chicken: true, seafood: false, flour: false, egg: false, dairy: false, staple: 'other', soup: true, solo: false, quick: false, formal: false, price: 'mid', weight: 'heavy' },
  { id: 'haemultang', name: '해물탕', cuisine: 'korean-stew', kakaoCategories: ['해물탕'], spicy: 2, richness: 1, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: true, flour: false, egg: false, dairy: false, staple: 'other', soup: true, solo: false, quick: false, formal: false, price: 'high', weight: 'heavy' },
  { id: 'agujjim', name: '아귀찜', cuisine: 'korean-stew', kakaoCategories: ['아구'], spicy: 3, richness: 1, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: true, flour: false, egg: false, dairy: false, staple: 'other', soup: false, solo: false, quick: false, formal: false, price: 'high', weight: 'heavy' },
  { id: 'shabu', name: '샤브샤브', cuisine: 'korean-stew', kakaoCategories: ['샤브샤브'], spicy: 0, richness: 1, temperature: 3, meat: true, pork: false, beef: true, chicken: false, seafood: false, flour: true, egg: true, dairy: false, staple: 'other', soup: true, solo: false, quick: false, formal: true, price: 'mid', weight: 'heavy' },

  // ── 한식 · 구이 ────────────────────────────────────────────────
  { id: 'samgyeopsal', name: '삼겹살', cuisine: 'korean-grill', kakaoCategories: ['육류', '고기'], spicy: 0, richness: 3, temperature: 3, meat: true, pork: true, beef: false, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'other', soup: false, solo: false, quick: false, formal: false, price: 'mid', weight: 'heavy' },
  { id: 'gopchang', name: '곱창', cuisine: 'korean-grill', kakaoCategories: ['곱창', '막창'], spicy: 1, richness: 3, temperature: 3, meat: true, pork: true, beef: true, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'other', soup: false, solo: false, quick: false, formal: false, price: 'high', weight: 'heavy' },
  { id: 'galbi', name: '갈비', cuisine: 'korean-grill', kakaoCategories: ['육류', '고기'], spicy: 0, richness: 3, temperature: 3, meat: true, pork: true, beef: true, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'other', soup: false, solo: false, quick: false, formal: true, price: 'high', weight: 'heavy' },
  { id: 'jokbal', name: '족발', cuisine: 'korean-grill', kakaoCategories: ['족발', '보쌈'], spicy: 0, richness: 3, temperature: 2, meat: true, pork: true, beef: false, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'other', soup: false, solo: false, quick: false, formal: false, price: 'mid', weight: 'heavy' },
  { id: 'bossam', name: '보쌈', cuisine: 'korean-grill', kakaoCategories: ['족발', '보쌈'], spicy: 0, richness: 2, temperature: 2, meat: true, pork: true, beef: false, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'other', soup: false, solo: false, quick: false, formal: false, price: 'mid', weight: 'heavy' },

  // ── 한식 · 밥 ─────────────────────────────────────────────────
  { id: 'baekban', name: '백반', cuisine: 'korean-rice', kakaoCategories: ['백반', '가정식'], spicy: 1, richness: 1, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'rice', soup: false, solo: true, quick: true, formal: false, price: 'low', weight: 'normal' },
  { id: 'hanjeongsik', name: '한정식', cuisine: 'korean-rice', kakaoCategories: ['한정식'], spicy: 1, richness: 1, temperature: 2, meat: true, pork: true, beef: true, chicken: false, seafood: true, flour: true, egg: true, dairy: false, staple: 'rice', soup: false, solo: false, quick: false, formal: true, price: 'high', weight: 'heavy' },
  { id: 'bibimbap', name: '비빔밥', cuisine: 'korean-rice', kakaoCategories: ['비빔밥', '백반'], spicy: 1, richness: 1, temperature: 2, meat: true, pork: false, beef: true, chicken: false, seafood: false, flour: false, egg: true, dairy: false, staple: 'rice', soup: false, solo: true, quick: true, formal: false, price: 'mid', weight: 'normal' },
  { id: 'jeyuk', name: '제육볶음', cuisine: 'korean-rice', kakaoCategories: ['백반', '가정식'], spicy: 2, richness: 2, temperature: 3, meat: true, pork: true, beef: false, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'rice', soup: false, solo: true, quick: true, formal: false, price: 'mid', weight: 'normal' },
  { id: 'hoedeopbap', name: '회덮밥', cuisine: 'korean-rice', kakaoCategories: ['회'], spicy: 1, richness: 1, temperature: 1, meat: false, pork: false, beef: false, chicken: false, seafood: true, flour: false, egg: false, dairy: false, staple: 'rice', soup: false, solo: true, quick: true, formal: false, price: 'mid', weight: 'light' },
  { id: 'ssambap', name: '쌈밥', cuisine: 'korean-rice', kakaoCategories: ['쌈밥'], spicy: 1, richness: 1, temperature: 2, meat: true, pork: true, beef: false, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'rice', soup: false, solo: false, quick: false, formal: false, price: 'mid', weight: 'heavy' },
  { id: 'juk', name: '죽', cuisine: 'korean-rice', kakaoCategories: ['죽'], spicy: 0, richness: 0, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'rice', soup: false, solo: true, quick: true, formal: false, price: 'mid', weight: 'light' },
  { id: 'dosirak', name: '도시락', cuisine: 'korean-rice', kakaoCategories: ['도시락'], spicy: 1, richness: 2, temperature: 2, meat: true, pork: true, beef: false, chicken: true, seafood: false, flour: true, egg: true, dairy: false, staple: 'rice', soup: false, solo: true, quick: true, formal: false, price: 'low', weight: 'normal' },
  { id: 'jjukkumi', name: '쭈꾸미', cuisine: 'korean-rice', kakaoCategories: ['쭈꾸미'], spicy: 3, richness: 1, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: true, flour: false, egg: false, dairy: false, staple: 'rice', soup: false, solo: false, quick: false, formal: false, price: 'mid', weight: 'heavy' },
  { id: 'nakji', name: '낙지', cuisine: 'korean-rice', kakaoCategories: ['낙지'], spicy: 3, richness: 1, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: true, flour: false, egg: false, dairy: false, staple: 'rice', soup: false, solo: true, quick: true, formal: false, price: 'mid', weight: 'normal' },

  // ── 중식 ──────────────────────────────────────────────────────
  { id: 'jajangmyeon', name: '짜장면', cuisine: 'chinese', kakaoCategories: ['중식'], spicy: 0, richness: 3, temperature: 3, meat: true, pork: true, beef: false, chicken: false, seafood: false, flour: true, egg: false, dairy: false, staple: 'noodle', soup: false, solo: true, quick: true, formal: false, price: 'low', weight: 'normal' },
  { id: 'jjamppong', name: '짬뽕', cuisine: 'chinese', kakaoCategories: ['중식'], spicy: 3, richness: 2, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: true, flour: true, egg: false, dairy: false, staple: 'noodle', soup: true, solo: true, quick: true, formal: false, price: 'low', weight: 'normal' },
  { id: 'tangsuyuk', name: '탕수육', cuisine: 'chinese', kakaoCategories: ['중식'], spicy: 0, richness: 3, temperature: 2, meat: true, pork: true, beef: false, chicken: false, seafood: false, flour: true, egg: false, dairy: false, staple: 'other', soup: false, solo: false, quick: false, formal: false, price: 'mid', weight: 'heavy' },
  { id: 'malatang', name: '마라탕', cuisine: 'chinese', kakaoCategories: ['마라', '중식'], spicy: 3, richness: 2, temperature: 3, meat: true, pork: false, beef: true, chicken: false, seafood: false, flour: true, egg: false, dairy: false, staple: 'noodle', soup: true, solo: true, quick: true, formal: false, price: 'mid', weight: 'normal' },
  { id: 'yangkkochi', name: '양꼬치', cuisine: 'chinese', kakaoCategories: ['양꼬치', '중식'], spicy: 1, richness: 3, temperature: 3, meat: true, pork: false, beef: false, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'other', soup: false, solo: false, quick: false, formal: false, price: 'mid', weight: 'heavy' },
  { id: 'hoguo', name: '훠궈', cuisine: 'chinese', kakaoCategories: ['훠궈'], spicy: 3, richness: 2, temperature: 3, meat: true, pork: false, beef: true, chicken: false, seafood: false, flour: true, egg: false, dairy: false, staple: 'other', soup: true, solo: false, quick: false, formal: false, price: 'mid', weight: 'heavy' },

  // ── 일식 ──────────────────────────────────────────────────────
  { id: 'chobap', name: '초밥', cuisine: 'japanese', kakaoCategories: ['초밥', '롤'], spicy: 0, richness: 1, temperature: 1, meat: false, pork: false, beef: false, chicken: false, seafood: true, flour: false, egg: false, dairy: false, staple: 'rice', soup: false, solo: true, quick: true, formal: true, price: 'mid', weight: 'light' },
  { id: 'ramen', name: '라멘', cuisine: 'japanese', kakaoCategories: ['라멘'], spicy: 1, richness: 3, temperature: 3, meat: true, pork: true, beef: false, chicken: false, seafood: false, flour: true, egg: true, dairy: false, staple: 'noodle', soup: true, solo: true, quick: true, formal: false, price: 'mid', weight: 'normal' },
  { id: 'donkkaseu', name: '돈까스', cuisine: 'japanese', kakaoCategories: ['돈까스', '우동'], spicy: 0, richness: 3, temperature: 3, meat: true, pork: true, beef: false, chicken: false, seafood: false, flour: true, egg: true, dairy: false, staple: 'rice', soup: false, solo: true, quick: true, formal: false, price: 'mid', weight: 'heavy' },
  { id: 'udon', name: '우동', cuisine: 'japanese', kakaoCategories: ['돈까스', '우동'], spicy: 0, richness: 1, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: true, flour: true, egg: false, dairy: false, staple: 'noodle', soup: true, solo: true, quick: true, formal: false, price: 'low', weight: 'light' },
  { id: 'hoe', name: '회', cuisine: 'japanese', kakaoCategories: ['회'], spicy: 0, richness: 1, temperature: 0, meat: false, pork: false, beef: false, chicken: false, seafood: true, flour: false, egg: false, dairy: false, staple: 'other', soup: false, solo: false, quick: false, formal: true, price: 'high', weight: 'light' },

  // ── 양식 ──────────────────────────────────────────────────────
  { id: 'pasta', name: '파스타', cuisine: 'western', kakaoCategories: ['이탈리안', '양식'], spicy: 1, richness: 3, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: false, flour: true, egg: false, dairy: true, staple: 'noodle', soup: false, solo: true, quick: false, formal: false, price: 'mid', weight: 'normal' },
  { id: 'pizza', name: '피자', cuisine: 'western', kakaoCategories: ['피자'], spicy: 1, richness: 3, temperature: 3, meat: true, pork: true, beef: false, chicken: false, seafood: false, flour: true, egg: false, dairy: true, staple: 'other', soup: false, solo: false, quick: false, formal: false, price: 'mid', weight: 'heavy' },
  { id: 'steak', name: '스테이크', cuisine: 'western', kakaoCategories: ['스테이크'], spicy: 0, richness: 3, temperature: 3, meat: true, pork: false, beef: true, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'other', soup: false, solo: false, quick: false, formal: true, price: 'high', weight: 'heavy' },
  { id: 'salad', name: '샐러드', cuisine: 'western', kakaoCategories: ['샐러드'], spicy: 0, richness: 0, temperature: 1, meat: false, pork: false, beef: false, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'other', soup: false, solo: true, quick: true, formal: false, price: 'mid', weight: 'light' },
  { id: 'risotto', name: '리조또', cuisine: 'western', kakaoCategories: ['이탈리안', '양식'], spicy: 0, richness: 3, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: false, flour: false, egg: false, dairy: true, staple: 'rice', soup: false, solo: true, quick: false, formal: false, price: 'mid', weight: 'normal' },
  { id: 'taco', name: '타코', cuisine: 'western', kakaoCategories: ['멕시칸'], spicy: 1, richness: 2, temperature: 2, meat: true, pork: true, beef: true, chicken: true, seafood: false, flour: true, egg: false, dairy: true, staple: 'other', soup: false, solo: true, quick: true, formal: false, price: 'mid', weight: 'normal' },

  // ── 아시아 ────────────────────────────────────────────────────
  { id: 'ssalguksu', name: '쌀국수', cuisine: 'asian', kakaoCategories: ['베트남', '쌀국수'], spicy: 1, richness: 1, temperature: 3, meat: true, pork: false, beef: true, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'noodle', soup: true, solo: true, quick: true, formal: false, price: 'mid', weight: 'light' },
  { id: 'padthai', name: '팟타이', cuisine: 'asian', kakaoCategories: ['태국'], spicy: 1, richness: 2, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: true, flour: false, egg: true, dairy: false, staple: 'noodle', soup: false, solo: true, quick: true, formal: false, price: 'mid', weight: 'normal' },
  { id: 'curry', name: '카레', cuisine: 'asian', kakaoCategories: ['인도', '카레'], spicy: 2, richness: 2, temperature: 3, meat: true, pork: true, beef: false, chicken: true, seafood: false, flour: false, egg: false, dairy: false, staple: 'rice', soup: false, solo: true, quick: true, formal: false, price: 'mid', weight: 'normal' },
  { id: 'buncha', name: '분짜', cuisine: 'asian', kakaoCategories: ['베트남', '쌀국수'], spicy: 1, richness: 1, temperature: 2, meat: true, pork: true, beef: false, chicken: false, seafood: false, flour: false, egg: false, dairy: false, staple: 'noodle', soup: false, solo: true, quick: true, formal: false, price: 'mid', weight: 'normal' },
  { id: 'kebab', name: '케밥', cuisine: 'asian', kakaoCategories: ['튀르키예', '케밥'], spicy: 1, richness: 2, temperature: 2, meat: true, pork: false, beef: true, chicken: true, seafood: false, flour: true, egg: false, dairy: true, staple: 'other', soup: false, solo: true, quick: true, formal: false, price: 'low', weight: 'normal' },

  // ── 분식 ──────────────────────────────────────────────────────
  { id: 'tteokbokki', name: '떡볶이', cuisine: 'snack', kakaoCategories: ['분식', '떡볶이'], spicy: 3, richness: 1, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: false, flour: true, egg: true, dairy: false, staple: 'other', soup: false, solo: true, quick: true, formal: false, price: 'low', weight: 'light' },
  { id: 'gimbap', name: '김밥', cuisine: 'snack', kakaoCategories: ['분식', '김밥'], spicy: 0, richness: 1, temperature: 1, meat: false, pork: false, beef: false, chicken: false, seafood: false, flour: false, egg: true, dairy: false, staple: 'rice', soup: false, solo: true, quick: true, formal: false, price: 'low', weight: 'light' },
  { id: 'ramyeon', name: '라면', cuisine: 'snack', kakaoCategories: ['분식'], spicy: 2, richness: 2, temperature: 3, meat: false, pork: false, beef: false, chicken: false, seafood: false, flour: true, egg: true, dairy: false, staple: 'noodle', soup: true, solo: true, quick: true, formal: false, price: 'low', weight: 'light' },
  { id: 'mandu', name: '만두', cuisine: 'snack', kakaoCategories: ['만두', '분식'], spicy: 0, richness: 2, temperature: 3, meat: true, pork: true, beef: false, chicken: false, seafood: false, flour: true, egg: false, dairy: false, staple: 'other', soup: false, solo: true, quick: true, formal: false, price: 'low', weight: 'normal' },

  // ── 치킨 ──────────────────────────────────────────────────────
  { id: 'chicken', name: '치킨', cuisine: 'chicken', kakaoCategories: ['치킨'], spicy: 1, richness: 3, temperature: 3, meat: true, pork: false, beef: false, chicken: true, seafood: false, flour: true, egg: false, dairy: false, staple: 'other', soup: false, solo: false, quick: false, formal: false, price: 'mid', weight: 'heavy' },
  { id: 'dakgalbi', name: '닭갈비', cuisine: 'chicken', kakaoCategories: ['닭갈비'], spicy: 3, richness: 2, temperature: 3, meat: true, pork: false, beef: false, chicken: true, seafood: false, flour: false, egg: false, dairy: false, staple: 'other', soup: false, solo: false, quick: false, formal: false, price: 'mid', weight: 'heavy' },

  // ── 패스트푸드 ─────────────────────────────────────────────────
  { id: 'burger', name: '햄버거', cuisine: 'fastfood', kakaoCategories: ['햄버거', '패스트푸드'], spicy: 1, richness: 3, temperature: 3, meat: true, pork: false, beef: true, chicken: false, seafood: false, flour: true, egg: false, dairy: true, staple: 'other', soup: false, solo: true, quick: true, formal: false, price: 'low', weight: 'heavy' },
  { id: 'sandwich', name: '샌드위치', cuisine: 'fastfood', kakaoCategories: ['샌드위치'], spicy: 0, richness: 2, temperature: 1, meat: true, pork: true, beef: false, chicken: false, seafood: false, flour: true, egg: true, dairy: true, staple: 'other', soup: false, solo: true, quick: true, formal: false, price: 'low', weight: 'light' },
];

export const MENU_BY_ID = new Map(MENUS.map((m) => [m.id, m]));
