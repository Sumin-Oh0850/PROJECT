// 판정 기준(judge_activity) 시험:  npm run test:judge
// 조건값을 직접 넣어 보므로 외부 API 없이 항상 같은 결과가 나옵니다.
import { isOffshore, judgeActivity, judgeConditions, getForecast, listSites } from '../server/leisure.js'

let failed = 0
function expect(name, actual, wanted) {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted)
  if (!ok) failed++
  console.log(`${ok ? '✅' : '❌'} ${name}${ok ? '' : `  → 기대 ${JSON.stringify(wanted)}, 실제 ${JSON.stringify(actual)}`}`)
}

const status = async (site, conditions) => (await judgeActivity({ site, conditions })).status
const reasons = async (site, conditions) => (await judgeActivity({ site, conditions })).reasons

console.log('── list_sites ──')
expect('전체 8곳', listSites().length, 8)
expect('서핑 5곳', listSites({ activity: 'surfing' }).length, 5)
expect('윈드서핑 2곳', listSites({ activity: 'windsurfing' }).length, 2)
expect('패러글라이딩 1곳', listSites({ activity: 'paragliding' }).map((s) => s.id), ['geumoreum'])
try {
  listSites({ activity: 'skiing' })
  expect('잘못된 activity 는 오류', 'no error', 'error')
} catch (e) {
  expect('잘못된 activity 는 오류(400)', e.status, 400)
}

console.log('── 서핑 (jungmun) ──')
expect('양호 → 가능', await status('jungmun', { wind_ms: 4, gust_ms: 6, wave_m: 1.2 }), '가능')
expect('풍속 11 → 위험', await status('jungmun', { wind_ms: 11, gust_ms: 12, wave_m: 1 }), '위험')
expect('돌풍 14 → 위험', await status('jungmun', { wind_ms: 5, gust_ms: 14, wave_m: 1 }), '위험')
expect('파도 3.0 → 위험', await status('jungmun', { wind_ms: 4, gust_ms: 6, wave_m: 3.0 }), '위험')
expect('풍속 7 → 주의', await status('jungmun', { wind_ms: 7, gust_ms: 9, wave_m: 1 }), '주의')
expect('파도 2.0 → 주의', await status('jungmun', { wind_ms: 4, gust_ms: 6, wave_m: 2.0 }), '주의')
expect('파도 0.2(너무 잔잔) → 주의', await status('jungmun', { wind_ms: 3, gust_ms: 4, wave_m: 0.2 }), '주의')
expect('경계값: 풍속 10.9 → 주의(위험 아님)', await status('jungmun', { wind_ms: 10.9, gust_ms: 13, wave_m: 1 }), '주의')
expect('위험이 주의보다 우선', await reasons('jungmun', { wind_ms: 12, gust_ms: 15, wave_m: 1 }), ['풍속 11m/s 이상', '돌풍 14m/s 이상'])

console.log('── 윈드서핑 (sinyang) ──')
expect('풍속 6 → 가능', await status('sinyang', { wind_ms: 6, gust_ms: 8 }), '가능')
expect('풍속 14 → 위험', await status('sinyang', { wind_ms: 14, gust_ms: 16 }), '위험')
expect('돌풍 17 → 위험', await status('sinyang', { wind_ms: 9, gust_ms: 17 }), '위험')
expect('풍속 10 → 주의', await status('sinyang', { wind_ms: 10, gust_ms: 12 }), '주의')
expect('돌풍 편차 5(자동 계산) → 주의', await status('sinyang', { wind_ms: 6, gust_ms: 11 }), '주의')
expect('풍속 2(바람 부족) → 주의', await status('sinyang', { wind_ms: 2, gust_ms: 3 }), '주의')

