// 관광지 선정(고루 분포) 시험:  npm run test:spots
// ① 가짜 후보로 선정 규칙을 확인(인터넷 불필요)  ② 실제 TourAPI 결과의 분포를 숫자로 확인(인터넷·키 필요)
import { existsSync, readFileSync } from 'node:fs'

for (const file of ['.env', '.env.local']) {
  if (!existsSync(file)) continue
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const { cleanCoord, listSpots, selectSpread } = await import('../server/spots.js')

let failed = 0
const ok = (cond, text) => {
  if (!cond) failed++
  console.log(`${cond ? '✅' : '❌'} ${text}`)
}

console.log('── ① 선정 규칙 (가짜 후보) ──')
// 한쪽(오름)에 몰린 후보: 오름 40곳은 좁은 지역에, 해변 10곳은 넓게
const fake = []
for (let i = 0; i < 40; i++) fake.push({ id: `o${String(i).padStart(2, '0')}`, name: `오름${i}`, group: 'oreum', cat3: 'A01010400', lat: 33.35 + (i % 8) * 0.002, lng: 126.5 + Math.floor(i / 8) * 0.002 })
for (let i = 0; i < 10; i++) fake.push({ id: `c${String(i).padStart(2, '0')}`, name: `해변${i}`, group: 'coast', cat3: i < 3 ? 'A01011200' : 'A01011400', lat: 33.2 + i * 0.03, lng: 126.2 + i * 0.07 })
const picked = selectSpread(fake, 30)
const count = (g) => picked.filter((p) => p.group === g).length
ok(picked.length === 30, `정확히 30곳 선정 (실제 ${picked.length})`)
ok(count('oreum') === 20 && count('coast') === 10, `큰 묶음부터 줄임: 오름 ${count('oreum')} · 해변 ${count('coast')}`)
ok(picked.filter((p) => p.cat3 === 'A01011200').length === 3, '해수욕장 3곳은 항상 포함')
ok(JSON.stringify(selectSpread(fake, 30).map((p) => p.id)) === JSON.stringify(picked.map((p) => p.id)), '같은 입력이면 항상 같은 결과(무작위 없음)')
// 몰린 오름 40곳 중 20곳을 고르면, 앞에서 20개를 자른 것보다 훨씬 넓게 퍼져야 한다
const spread = (items) => {
  const lats = items.map((i) => i.lat), lngs = items.map((i) => i.lng)
  return (Math.max(...lats) - Math.min(...lats)) + (Math.max(...lngs) - Math.min(...lngs))
}
const oreumPicked = picked.filter((p) => p.group === 'oreum')
const oreumNaive = fake.filter((p) => p.group === 'oreum').slice(0, 20)
ok(spread(oreumPicked) > spread(oreumNaive), `오름이 더 넓게 퍼짐: 선정 ${spread(oreumPicked).toFixed(3)} > 앞 20개 ${spread(oreumNaive).toFixed(3)}`)
ok(selectSpread(fake.slice(0, 5), 30).length === 5, '후보가 n 보다 적으면 있는 만큼만')

console.log('── 좌표 정리 (공공데이터 입력 실수) ──')
ok(JSON.stringify(cleanCoord(33.4, 126.8)) === JSON.stringify({ lat: 33.4, lng: 126.8, fixed: false }), '정상 좌표는 그대로')
const fixedCoord = cleanCoord(33.4042093891, 12.79737228191) // 실제 영주산 데이터
ok(fixedCoord?.fixed === true && Math.abs(fixedCoord.lng - 126.79737228191) < 1e-6, `경도 12.797… → ${fixedCoord?.lng} 로 보정`)
ok(cleanCoord(33.4, 0) === null, '좌표 0 은 제외')
ok(cleanCoord(37.5, 127.0) === null, '제주 밖(서울)은 제외')
ok(cleanCoord(36.0, 12.5) === null, '경도를 보정해도 위도가 제주 밖이면 제외')

console.log('── ② 실제 TourAPI 결과 ──')
const all = await listSpots() // n 없이 = 한국관광공사 목록 전체
const r = await listSpots({ n: 100 })
if (all.source === 'tourapi') {
  const allBase = all.items.filter((i) => !i.extra && !i.facility && !i.visit)
  ok(allBase.length === all.candidates, `한국관광공사 목록 전체 ${all.candidates}곳을 모두 포함 (실제 ${allBase.length}곳)`)
  ok(new Set(allBase.map((i) => i.id)).size === allBase.length, '전체 선정에도 중복 없음')
}
if (r.source !== 'tourapi') {
  console.log(`⚠️ TourAPI 를 쓸 수 없어 건너뜀 (${r.source}: ${r.note})`)
} else {
  console.log(`   후보 ${r.candidates}곳 → 선정 ${r.count}곳`)
  const base = r.items.filter((i) => !i.extra && !i.facility && !i.visit)
  const extra = r.items.filter((i) => i.extra)
  const facilities = r.items.filter((i) => i.facility)
  const visit = r.items.filter((i) => i.visit && !i.facility)
  if (process.env.VISITJEJU_API_KEY) {
    ok(facilities.length >= 80, `레저 업체·시설 ${facilities.length}곳 (비짓제주)`)
    ok(facilities.every((i) => i.group === 'leisure' && i.near && !/(해수욕장|해변)$/.test(i.name)), '레저 시설: 그룹·가까운 장소·해변 제외')
    const imgOf = (list) => list.filter((i) => i.image).length
    ok(imgOf(facilities) >= facilities.length * 0.9, `레저 시설 사진 ${imgOf(facilities)}/${facilities.length}곳`)
    ok(visit.length >= 500, `비짓제주 관광지 ${visit.length}곳 추가`)
    ok(imgOf(visit) >= visit.length * 0.9 && visit.every((i) => !i.image || i.image.startsWith('https://')), `추가 관광지 사진 ${imgOf(visit)}/${visit.length}곳 (https)`)
    ok(new Set(facilities.map((i) => i.id)).size === facilities.length, '레저 시설 중복 없음')
  }
  ok(base.length === 100, `TourAPI 선정 정확히 100곳 (실제 ${base.length})`)
  ok(extra.length > 0 && extra.every((i) => i.is_beach), `직접 더한 해수욕장·해변 ${extra.length}곳`)
  if (process.env.VISITJEJU_API_KEY) {
    const withPhoto = extra.filter((i) => i.image).length
    ok(withPhoto >= 10, `직접 더한 해변 사진 ${withPhoto}/${extra.length}곳 (비짓제주)`)
    ok(extra.every((i) => !i.image || i.image.startsWith('https://')), '사진 주소는 https')
  }
  ok(r.items.filter((i) => i.is_beach).length >= 15, `해수욕장·해변 목록 ${r.items.filter((i) => i.is_beach).length}곳 (15 이상)`)
  ok(r.items.every((i) => Number.isFinite(i.lat) && Number.isFinite(i.lng) && i.lat > 33 && i.lat < 34 && i.lng > 126 && i.lng < 127.2), '모든 곳에 제주 안의 좌표가 있음')
  ok(new Set(r.items.map((i) => i.id)).size === r.items.length, '중복 없음')

  console.log('   묶음별 (선정/후보):', r.groups.map((g) => `${g.label} ${g.count}/${g.total}`).join(' · '))
  const gc = (k) => base.filter((i) => i.group === k).length
  const counts = r.groups.filter((g) => g.key !== 'leisure').map((g) => gc(g.key))
  ok(Math.max(...counts) - Math.min(...counts) <= 3, `묶음 크기 차이 ${Math.max(...counts) - Math.min(...counts)} (3 이하) — 오름이 37→${gc("oreum")}로 줄어 쏠림 해소`)
  console.log('   시군구:', r.regions.map((g) => `${g.key} ${g.count}`).join(' · '))
  const beachAll = base.filter((i) => i.cat3 === 'A01011200').length
  ok(beachAll >= 4 && base.filter((i) => i.cat3 === 'A01011200').length === r.items.filter((i) => !i.extra && i.cat3 === 'A01011200').length, `한국관광공사 해수욕장은 모두 포함 (실제 ${beachAll}곳 — 공공데이터가 바뀌면 수가 달라질 수 있어요)`)

  // 위치 분포: 0.1°(약 10km) 격자 중 몇 칸에 곳이 있는지, 한 칸에 몇 곳까지 몰렸는지
  const cells = (items) => new Set(items.map((i) => `${Math.floor(i.lat * 10)}:${Math.floor(i.lng * 10)}`)).size
  const maxPerCell = (items) => {
    const m = {}
    for (const i of items) { const k = `${Math.floor(i.lat * 10)}:${Math.floor(i.lng * 10)}`; m[k] = (m[k] ?? 0) + 1 }
    return Math.max(...Object.values(m))
  }
  console.log(`   10km 격자: 선정 ${cells(r.items)}칸 사용, 한 칸 최대 ${maxPerCell(r.items)}곳`)
  ok(cells(r.items) >= 20, `격자 ${cells(r.items)}칸에 퍼짐 (20칸 이상)`)
}

console.log(failed ? `\n❌ ${failed}개 실패` : '\n✅ 모두 통과')
process.exit(failed ? 1 : 0)
