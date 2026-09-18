# BYPP

지금 있는 곳 근처에서, 지금 먹을 만한 **메뉴**를 골라주고 그걸 파는 가게를 찾아주는 웹 서비스.

시각(지금/오늘/내일 + 시간), 도보 시간, 메뉴 특성(매운맛·고기·국물·양)을 고르면 추천이 나오고,
**좋아요 / 별로예요 / 다른 거** 피드백으로 쓸수록 취향에 맞춰진다.

## 시작하기

```bash
npm install
cp .env.example .env.local   # 아래 키를 채운다
npm run dev
```

http://localhost:3000

### 필요한 키

[Kakao Developers](https://developers.kakao.com)에서 앱을 만들고 발급받는다.

| 키 | 용도 | 주의 |
|---|---|---|
| `KAKAO_REST_API_KEY` | 장소 검색 (서버 전용) | Referer 제한이 없어 노출되면 쿼터를 도난당한다. 절대 `NEXT_PUBLIC_`을 붙이지 말 것 |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 지도 표시 (브라우저 노출) | 이 키의 **JavaScript SDK 도메인**에 `http://localhost:3000` 등록 필요 (뒤에 슬래시 없이) |

### 콘솔에서 카카오맵 켜기

키를 넣었는데 `403 disabled OPEN_MAP_AND_LOCAL service`가 뜨면 키 문제가 아니다.
콘솔 → 내 애플리케이션 → 앱 선택 → **카카오맵 → 사용 설정 → 상태 ON**.

## 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run lint         # ESLint
npm run verify:seed  # 시드 메뉴가 카카오에서 실제로 검색되는지 검사
```

## 설계

메뉴판 데이터도 영업시간 데이터도 공개 API로는 구할 수 없다. 그 제약 위에서 어떻게
"근처에 파는 데가 없는 메뉴"를 추천하지 않는지, 왜 추천 단위가 "고기국밥"이 아니라
"국밥"인지는 [CLAUDE.md](./CLAUDE.md)에 정리돼 있다.
