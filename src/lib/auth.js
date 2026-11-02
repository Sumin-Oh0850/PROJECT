// 로그인·회원 기능에서 쓰는 도우미

// 화면에 보여 줄 이름: 가입할 때 적은 닉네임, 없으면 이메일 앞부분
export const displayName = (user) =>
  user?.user_metadata?.nickname || user?.email?.split('@')[0] || '회원'

// Supabase 오류(영어)를 사용자가 알아볼 수 있는 한국어로
export function friendlyAuthError(error) {
  const msg = String(error?.message ?? error ?? '')
  const rules = [
    [/invalid login credentials/i, '이메일 또는 비밀번호가 올바르지 않아요'],
    [/email not confirmed/i, '이메일 인증을 먼저 완료해 주세요 (가입할 때 받은 메일의 링크를 누르세요)'],
    [/already registered|already been registered/i, '이미 가입된 이메일이에요'],
    [/password should be at least|weak password/i, '비밀번호는 6자 이상이어야 해요'],
    [/same password|different from the old/i, '새 비밀번호가 현재 비밀번호와 같아요'],
    [/unable to validate email|invalid format|invalid email/i, '이메일 형식이 올바르지 않아요'],
    [/signups? not allowed|signup.*disabled/i, '지금은 회원가입을 받지 않아요'],
    [/rate limit|too many requests|security purposes/i, '요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요'],
    [/could not find the function|delete_my_account/i, '회원 삭제 기능이 아직 준비되지 않았어요 (supabase/account.sql 을 실행하세요)'],
    [/failed to fetch|networkerror|network request failed/i, '서버에 연결하지 못했어요. 인터넷 연결을 확인하세요'],
  ]
  for (const [pattern, text] of rules) if (pattern.test(msg)) return text
  return msg || '알 수 없는 오류가 발생했어요'
}

export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)
export const MIN_PASSWORD = 6
