import type { Cuisine, Menu } from './types';

/**
 * 카카오 `category_name` → 업종(Cuisine) 매핑.
 *
 * 카카오는 `음식점 > 한식 > 국밥` 형태의 세분류를 준다. 이 문자열에서 업종을
 * 읽어내 (1) 주변에 어떤 업종이 실제로 있는지 파악하고 (2) 영업 가능성 추정에 쓴다.
 *
 * 구체적인 규칙이 먼저 오도록 순서에 의존한다. `한식` 같은 넓은 조각은 맨 뒤에 둔다.
 */
const RULES: ReadonlyArray<readonly [readonly string[], Cuisine]> = [
  [['국밥', '해장국', '설렁탕', '곰탕', '갈비탕', '삼계탕', '추어탕', '칼국수', '국수', '냉면'], 'korean-soup'],
  // 샤브샤브는 카카오에서 한식 밖 최상위 업종이다. 영업 패턴이 전골과 같아 여기에 둔다.
  [['찌개', '전골', '부대찌개', '감자탕', '두부', '찜', '해물탕', '매운탕', '아구', '샤브샤브'], 'korean-stew'],
  [['곱창', '막창', '족발', '보쌈', '육류', '고기', '갈비'], 'korean-grill'],
  [['치킨', '닭갈비', '닭'], 'chicken'],
  [['분식', '떡볶이', '김밥', '만두'], 'snack'],
  [['중식', '마라', '양꼬치'], 'chinese'],
  [['초밥', '롤', '돈까스', '우동', '라멘', '회', '일식'], 'japanese'],
  [['피자', '스테이크', '이탈리안', '샐러드', '양식'], 'western'],
  [['베트남', '쌀국수', '태국', '인도', '카레', '아시아'], 'asian'],
  [['햄버거', '샌드위치', '패스트푸드'], 'fastfood'],
  // 세분류가 없거나 못 알아본 한식은 마지막에 백반으로 떨어뜨린다.
  [['백반', '가정식', '비빔밥', '도시락', '한식'], 'korean-rice'],
];

export function cuisineOf(categoryName: string): Cuisine | null {
  for (const [fragments, cuisine] of RULES) {
    if (fragments.some((f) => categoryName.includes(f))) return cuisine;
  }
  return null;
}

/** 이 메뉴를 파는 업종의 가게인가. `kakaoCategories` 조각이 하나라도 걸리면 참. */
export function menuMatchesCategory(menu: Menu, categoryName: string): boolean {
  return menu.kakaoCategories.some((f) => categoryName.includes(f));
}
