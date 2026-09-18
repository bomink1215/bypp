/**
 * 위치 권한을 거부했을 때 고를 수 있는 지역 목록.
 *
 * CLAUDE.md가 지적한 대로 권한 거부는 흔하다. 폴백이 없으면 그 사용자는
 * 아무것도 못 한다. 좌표는 각 지역의 대표 지점이다.
 */
export type Region = { id: string; name: string; lat: number; lng: number };

export const REGIONS: Region[] = [
  { id: 'gangnam', name: '서울 강남역', lat: 37.4979, lng: 127.0276 },
  { id: 'hongdae', name: '서울 홍대입구', lat: 37.5572, lng: 126.9245 },
  { id: 'jongno', name: '서울 종로3가', lat: 37.5704, lng: 126.9921 },
  { id: 'yeouido', name: '서울 여의도', lat: 37.5216, lng: 126.9243 },
  { id: 'jamsil', name: '서울 잠실', lat: 37.5133, lng: 127.1 },
  { id: 'pangyo', name: '성남 판교', lat: 37.3947, lng: 127.1112 },
  { id: 'bucheon', name: '부천 상동', lat: 37.5035, lng: 126.7636 },
  { id: 'incheon', name: '인천 부평', lat: 37.4894, lng: 126.7247 },
  { id: 'suwon', name: '수원역', lat: 37.2659, lng: 127.0001 },
  { id: 'daejeon', name: '대전 둔산동', lat: 36.3515, lng: 127.3778 },
  { id: 'daegu', name: '대구 동성로', lat: 35.8693, lng: 128.5952 },
  { id: 'gwangju', name: '광주 상무지구', lat: 35.1522, lng: 126.8479 },
  { id: 'busan', name: '부산 서면', lat: 35.1578, lng: 129.0594 },
  { id: 'jeju', name: '제주시청', lat: 33.4996, lng: 126.5312 },
];
