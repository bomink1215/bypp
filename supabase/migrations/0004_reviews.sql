-- 자체 평가(후기)와 "나의 먹로그".
--
-- 카카오는 별점을 주지 않는다(CLAUDE.md 데이터 제약). 별점을 보여주려면 우리가 직접 모아야 한다.
-- 같은 데이터가 두 곳에 쓰인다.
--   - 가게 목록: 별점 평균과 후기 글 (공개)
--   - 나의 먹로그: 내 기록 카드와 함께한 사람 (본인만)
--
-- 로그인 없이도 쓸 수 있다. 방 참가자와 같은 브라우저 토큰이 작성자다. 로그인하면 user_id가
-- 채워져 다른 기기에서도 내 기록으로 보인다. 그래서 rooms와 같은 이유로 RLS는 켜되 정책을
-- 두지 않고, 서버 라우트가 secret 키로만 다룬다.

create table if not exists reviews (
  id             uuid primary key default gen_random_uuid(),
  -- 작성자. 브라우저 토큰은 늘 있고, 로그인했으면 user_id도 있다.
  author_token   text not null,
  user_id        uuid references auth.users(id) on delete set null,
  -- 공개 후기에 보일 이름. 비우면 "익명".
  nickname       text,

  -- 가게 스냅샷. 카카오 정보가 바뀌거나 폐업해도 내 기록은 남아야 한다.
  place_id       text not null,
  place_name     text not null,
  place_category text,
  place_address  text,
  place_url      text,

  -- 무엇을 먹었나. 카드에 남기는 기록일 뿐 별점 대상은 아니다(별점은 가게에 준다).
  menu_id        text,

  rating         smallint not null check (rating between 1 and 5),
  body           text check (char_length(body) <= 300),

  -- 함께한 사람의 닉네임. **공개 응답에 절대 넣지 않는다.** 방에서 정한 경우 서버가 채운다.
  companions     text[] not null default '{}',
  room_code      text,

  eaten_at       timestamptz not null,
  -- 한국 날짜. 같은 사람이 같은 가게에 하루 한 번만 쓰게 하는 기준이다.
  eaten_on       date not null,
  created_at     timestamptz not null default now()
);

-- 같은 사람이 같은 가게에 하루에 여러 번 별점을 주지 못하게 한다(평균을 부풀리는 걸 막는 최소한).
create unique index if not exists reviews_one_per_day
  on reviews (author_token, place_id, eaten_on);

create index if not exists reviews_place_idx on reviews (place_id, created_at desc);
create index if not exists reviews_author_idx on reviews (author_token);
create index if not exists reviews_user_idx on reviews (user_id);

alter table reviews enable row level security;