console.log('── 패러글라이딩 (geumoreum) ──')
expect('풍속 3.5 → 가능', await status('geumoreum', { wind_ms: 3.5, gust_ms: 5 }), '가능')
expect('풍속 8 → 위험', await status('geumoreum', { wind_ms: 8, gust_ms: 9 }), '위험')
expect('돌풍 10 → 위험', await status('geumoreum', { wind_ms: 6, gust_ms: 10 }), '위험')
expect('돌풍 편차 5 → 위험', await status('geumoreum', { wind_ms: 3, gust_ms: 8 }), '위험')
expect('강수 1mm → 위험', await status('geumoreum', { wind_ms: 3, gust_ms: 4, precip_mm: 1 }), '위험')
expect('풍속 5.5 → 주의', await status('geumoreum', { wind_ms: 5.5, gust_ms: 7 }), '주의')
expect('돌풍 편차 3.6 → 주의', await status('geumoreum', { wind_ms: 3, gust_ms: 6.6 }), '주의')

console.log('── 데이터 이상 보정 ──')
// 예보가 돌풍을 평균 풍속보다 낮게 줄 때: 돌풍 편차는 0 아래로 내려가지 않음
const odd = await judgeActivity({ site: 'sinyang', conditions: { wind_ms: 8, gust_ms: 6.5 } })
expect('돌풍 < 풍속 이면 편차 0', odd.conditions.gust_spread_ms, 0)
expect('위장 판정도 정상 동작(가능)', odd.status, '가능')
expect('결과에 좌표·설명 포함', [odd.lat, odd.lng, typeof odd.note], [33.436, 126.92, 'string'])

console.log('── 뇌우 / 오프쇼어 ──')
expect('뇌우 코드 95 → 모든 활동 위험', await status('jungmun', { wind_ms: 1, gust_ms: 2, wave_m: 1, weather_code: 95 }), '위험')
expect('뇌우 이유', await reasons('geumoreum', { wind_ms: 1, gust_ms: 2, weather_code: 99 }), ['뇌우(천둥·번개)'])
// 중문은 남쪽(180°)을 바라봄 → 육지는 북쪽. 북풍(0°)이 오프쇼어
expect('중문: 북풍(0°) 오프쇼어', isOffshore(180, 0), true)
expect('중문: 남풍(180°) 온쇼어', isOffshore(180, 180), false)
expect('해변 방향 없음 → null', isOffshore(null, 90), null)
expect('오프쇼어 팁', (await judgeActivity({ site: 'jungmun', conditions: { wind_ms: 4, gust_ms: 5, wave_m: 1, offshore: true } })).tips.length, 1)
expect('온쇼어 팁(가능일 때)', (await judgeActivity({ site: 'jungmun', conditions: { wind_ms: 4, gust_ms: 5, wave_m: 1, offshore: false } })).tips[0].startsWith('온쇼어'), true)

console.log('── 시간별 판정 (순수 함수) ──')
expect('양호 → 가능 + 이유 문구', judgeConditions('surfing', { wind_ms: 4, gust_ms: 6, wave_m: 1.2 }).reasons, ['기준 내 양호'])
expect('위험 우선', judgeConditions('surfing', { wind_ms: 11, gust_ms: 12, wave_m: 0.1 }).status, '위험')
expect('파도가 낮으면 주의(위험 아님)', judgeConditions('surfing', { wind_ms: 3, gust_ms: 4, wave_m: 0.2 }).status, '주의')
expect('뇌우 → 위험', judgeConditions('surfing', { wind_ms: 1, gust_ms: 2, wave_m: 1, weather_code: 95 }).status, '위험')

console.log('── 24시간 예보 ──')
const fc = await getForecast({ site: 'jungmun' })
expect('예보 24시간', fc.hours.length, 24)
expect('모든 시간에 가능/주의/위험 + 이유', fc.hours.every((h) => ['가능', '주의', '위험'].includes(h.status) && h.reasons.length > 0), true)
expect('시간 순서', fc.hours.every((h, i) => i === 0 || h.time > fc.hours[i - 1].time), true)

console.log('── 오류 처리 ──')
try {
  await judgeActivity({ site: 'nowhere', conditions: {} })
  expect('없는 장소는 오류', 'no error', 'error')
} catch (e) {
  expect('없는 장소는 오류(404)', e.status, 404)
}

console.log(failed ? `\n❌ ${failed}개 실패` : '\n✅ 모두 통과')
process.exit(failed ? 1 : 0)
