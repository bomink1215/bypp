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
 * **조각은 좁게 잡는다.** '찌개'처럼 넓게 잡으면 김치찌개집이 부대찌개 결과에 섞인다.
 * 좁혀도 실제 가게를 놓치지 않는 건 `filterRelevant`가 상호명 매칭을 OR로 받쳐주기
 * 때문이다("놀부부대찌개"는 업종이 `찌개,전골`이어도 상호로 잡힌다).
 * 단, 한 가게에서 같이 파는 게 분명한 것들은 공유해도 된다(중국집의 짜장면·짬뽕·탕수육,
 * 백반집의 김치찌개·된장찌개·제육볶음).
 */
export const MENUS: Menu[] = [
  // ── 한식 · 탕/국 ────────────────────────────────────────────────
  { id: 'gukbap', name: '국밥', cuisine: 'korean-soup', kakaoCategories: ['국밥', '순대'], spicy: 1, meat: ['pork', 'beef'], soup: true, weight: 'heavy' },
  { id: 'haejangguk', name: '해장국', cuisine: 'korean-soup', kakaoCategories: ['해장국'], spicy: 2, meat: ['beef'], soup: true, weight: 'normal' },
  { id: 'seolleongtang', name: '설렁탕', cuisine: 'korean-soup', kakaoCategories: ['설렁탕', '곰탕'], spicy: 0, meat: ['beef'], soup: true, weight: 'normal' },
  { id: 'galbitang', name: '갈비탕', cuisine: 'korean-soup', kakaoCategories: ['갈비탕', '설렁탕'], spicy: 0, meat: ['beef'], soup: true, weight: 'normal' },
  { id: 'samgyetang', name: '삼계탕', cuisine: 'korean-soup', kakaoCategories: ['삼계탕'], spicy: 0, meat: ['chicken'], soup: true, weight: 'heavy' },
  { id: 'kalguksu', name: '칼국수', cuisine: 'korean-soup', kakaoCategories: ['칼국수', '국수'], spicy: 0, meat: ['seafood'], soup: true, weight: 'normal' },
  { id: 'sujebi', name: '수제비', cuisine: 'korean-soup', kakaoCategories: ['칼국수'], spicy: 0, meat: ['none'], soup: true, weight: 'light' },
  { id: 'chueotang', name: '추어탕', cuisine: 'korean-soup', kakaoCategories: ['추어탕'], spicy: 1, meat: ['seafood'], soup: true, weight: 'normal' },

  // ── 한식 · 찌개 ────────────────────────────────────────────────
  { id: 'kimchi-jjigae', name: '김치찌개', cuisine: 'korean-stew', kakaoCategories: ['김치찌개', '백반', '가정식'], spicy: 2, meat: ['pork'], soup: true, weight: 'normal' },
  { id: 'doenjang-jjigae', name: '된장찌개', cuisine: 'korean-stew', kakaoCategories: ['된장', '백반', '가정식'], spicy: 0, meat: ['none'], soup: true, weight: 'normal' },
  { id: 'sundubu', name: '순두부찌개', cuisine: 'korean-stew', kakaoCategories: ['두부'], spicy: 2, meat: ['seafood'], soup: true, weight: 'normal' },
  { id: 'budae-jjigae', name: '부대찌개', cuisine: 'korean-stew', kakaoCategories: ['부대찌개'], spicy: 2, meat: ['pork'], soup: true, weight: 'heavy' },
  { id: 'gamjatang', name: '감자탕', cuisine: 'korean-stew', kakaoCategories: ['감자탕'], spicy: 2, meat: ['pork'], soup: true, weight: 'heavy' },
  { id: 'dakbokkeumtang', name: '닭볶음탕', cuisine: 'korean-stew', kakaoCategories: ['닭볶음탕'], spicy: 3, meat: ['chicken'], soup: true, weight: 'heavy' },

  // ── 한식 · 구이 ────────────────────────────────────────────────
  { id: 'samgyeopsal', name: '삼겹살', cuisine: 'korean-grill', kakaoCategories: ['육류', '고기'], spicy: 0, meat: ['pork'], soup: false, weight: 'heavy' },
  { id: 'gopchang', name: '곱창', cuisine: 'korean-grill', kakaoCategories: ['곱창', '막창'], spicy: 1, meat: ['beef'], soup: false, weight: 'heavy' },
  { id: 'galbi', name: '갈비', cuisine: 'korean-grill', kakaoCategories: ['육류', '고기'], spicy: 0, meat: ['beef'], soup: false, weight: 'heavy' },
  { id: 'jokbal', name: '족발', cuisine: 'korean-grill', kakaoCategories: ['족발', '보쌈'], spicy: 0, meat: ['pork'], soup: false, weight: 'heavy' },
  { id: 'bossam', name: '보쌈', cuisine: 'korean-grill', kakaoCategories: ['족발', '보쌈'], spicy: 0, meat: ['pork'], soup: false, weight: 'heavy' },

  // ── 한식 · 밥 ─────────────────────────────────────────────────
  { id: 'baekban', name: '백반', cuisine: 'korean-rice', kakaoCategories: ['백반', '가정식'], spicy: 1, meat: ['none'], soup: false, weight: 'normal' },
  { id: 'bibimbap', name: '비빔밥', cuisine: 'korean-rice', kakaoCategories: ['비빔밥', '백반'], spicy: 1, meat: ['beef'], soup: false, weight: 'normal' },
  { id: 'jeyuk', name: '제육볶음', cuisine: 'korean-rice', kakaoCategories: ['백반', '가정식'], spicy: 2, meat: ['pork'], soup: false, weight: 'normal' },
  { id: 'hoedeopbap', name: '회덮밥', cuisine: 'korean-rice', kakaoCategories: ['회'], spicy: 1, meat: ['seafood'], soup: false, weight: 'light' },

  // ── 중식 ──────────────────────────────────────────────────────
  { id: 'jajangmyeon', name: '짜장면', cuisine: 'chinese', kakaoCategories: ['중식'], spicy: 0, meat: ['pork'], soup: false, weight: 'normal' },
  { id: 'jjamppong', name: '짬뽕', cuisine: 'chinese', kakaoCategories: ['중식'], spicy: 3, meat: ['seafood'], soup: true, weight: 'normal' },
  { id: 'tangsuyuk', name: '탕수육', cuisine: 'chinese', kakaoCategories: ['중식'], spicy: 0, meat: ['pork'], soup: false, weight: 'heavy' },
  { id: 'malatang', name: '마라탕', cuisine: 'chinese', kakaoCategories: ['마라', '중식'], spicy: 3, meat: ['pork'], soup: true, weight: 'normal' },
  { id: 'yangkkochi', name: '양꼬치', cuisine: 'chinese', kakaoCategories: ['양꼬치', '중식'], spicy: 1, meat: ['beef'], soup: false, weight: 'heavy' },

  // ── 일식 ──────────────────────────────────────────────────────
  { id: 'chobap', name: '초밥', cuisine: 'japanese', kakaoCategories: ['초밥', '롤'], spicy: 0, meat: ['seafood'], soup: false, weight: 'light' },
  { id: 'ramen', name: '라멘', cuisine: 'japanese', kakaoCategories: ['라멘'], spicy: 1, meat: ['pork'], soup: true, weight: 'normal' },
  { id: 'donkkaseu', name: '돈까스', cuisine: 'japanese', kakaoCategories: ['돈까스', '우동'], spicy: 0, meat: ['pork'], soup: false, weight: 'heavy' },
  { id: 'udon', name: '우동', cuisine: 'japanese', kakaoCategories: ['돈까스', '우동'], spicy: 0, meat: ['seafood'], soup: true, weight: 'light' },
  { id: 'hoe', name: '회', cuisine: 'japanese', kakaoCategories: ['회'], spicy: 0, meat: ['seafood'], soup: false, weight: 'light' },

  // ── 양식 ──────────────────────────────────────────────────────
  { id: 'pasta', name: '파스타', cuisine: 'western', kakaoCategories: ['이탈리안', '양식'], spicy: 1, meat: ['none'], soup: false, weight: 'normal' },
  { id: 'pizza', name: '피자', cuisine: 'western', kakaoCategories: ['피자'], spicy: 1, meat: ['pork'], soup: false, weight: 'heavy' },
  { id: 'steak', name: '스테이크', cuisine: 'western', kakaoCategories: ['스테이크'], spicy: 0, meat: ['beef'], soup: false, weight: 'heavy' },
  { id: 'salad', name: '샐러드', cuisine: 'western', kakaoCategories: ['샐러드'], spicy: 0, meat: ['none'], soup: false, weight: 'light' },
  { id: 'risotto', name: '리조또', cuisine: 'western', kakaoCategories: ['이탈리안', '양식'], spicy: 0, meat: ['none'], soup: false, weight: 'normal' },

  // ── 아시아 ────────────────────────────────────────────────────
  { id: 'ssalguksu', name: '쌀국수', cuisine: 'asian', kakaoCategories: ['베트남', '쌀국수'], spicy: 1, meat: ['beef'], soup: true, weight: 'light' },
  { id: 'padthai', name: '팟타이', cuisine: 'asian', kakaoCategories: ['태국'], spicy: 1, meat: ['seafood'], soup: false, weight: 'normal' },
  { id: 'curry', name: '카레', cuisine: 'asian', kakaoCategories: ['인도', '카레'], spicy: 2, meat: ['chicken'], soup: false, weight: 'normal' },
  { id: 'buncha', name: '분짜', cuisine: 'asian', kakaoCategories: ['베트남', '쌀국수'], spicy: 1, meat: ['pork'], soup: false, weight: 'normal' },

  // ── 분식 ──────────────────────────────────────────────────────
  { id: 'tteokbokki', name: '떡볶이', cuisine: 'snack', kakaoCategories: ['분식', '떡볶이'], spicy: 3, meat: ['none'], soup: false, weight: 'light' },
  { id: 'gimbap', name: '김밥', cuisine: 'snack', kakaoCategories: ['분식', '김밥'], spicy: 0, meat: ['none'], soup: false, weight: 'light' },
  { id: 'ramyeon', name: '라면', cuisine: 'snack', kakaoCategories: ['분식'], spicy: 2, meat: ['none'], soup: true, weight: 'light' },
  { id: 'mandu', name: '만두', cuisine: 'snack', kakaoCategories: ['만두', '분식'], spicy: 0, meat: ['pork'], soup: false, weight: 'normal' },

  // ── 치킨 ──────────────────────────────────────────────────────
  { id: 'chicken', name: '치킨', cuisine: 'chicken', kakaoCategories: ['치킨'], spicy: 1, meat: ['chicken'], soup: false, weight: 'heavy' },
  { id: 'dakgalbi', name: '닭갈비', cuisine: 'chicken', kakaoCategories: ['닭갈비'], spicy: 3, meat: ['chicken'], soup: false, weight: 'heavy' },

  // ── 패스트푸드 ─────────────────────────────────────────────────
  { id: 'burger', name: '햄버거', cuisine: 'fastfood', kakaoCategories: ['햄버거', '패스트푸드'], spicy: 1, meat: ['beef'], soup: false, weight: 'heavy' },
  { id: 'sandwich', name: '샌드위치', cuisine: 'fastfood', kakaoCategories: ['샌드위치'], spicy: 0, meat: ['pork'], soup: false, weight: 'light' },
];

export const MENU_BY_ID = new Map(MENUS.map((m) => [m.id, m]));
