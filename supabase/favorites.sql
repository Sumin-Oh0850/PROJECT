-- =====================================================
-- 즐겨찾기 테이블: 로그인한 사용자별로 저장 (STEP 5)
-- Supabase 대시보드 > SQL Editor > New query 에 전체를 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전합니다. (처음 만들 때도, 닉네임 방식에서 업그레이드할 때도 같은 파일)
-- =====================================================

create table if not exists public.favorites (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade, -- 로그인한 사용자 (자동으로 채워짐)
  source     text not null check (char_length(source) between 1 and 30),  -- 예: site(레저 장소), beach, tour
  item_id    text not null check (char_length(item_id) between 1 and 100),
  title      text not null default '',
  created_at timestamptz not null default now()
);

-- ── 닉네임 방식(이전 버전)에서 업그레이드 ────────────────────
-- 이전 버전의 favorites 에는 user_id 가 없으므로 먼저 추가합니다.
alter table public.favorites add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
-- 로그인 없이 닉네임으로 저장했던 행은 주인을 알 수 없으므로 지웁니다. (새 테이블이면 아무 일도 없음)
delete from public.favorites where user_id is null;
alter table public.favorites alter column user_id set not null;
alter table public.favorites alter column user_id set default auth.uid();
-- 닉네임 기반 제약·열 정리
alter table public.favorites drop constraint if exists favorites_nickname_source_item_id_key;
alter table public.favorites drop column if exists nickname; -- 이 열을 쓰던 인덱스도 함께 사라집니다

-- 같은 사용자가 같은 항목을 두 번 저장하지 않음
create unique index if not exists favorites_user_item_key on public.favorites (user_id, source, item_id);
create index if not exists favorites_user_idx on public.favorites (user_id, created_at desc);

-- ── 행 수준 보안(RLS): 내 행만 보고, 저장하고, 지울 수 있음 ───────
alter table public.favorites enable row level security;

drop policy if exists "favorites_select" on public.favorites;
drop policy if exists "favorites_insert" on public.favorites;
drop policy if exists "favorites_delete" on public.favorites;

create policy "favorites_select" on public.favorites for select to authenticated using (auth.uid() = user_id);
create policy "favorites_insert" on public.favorites for insert to authenticated with check (auth.uid() = user_id);
create policy "favorites_delete" on public.favorites for delete to authenticated using (auth.uid() = user_id);

-- 새 API 반영 (테이블 모양이 바뀌었으므로)
notify pgrst, 'reload schema';
