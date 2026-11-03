// 날씨 호출 안정성 시험:  npm run test:weather
// 가짜 fetch 로 ① 장소 14곳을 2번의 요청으로 묶는지 ② 실패하면 한 번 더 시도하는지 ③ 샘플 값은 오래 저장하지 않는지 확인 (인터넷 불필요)
import { clearCache } from '../server/cache.js'
import { getWindGusts, judgeAll, listSites } from '../server/leisure.js'

let failed = 0
const ok = (cond, text) => { if (!cond) failed++; console.log(`${cond ? '✅' : '❌'} ${text}`) }

const realFetch = globalThis.fetch
const realNow = Date.now
let calls = []
let mode = 'ok' // ok | failOnce | failAll
let failedAlready = false

// Open-Meteo 흉내: 좌표 개수만큼 결과를 (여러 개면 배열로) 돌려준다
globalThis.fetch = async (url) => {
  const u = new URL(String(url))
  calls.push(u.host)
  if (mode === 'failAll' || (mode === 'failOnce' && !failedAlready)) {
    failedAlready = true
    return { ok: false, status: 429, json: async () => ({}) }
  }
  const n = u.searchParams.get('latitude').split(',').length
  const one = u.host.startsWith('marine')
    ? { current: { wave_height: 0.8, wave_period: 6, wave_direction: 300, sea_surface_temperature: 21 } }
    : { current: { time: '2026-11-03T13:00', temperature_2m: 17, precipitation: 0, weather_code: 0, wind_speed_10m: 5, wind_gusts_10m: 8, wind_direction_10m: 300 } }
  return { ok: true, status: 200, json: async () => (n === 1 ? one : Array.from({ length: n }, () => one)) }
}

try {
  console.log('── ① 한 번에 묶어서 요청 ──')
  clearCache(); calls = []
  const all = await judgeAll({})
  ok(all.length === listSites().length, `장소 ${all.length}곳 모두 판정`)
  ok(calls.length === 2 && new Set(calls).size === 2, `날씨 서버 요청 ${calls.length}번 (장소마다 따로 부르면 ${listSites().length * 2 - 1}번)`)
  ok(all.every((j) => j.conditions.source === 'open-meteo'), '모두 실제 값(open-meteo)')
  ok(all.find((j) => j.id === 'geumoreum').conditions.wave_m == null, '패러글라이딩은 파도 값 없음')

  console.log('── ② 실패하면 한 번 더 시도 ──')
  clearCache(); calls = []; mode = 'failOnce'; failedAlready = false
  const w = await getWindGusts({ site: 'iho' })
  ok(w.source === 'open-meteo' && calls.length >= 3, `첫 요청이 거절돼도 다시 시도해 실제 값을 받음 (요청 ${calls.length}번)`)

  console.log('── ③ 샘플 값은 오래 저장하지 않음 ──')
  clearCache(); calls = []; mode = 'failAll'
  const s = await getWindGusts({ site: 'woljeong' })
  ok(s.source === 'sample', '계속 실패하면 샘플 값으로 대신')
  mode = 'ok'
  const stillSample = await getWindGusts({ site: 'woljeong' })
  ok(stillSample.source === 'sample', '바로 다시 부르면 저장된 샘플 값(30초 안)')
  Date.now = () => realNow() + 31_000 // 31초 뒤
  const recovered = await getWindGusts({ site: 'woljeong' })
  ok(recovered.source === 'open-meteo', '30초가 지나면 다시 시도해 실제 값으로 바뀜 (예전에는 10분 동안 샘플 유지)')
  Date.now = realNow
  const keep = await getWindGusts({ site: 'woljeong' })
  ok(keep.source === 'open-meteo', '성공한 값은 계속 저장')
} finally {
  globalThis.fetch = realFetch
  Date.now = realNow
}
console.log(failed ? `\n❌ ${failed}개 실패` : '\n✅ 모두 통과')
process.exit(failed ? 1 : 0)
