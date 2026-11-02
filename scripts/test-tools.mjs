// 에이전트 도구 연결 시험:  npm run test:tools
// Claude 키 없이, 에이전트가 부를 도구를 직접 실행해 이름·입력·결과 모양이 맞는지 확인합니다.
// (바람·주변 정보는 실제 외부 API 를 부르므로 인터넷이 필요합니다)
import { readFileSync, existsSync } from 'node:fs'

// 서버 함수와 같이 .env, .env.local 의 값을 process.env 로 읽기 (이미 있는 값은 유지)
for (const file of ['.env', '.env.local']) {
  if (!existsSync(file)) continue
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const { countResult, runTool, tools } = await import('../server/agent-tools.js')

let failed = 0
const ok = (cond, text) => {
  if (!cond) failed++
  console.log(`${cond ? '✅' : '❌'} ${text}`)
}

console.log('── 도구 정의 ──')
ok(tools.length === Object.keys(runTool).length, `도구 ${tools.length}개, 실행 함수 ${Object.keys(runTool).length}개`)
for (const t of tools) {
  ok(typeof runTool[t.name] === 'function' && t.description && t.input_schema?.type === 'object', `${t.name}: 정의와 실행 함수가 짝이 맞음`)
}
const siteEnum = tools.find((t) => t.name === 'judge_activity').input_schema.properties.site.enum
ok(siteEnum.length === 8, `장소 ID enum ${siteEnum.length}개 (모델이 없는 장소를 지어내지 못함)`)

console.log('── 실제 실행 ──')
const run = async (name, input) => {
  const t = Date.now()
  try {
    const r = await runTool[name](input)
    console.log(`   ${name}(${JSON.stringify(input)}) → ${countResult(r)}건 (${Date.now() - t}ms)`)
    return r
  } catch (e) {
    console.log(`   ${name} 오류: ${e.message}`)
    return { error: e.message }
  }
}

const sites = await run('list_sites', {})
ok(Array.isArray(sites) && sites.length === 8, 'list_sites: 8곳')

const wind = await run('get_wind_gusts', { site: 'jungmun' })
ok(typeof wind.wind_ms === 'number' && typeof wind.gust_ms === 'number', `get_wind_gusts: 풍속 ${wind.wind_ms} 돌풍 ${wind.gust_ms} (source ${wind.source})`)

const judged = await run('judge_activity', { site: 'jungmun' })
ok(['가능', '주의', '위험'].includes(judged.status) && judged.reasons?.length > 0, `judge_activity: ${judged.status} — ${judged.reasons?.join(', ')}`)

const nearby = await run('find_nearby', { site: 'woljeong', kind: 'cafe' })
ok(['visitjeju', 'tourapi', 'unavailable'].includes(nearby.source), `find_nearby(cafe): source=${nearby.source}, ${nearby.items?.length}건`)

const shower = await run('find_nearby', { site: 'jungmun', kind: 'shower' })
ok(['osm', 'unavailable'].includes(shower.source) && typeof shower.note === 'string', `find_nearby(shower): source=${shower.source} (실패해도 안내 문구 포함)`)

const beaches = await run('list_beaches', {})
ok(['tourapi', 'unavailable'].includes(beaches.source), `list_beaches: source=${beaches.source}, ${beaches.items?.length}건`)

const weather = await run('get_weather', { place: '서귀포시' })
ok(Array.isArray(weather) && weather.length > 0, 'get_weather: 기상청 단기예보')

const tour = await run('search_tour_places', { keyword: '오름', contentTypeId: '12' })
ok(Array.isArray(tour) && tour.length > 0, 'search_tour_places: 오름 검색')

console.log('── 잘못된 입력은 오류로 돌아옴(에이전트가 읽고 고칠 수 있게) ──')
const bad = await run('judge_activity', { site: 'nowhere' }).catch((e) => ({ error: e.message }))
ok(bad.error?.includes('알 수 없는 장소'), `없는 장소: ${bad.error}`)

console.log(failed ? `\n❌ ${failed}개 실패` : '\n✅ 모두 통과')
process.exit(failed ? 1 : 0)
