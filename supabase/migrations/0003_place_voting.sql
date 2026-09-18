-- 메뉴가 정해진 뒤 가게도 투표로 정한다.
--
-- 흐름: decided(메뉴 확정) → "가게도 정할까요?" → place_voting → place_decided
-- 가게를 안 정하고 끝내도 된다. 그러면 방은 decided에 머문다.
--
-- 기존 테이블에 컬럼을 더하고 새 테이블을 만들 뿐이라, 이 파일을 먼저 실행해도
-- 지금 배포된 코드는 그대로 동작한다. **코드를 배포하기 전에 먼저 실행할 것.**

alter table rooms add column if not exists place_candidates jsonb;
alter table rooms add column if not exists decided_place_id text;

create table if not exists place_votes (
  room_code  text not null references rooms(code) on delete cascade,
  token      text not null,
  place_id   text not null,
  voted_at   timestamptz not null default now(),
  -- 메뉴 투표와 같다. 1인 1표, 다시 누르면 갱신된다.
  primary key (room_code, token)
);

create index if not exists place_votes_room_idx on place_votes (room_code);

-- 0001과 같은 이유로 RLS는 켜되 정책은 두지 않는다. 서버만 secret 키로 접근한다.
alter table place_votes enable row level security;
