-- 방문한 가게(후기를 기다리는 한 끼).
--
-- 가게를 고른 순간과 후기를 쓰는 순간은 다르다. 먹으러 가서 브라우저를 닫으면 "다녀왔어요"를
-- 누를 화면이 사라진다. 그래서 고른 순간 "여기로 정했어요"로 먹로그에 먼저 담아 두고,
-- 나중에 먹로그에서 후기를 쓴다. 후기를 쓰면 이 행은 지워지고 reviews에 카드가 생긴다.
--
-- 방에서 가게까지 정하면 참가자마다 자동으로 담긴다. 함께한 사람은 그때 방에서 읽어 둔다 —
-- 며칠 뒤에 후기를 써도 이름이 남아 있게.
--
-- reviews와 같은 이유로 RLS는 켜되 정책은 두지 않는다. 서버만 secret 키로 다룬다.

create table if not exists visits (
  id             uuid primary key default gen_random_uuid(),
  author_token   text not null,
  user_id        uuid references auth.users(id) on delete set null,

  place_id       text not null,
  place_name     text not null,
  place_category text,
  place_address  text,
  place_url      text,

  menu_id        text,
  companions     text[] not null default '{}',
  room_code      text,

  eaten_at       timestamptz not null,
  eaten_on       date not null,
  created_at     timestamptz not null default now()
);

create index if not exists visits_author_idx on visits (author_token);
create index if not exists visits_user_idx on visits (user_id);

alter table visits enable row level security;
