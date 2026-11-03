// 바다 지수 시험:  npm run test:sea
// ① 가짜 행으로 "오늘·지금 시간대" 선택 규칙을 확인(인터넷 불필요)  ② 실제 해양조사원 응답 확인(인터넷·키 필요)
import { existsSync, readFileSync } from 'node:fs'
for (const file of ['.env', '.env.local']) {
  if (!existsSync(file)) continue
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const { getSeaIndex, selectCurrent } = await import('../server/sea-index.js')
let failed = 0
const ok = (c, t) => { if (!c) failed++; console.log(`${c ? '✅' : '❌'} ${t}`) }

console.log('── ① 선택 규칙 ──')
const row = (area, ymd, noon, idx) => ({ sareaDtlNm: area, predcYmd: ymd, predcNoonSeCd: noon, totalIndex: idx, tdlvHrCn: '소조기', avgWtem: '21.2', avgWvhgt: '0.4', avgWspd: '4.2', avgCrsp: '0.6', weather: '맑음' })
const rows = [row('제주북동', '2026-11-03', '오전', '매우좋음'), row('제주북동', '2026-11-03', '오후', '좋음'), row('제주북동', '2026-11-04', '오전', '보통'), row('부안', '2026-11-03', '오전', '좋음')]
const morning = selectCurrent(rows, new Date('2026-11-03T01:00:00Z')) // 한국 10시
const evening = selectCurrent(rows, new Date('2026-11-03T08:00:00Z')) // 한국 17시
ok(morning.items.length === 1 && morning.items[0].area === '제주북동', '제주 해역만 (부안은 제외)')
ok(morning.items[0].index === '매우좋음' && morning.period === '오전', '오전에는 오늘 오전 값')
ok(evening.items[0].index === '좋음' && evening.period === '오후', '오후에는 오늘 오후 값')
ok(selectCurrent(rows, new Date('2026-11-09T01:00:00Z')).items[0].date === '2026-11-03', '오늘 값이 없으면 가장 가까운 날 값')
ok(typeof morning.items[0].sea_temp_c === 'number' && morning.items[0].wave_m === 0.4, '숫자 변환')

console.log('── ② 실제 응답 ──')
const r = await getSeaIndex()
if (r.source !== 'khoa') console.log(`⚠️ 건너뜀 (${r.source}: ${r.note})`)
else {
  ok(r.items.length >= 3, `제주 해역 ${r.items.length}곳: ${r.items.map((i) => `${i.area} ${i.index}`).join(' · ')}`)
  ok(r.items.every((i) => ['매우좋음', '좋음', '보통', '나쁨', '매우나쁨'].includes(i.index)), '종합지수는 5단계 중 하나')
}
console.log(failed ? `\n❌ ${failed}개 실패` : '\n✅ 모두 통과')
process.exit(failed ? 1 : 0)
