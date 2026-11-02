-- =====================================================
-- 회원 삭제 (SQL Editor 에서 한 번 실행. 여러 번 실행해도 안전)
--
-- 브라우저용 키(anon)로는 auth.users 를 지울 수 없으므로, 로그인한 본인만 자기 계정을 지우는
-- 서버 함수를 만듭니다. 계정이 지워지면 favorites 도 함께 지워집니다 (on delete cascade).
-- =====================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

-- 로그인하지 않은 사람(anon)은 호출할 수 없고, 로그인한 사용자만 호출할 수 있음
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

notify pgrst, 'reload schema';
