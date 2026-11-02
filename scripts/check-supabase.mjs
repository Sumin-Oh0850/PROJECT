// Supabase 점검:  npm run check:supabase
//   1) 주소·키로 서버에 연결되는지
//   2) favorites 테이블이 있는지 (supabase/favorites.sql)
//   3) favorites 가 "로그인 사용자별" 구조(user_id 열)로 바뀌었는지 (이전 닉네임 방식이면 업그레이드 안내)
//   4) 회원 삭제 함수 delete_my_account 가 만들어졌는지 (supabase/account.sql)
// 로그인이 필요한 저장·삭제·회원삭제는 앱 화면에서 확인하세요. (이 스크립트는 계정을 만들거나 지우지 않습니다)
// .env.local 의 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를 읽습니다. (키 값은 출력하지 않음)
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function readEnv(file) {
  const out = {}
  if (!existsSync(file)) return out
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

const env = { ...readEnv('.env'), ...readEnv('.env.local'), ...process.env }
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY

let problems = 0
const step = (ok, text) => {
  if (!ok) problems++
  console.log(`${ok ? '✅' : '❌'} ${text}`)
}
const hint = (text) => console.log(`   → ${text}`)

if (!url || !key || url.includes('xxxx')) {
  step(false, '.env.local 에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 없어요')
  hint('Supabase 대시보드 > Project Settings > API 에서 Project URL 과 anon(publishable) key 를 복사해 넣으세요.')
  process.exit(1)
}

let host
try {
  host = new URL(url).host
} catch {
  step(false, 'VITE_SUPABASE_URL 형식이 올바르지 않아요 (https://xxxx.supabase.co)')
  process.exit(1)
}
console.log(`대상: ${host.replace(/^[^.]+/, '<project-ref>')}`)

const supabase = createClient(url, key)
const text = (e) => String(e?.message ?? '')

// 1~2) 서버 도달 + 키 + 테이블 (일반 조회: HEAD 요청은 "테이블 없음"을 오류로 알려 주지 않으므로 쓰지 않음)
const table = await supabase.from('favorites').select('id').limit(1)
if (table.error) {
  const msg = text(table.error)
  if (table.error.code === 'PGRST205' || /Could not find the table/i.test(msg)) {
    step(true, '연결 OK (주소와 키가 올바르고 서버가 응답함)')
    step(false, 'favorites 테이블이 아직 없어요')
    hint('Supabase > SQL Editor 에서 supabase/favorites.sql 전체를 실행한 뒤 다시 확인하세요.')
  } else if (table.error.status === 401 || /invalid api key|JWT/i.test(msg)) {
    step(false, '키가 올바르지 않아요 (401)')
    hint('VITE_SUPABASE_ANON_KEY 가 이 프로젝트의 anon(publishable) key 인지 확인하세요.')
  } else if (/fetch failed|ENOTFOUND|network/i.test(msg) || table.error.status === 0) {
    step(false, '서버에 연결할 수 없어요')
    hint('VITE_SUPABASE_URL 주소와 인터넷 연결을 확인하세요. (프로젝트가 일시 정지됐을 수도 있어요)')
  } else {
    step(false, `조회 실패: ${msg} (code ${table.error.code ?? '-'}, status ${table.error.status ?? '-'})`)
  }
  process.exit(1)
}
step(true, '연결 OK · favorites 테이블 있음')

// 3) 로그인 사용자별 구조(user_id 열)인지
const column = await supabase.from('favorites').select('user_id').limit(1)
if (column.error && (column.error.code === '42703' || /user_id/i.test(text(column.error)) && /does not exist|column/i.test(text(column.error)))) {
  step(false, 'favorites 가 아직 이전(닉네임) 구조예요 — user_id 열이 없어요')
  hint('supabase/favorites.sql 전체를 SQL Editor 에서 실행하면 로그인 사용자별 구조로 바뀝니다. (닉네임으로 저장했던 행은 지워져요)')
} else if (column.error) {
  step(false, `user_id 확인 실패: ${text(column.error)}`)
} else {
  step(true, 'favorites 는 로그인 사용자별 구조(user_id)예요')
}

// 4) 회원 삭제 함수: 로그인하지 않은 상태로 부르면 "권한 없음"이 나와야 정상(함수가 있다는 뜻).
//    함수가 없으면 PGRST202(Could not find the function) 가 나옵니다. — 호출해도 아무것도 지워지지 않습니다.
const fn = await supabase.rpc('delete_my_account')
if (fn.error?.code === 'PGRST202' || /Could not find the function/i.test(text(fn.error))) {
  step(false, '회원 삭제 함수(delete_my_account)가 아직 없어요')
  hint('supabase/account.sql 전체를 SQL Editor 에서 실행하세요.')
} else if (fn.error) {
  step(true, '회원 삭제 함수가 있고, 로그인하지 않으면 호출이 막혀요 (정상)')
} else {
  step(false, '로그인하지 않았는데 회원 삭제 함수가 실행됐어요 — 권한 설정을 확인하세요 (supabase/account.sql 의 revoke/grant)')
}

console.log(problems ? `\n⚠️ 확인할 것 ${problems}개` : '\n✅ 모두 준비됐어요')
process.exit(problems ? 1 : 0)
