-- 같이 고르기(방) 기능 스키마
--
-- 모든 접근은 서버 라우트에서 secret 키로만 이뤄진다. 방 참가자는 로그인하지 않은
-- 익명 토큰이라 RLS로 "본인 것만"을 표현할 수가 없다. 그래서 RLS는 켜두되 정책을
-- 하나도 두지 않는다 — secret 키(service_role)는 RLS를 우회하므로 서버는 정상 동작하고,
-- publishable 키가 새어나가도 이 테이블들은 아무것도 읽히지 않는다.

create table if not exists rooms (
  code            text primary key,
  host_token      text        not null,
  -- 방장이 정한 "만나는 장소". 참가자 위치를 모으지 않으므로 권한 요청이 한 번뿐이다.
  lat             double precision not null,
  lng             double precision not null,
  place_label     text        not null,
  walk_min        int         not null,
  eat_at          timestamptz not null,
  -- collecting: 조건 모으는 중 / voting: 후보 확정 후 투표 / decided: 결정됨
  status          text        not null default 'collecting',
  -- 투표 대상 스냅샷. 투표 중에 후보가 바뀌면 안 되므로 고정해 둔다.
  candidates      jsonb,
  relaxed         jsonb,
  conflicts       jsonb,
  decided_menu_id text,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null
);

create table if not exists participants (
  room_code    text not null references rooms(code) on delete cascade,
  token        text not null,
  nickname     text not null,
  -- null이면 아직 조건을 안 냈다는 뜻이다. 대기 화면에서 이걸로 진행률을 보여준다.
  filters      jsonb,
  restrictions text[] not null default '{}',
  joined_at    timestamptz not null default now(),
  primary key (room_code, token)
);

create table if not exists votes (
  room_code  text not null references rooms(code) on delete cascade,
  token      text not null,
  menu_id    text not null,
  voted_at   timestamptz not null default now(),
  -- 1인 1표. 다시 누르면 갱신된다.
  primary key (room_code, token)
);

create index if not exists participants_room_idx on participants (room_code);
create index if not exists votes_room_idx on votes (room_code);
create index if not exists rooms_expires_idx on rooms (expires_at);

alter table rooms        enable row level security;
alter table participants enable row level security;
alter table votes        enable row level security;

-- 만료된 방 정리. 필요하면 pg_cron으로 주기 실행하거나 수동으로 부른다.
create or replace function purge_expired_rooms() returns void
language sql
as $$
  delete from rooms where expires_at < now();
$$;
