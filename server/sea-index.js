// 바다 지수: 국립해양조사원 "바다여행 예보" (fcstSeaTripv2) 의 제주 4개 해역(북동·북서·남동·남서)
//   getSeaIndex() → { source, date, period, items: [{ area, index, tide, sea_temp_c, wave_m, wind_ms, current_ms, weather }], note }
//   종합지수: 매우좋음 · 좋음 · 보통 · 나쁨 · 매우나쁨 (해양조사원이 계산한 값을 그대로 보여 줍니다)
//   - 키는 공공데이터포털 키(DATA_GO_KR_KEY)를 씁니다. 서버가 응답하지 않으면 안내 문구와 함께 빈 목록을 돌려줍니다.
import { cached } from './cache.js'

const base = () => (process.env.KHOA_SEATRIP_BASE_URL || 'https://apis.data.go.kr/1192136/fcstSeaTripv2').replace(/\/$/, '') // 주소가 .env 에 없어도 기본 주소를 씀
const OP = 'GetFcstSeaTripApiServicev2'
const TIMEOUT = 15_000
const TTL = 60 * 60_000 // 예보는 하루 몇 번만 바뀌므로 1시간 저장
const key = () => process.env.DATA_GO_KR_KEY || process.env.TOUR_API_KEY

const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v))
const kst = (now = new Date()) => new Date(now.getTime() + 9 * 3600e3)

// 제주 해역만 (이름이 "제주…") — 같은 해역의 날짜·오전/오후 행들 중, 오늘의 지금 시간대 행을 고른다
export function selectCurrent(rows, now = new Date()) {
  const k = kst(now)
  const today = k.toISOString().slice(0, 10)
  const period = k.getUTCHours() < 12 ? '오전' : '오후'
  const jeju = rows.filter((r) => String(r.sareaDtlNm ?? '').startsWith('제주'))
  const byArea = new Map()
  for (const r of jeju) (byArea.get(r.sareaDtlNm) ?? byArea.set(r.sareaDtlNm, []).get(r.sareaDtlNm)).push(r)
  const items = []
  for (const [area, list] of byArea) {
    // 우선순위: 오늘 + 지금 시간대 → 오늘 아무 시간대 → 가장 가까운 날
    const pick = list.find((r) => r.predcYmd === today && r.predcNoonSeCd === period)
      ?? list.find((r) => r.predcYmd === today)
      ?? [...list].sort((a, b) => String(a.predcYmd).localeCompare(String(b.predcYmd)))[0]
    items.push({
      area,
      index: pick.totalIndex || '정보 없음',
      tide: pick.tdlvHrCn || '',
      sea_temp_c: num(pick.avgWtem),
      wave_m: num(pick.avgWvhgt),
      wind_ms: num(pick.avgWspd),
      current_ms: num(pick.avgCrsp),
      weather: pick.weather || '',
      date: pick.predcYmd,
      period: pick.predcNoonSeCd,
    })
  }
  return { date: today, period, items: items.sort((a, b) => a.area.localeCompare(b.area, 'ko')) }
}

async function fetchRows(reqDate) {
  const rows = []
  for (let pageNo = 1; pageNo <= 4; pageNo++) { // 전국 232건 → 100건씩 3쪽 (여유로 4쪽까지)
    const params = new URLSearchParams({ serviceKey: key(), type: 'json', pageNo, numOfRows: 100, reqDate })
    const res = await fetch(`${base()}/${OP}?${params}`, { signal: AbortSignal.timeout(TIMEOUT) })
    let json
    try { json = JSON.parse(await res.text()) } catch { throw new Error('해양조사원 응답이 JSON 이 아니에요') } // 키 오류는 XML 로 옴 (본문은 키가 섞일 수 있어 싣지 않음)
    if (json?.header?.resultCode && json.header.resultCode !== '00') throw new Error(`해양조사원 오류 ${json.header.resultCode}`)
    const it = json?.body?.items?.item
    const list = Array.isArray(it) ? it : it ? [it] : []
    rows.push(...list)
    if (list.length < 100) break
  }
  return rows
}

export async function getSeaIndex() {
  if (!key()) return { source: 'unavailable', items: [], note: '공공데이터 키(DATA_GO_KR_KEY)가 없어요. .env.local 을 확인하세요.' }
  return cached('sea-index', TTL, async () => {
    try {
      const reqDate = kst().toISOString().slice(0, 10).replaceAll('-', '')
      const { date, period, items } = selectCurrent(await fetchRows(reqDate))
      if (!items.length) return { source: 'unavailable', items: [], note: '지금 제주 해역의 바다 지수가 없어요.' }
      return { source: 'khoa', date, period, items, note: '국립해양조사원 바다여행 예보예요. 종합지수는 해양조사원이 계산한 값이고, 장소별 판정과는 기준이 달라요.' }
    } catch {
      return { source: 'unavailable', items: [], note: '해양조사원 서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.' }
    }
  }, { failTtlMs: 5 * 60_000 })
}
