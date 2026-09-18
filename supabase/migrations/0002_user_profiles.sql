-- 로그인한 사용자의 취향 저장소
--
-- 방 테이블과 달리 여기는 RLS 정책을 제대로 건다. 방 참가자는 익명 토큰이라 "본인 것만"을
-- 표현할 수 없었지만, 로그인한 사용자는 auth.uid()가 있어서 표현할 수 있다.
-- 그래서 이 테이블만은 브라우저가 publishable 키로 직접 읽고 쓴다 — 서버를 거칠 이유가 없다.

create table if not exists user_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  -- 못 먹는 것. localStorage의 같은 값과 로그인 시 합집합으로 병합된다.
  restrictions text[] not null default '{}',
  -- 메뉴별 좋아요/싫어요 누적. localStorage의 것과 카운트를 더해 병합한다.
  preferences  jsonb  not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

alter table user_profiles enable row level security;

-- 본인 행만. auth.uid()는 요청에 실린 JWT에서 나오므로 위조할 수 없다.
drop policy if exists "read own profile" on user_profiles;
create policy "read own profile" on user_profiles
  for select using ((select auth.uid()) = user_id);

drop policy if exists "insert own profile" on user_profiles;
create policy "insert own profile" on user_profiles
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "update own profile" on user_profiles;
create policy "update own profile" on user_profiles
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
