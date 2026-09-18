# BYPP

현재 위치를 기반으로 오늘 먹을 **메뉴**를 추천하고, 그 메뉴를 파는 주변 음식점을 찾아주는 웹 서비스.

## 시작하기

```bash
npm install
cp .env.example .env.local   # 카카오 키 입력
npm run dev
```

http://localhost:3000 에서 확인. 위치 권한은 `localhost`와 HTTPS에서만 동작한다.

### 필요한 키

[카카오 developers](https://developers.kakao.com)에서 앱을 등록하고 두 개의 키를 `.env.local`에 넣는다.

| 변수 | 용도 |
|---|---|
| `KAKAO_REST_API_KEY` | 로컬 API 장소 검색 (서버 전용) |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 지도 SDK (브라우저) |

## 기술 스택

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · 카카오 로컬/맵 API · Vercel

설계 배경과 개발 규칙은 [CLAUDE.md](./CLAUDE.md) 참고.
