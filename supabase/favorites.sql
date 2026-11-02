-- =====================================================
-- 즐겨찾기 테이블 (STEP 5)
-- Supabase 대시보드 > SQL Editor > New query 에 전체를 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전합니다.
-- =====================================================

create table if not exists public.favorites (
  id         bigint generated always as identity primary key,
  nickname   text not null check (char_length(nickname) between 1 and 30),
  source     text not null check (char_length(source) between 1 and 30),  -- 예: tour, heritage
  item_id    text not null check (char_length(item_id) between 1 and 100),
  title      text not null default '',
  created_at timestamptz not null default now(),
  unique (nickname, source, item_id)                                      -- 같은 항목을 두 번 저장하지 않음
);

create index if not exists favorites_nickname_idx on public.favorites (nickname, created_at desc);

-- 행 수준 보안(RLS): 켜 두고, 아래 정책으로 허용한 동작만 가능
alter table public.favorites enable row level security;

drop policy if exists "favorites_select" on public.favorites;
drop policy if exists "favorites_insert" on public.favorites;
drop policy if exists "favorites_delete" on public.favorites;

-- ※ 로그인 없이 닉네임으로 구분하는 학습용 설정입니다.
--   누구나 읽고, 저장하고, 지울 수 있으니 개인정보는 넣지 마세요.
--   실제 서비스에서는 Supabase Auth 로 로그인한 사용자(auth.uid())만 자기 행을 다루도록 바꾸세요.
create policy "favorites_select" on public.favorites for select using (true);
create policy "favorites_insert" on public.favorites for insert with check (true);
create policy "favorites_delete" on public.favorites for delete using (true);
