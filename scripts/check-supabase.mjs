// Supabase 연결 점검:  npm run check:supabase           (읽기만)
//                      npm run check:supabase -- --write  (저장·삭제까지 시험)
// .env.local 의 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를 읽습니다. (키 값은 출력하지 않음)
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const write = process.argv.includes('--write')

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

const step = (ok, text) => console.log(`${ok ? '✅' : '❌'} ${text}`)
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

// 1) 서버 도달 + 키 확인: 테이블 조회 요청이 응답하면 연결과 키는 정상
//    ※ head: true(HEAD 요청)는 본문이 없어서 "테이블 없음(404)"도 오류로 잡히지 않으므로 일반 조회를 씁니다.
const { data: rows, count, error } = await supabase.from('favorites').select('id', { count: 'exact' }).limit(1)

if (error) {
  const msg = error.message ?? ''
  if (error.code === 'PGRST205' || /Could not find the table/i.test(msg)) {
    step(true, '연결 OK (주소와 키가 올바르고 서버가 응답함)')
    step(false, 'favorites 테이블이 아직 없어요')
    hint('Supabase > SQL Editor 에서 supabase/favorites.sql 전체를 실행한 뒤 다시 확인하세요.')
  } else if (error.status === 401 || /invalid api key|JWT/i.test(msg)) {
    step(false, '키가 올바르지 않아요 (401)')
    hint('VITE_SUPABASE_ANON_KEY 가 이 프로젝트의 anon(publishable) key 인지 확인하세요.')
  } else if (/fetch failed|ENOTFOUND|network/i.test(msg) || error.status === 0) {
    step(false, '서버에 연결할 수 없어요')
    hint('VITE_SUPABASE_URL 주소와 인터넷 연결을 확인하세요. (프로젝트가 일시 정지됐을 수도 있어요)')
  } else {
    step(false, `조회 실패: ${msg} (code ${error.code ?? '-'}, status ${error.status ?? '-'})`)
  }
  process.exit(1)
}

if (!Array.isArray(rows)) {
  step(false, '응답이 비정상이에요 (테이블 조회 결과가 없음)')
  process.exit(1)
}
step(true, `연결 OK · favorites 테이블 있음 (현재 ${count ?? rows.length}행)`)

// 2) 저장/삭제 시험 (--write): 임시 행을 넣었다가 바로 지움
if (write) {
  const row = { nickname: '__check__', source: 'check', item_id: String(Date.now()), title: '연결 점검용 임시 행' }
  const ins = await supabase.from('favorites').insert(row).select().single()
  if (ins.error) {
    step(false, `저장 실패: ${ins.error.message}`)
    hint('RLS 정책(favorites_insert)이 만들어졌는지 supabase/favorites.sql 을 다시 실행해 보세요.')
    process.exit(1)
  }
  step(true, '저장(insert) OK')

  const sel = await supabase.from('favorites').select('*').eq('id', ins.data.id).single()
  step(!sel.error && sel.data?.title === row.title, sel.error ? `읽기 실패: ${sel.error.message}` : '읽기(select) OK')

  const del = await supabase.from('favorites').delete().eq('id', ins.data.id)
  step(!del.error, del.error ? `삭제 실패: ${del.error.message}` : '삭제(delete) OK — 임시 행을 지웠어요')
  if (del.error) process.exit(1)
}
