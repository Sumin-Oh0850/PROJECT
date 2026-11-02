// 제주 해양·항공 레저 도구 (대주제: 서핑)
//
// 핵심 도구
//   listSites({ activity })        : 서핑·윈드서핑·패러글라이딩 장소 목록
//   getWindGusts({ site })         : 풍속·돌풍·풍향 + 파도·수온
//   judgeActivity({ site })        : 가능 / 주의 / 위험 판정과 이유
//
// ⚠ 판정 기준은 학습·참고용 예시입니다. 실제 활동 전에는 반드시 기상특보와
//   현장 강사·업체의 판단을 따르세요.
import { ACTIVITY_KO, SITES, getSite } from './sites.js'
import { cached } from './cache.js'

const TIMEOUT_MS = 8000
const WEATHER_TTL = 10 * 60_000 // 바람·파도는 10분 동안 같은 값을 재사용

// =================================================================
// 핵심 도구 1. list_sites
// =================================================================
export function listSites({ activity } = {}) {
  if (activity && !ACTIVITY_KO[activity]) {
    const err = new Error(`activity 는 ${Object.keys(ACTIVITY_KO).join(' | ')} 중 하나예요`)
    err.status = 400
    throw err
  }
  return SITES.filter((s) => !activity || s.activity === activity).map((s) => ({
    ...s,
    activity_ko: ACTIVITY_KO[s.activity],
  }))
}

// =================================================================
// 핵심 도구 2. get_wind_gusts  (Open-Meteo 날씨 + 해양, 키 불필요)
// =================================================================
async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function fetchWind(lat, lng) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    current: 'temperature_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m',
    wind_speed_unit: 'ms', // 풍속 단위: m/s
    timezone: 'Asia/Seoul',
  })
  const { current: c } = await getJson(`https://api.open-meteo.com/v1/forecast?${params}`)
  return {
    time: c.time,
    temp_c: c.temperature_2m,
    precip_mm: c.precipitation,
    weather_code: c.weather_code,
    wind_ms: c.wind_speed_10m,
    gust_ms: c.wind_gusts_10m,
    wind_dir_deg: c.wind_direction_10m,
  }
}

async function fetchMarine(lat, lng) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    current: 'wave_height,wave_period,wave_direction,sea_surface_temperature',
    timezone: 'Asia/Seoul',
  })
  const { current: c } = await getJson(`https://marine-api.open-meteo.com/v1/marine?${params}`)
  return { wave_m: c.wave_height, wave_period_s: c.wave_period, sea_temp_c: c.sea_surface_temperature }
}

// 인터넷이 끊기거나 외부 API 가 실패해도 화면이 멈추지 않도록 쓰는 샘플 값 (source: 'sample')
// 판정 결과가 골고루 나오도록 일부러 다르게 설정했습니다.
const SAMPLE_WIND = {
  jungmun: [4.2, 6.0, 200], iho: [8.5, 12.5, 320], gwakji: [6.0, 8.5, 300], woljeong: [3.0, 4.5, 190],
  hado: [2.5, 3.8, 40], sinyang: [7.5, 10.0, 110], gimnyeong: [14.5, 18.0, 350], geumoreum: [3.5, 5.0, 270],
}
const SAMPLE_WAVE = {
  jungmun: 1.2, iho: 2.4, gwakji: 1.5, woljeong: 0.8, hado: 0.4, sinyang: 1.0, gimnyeong: 2.8, geumoreum: null,
}
function sampleWind(site) {
  const [wind, gust, dir] = SAMPLE_WIND[site.id] ?? [4.0, 6.0, 0]
  return { time: '샘플', temp_c: 17.0, precip_mm: 0.0, weather_code: 2, wind_ms: wind, gust_ms: gust, wind_dir_deg: dir }
}
function sampleMarine(site) {
  return { wave_m: SAMPLE_WAVE[site.id] ?? 1.0, wave_period_s: 7.0, sea_temp_c: 20.0 }
}

// 바람이 육지 → 바다로 불면 true (서핑에 유리). 해변 방향 정보가 없으면 null.
export function isOffshore(facingDeg, windFromDeg) {
  if (facingDeg == null || windFromDeg == null) return null
  const landSide = (facingDeg + 180) % 360 // 해변 뒤쪽(육지) 방향
  const diff = Math.abs((((windFromDeg - landSide + 180) % 360) + 360) % 360 - 180)
  return diff <= 60
}

const round1 = (n) => Math.round(n * 10) / 10
// 돌풍 편차 = 돌풍 − 평균 풍속. 예보 모델이 돌풍을 평균보다 낮게 줄 때가 있어 0 아래로는 내려가지 않게 함
const gustSpread = (gust, wind) => Math.max(0, round1(gust - wind))

export async function getWindGusts({ site: siteId } = {}) {
  const site = getSite(siteId)
  return cached(`wind:${site.id}`, WEATHER_TTL, async () => {
    const sources = { wind: 'open-meteo', marine: null }

    let wind
    try {
      wind = await fetchWind(site.lat, site.lng)
    } catch {
      wind = sampleWind(site)
      sources.wind = 'sample'
    }

    let marine = {}
    if (site.activity !== 'paragliding') {
      // 바다 활동이면 파도 정보도 함께
      sources.marine = 'open-meteo'
      try {
        marine = await fetchMarine(site.lat, site.lng)
      } catch {
        marine = sampleMarine(site)
        sources.marine = 'sample'
      }
    }

    const isSample = Object.values(sources).includes('sample')
    return {
      id: site.id,
      site: site.name,
      source: isSample ? 'sample' : 'open-meteo',
      sources,
      ...wind,
      ...marine,
      gust_spread_ms: gustSpread(wind.gust_ms, wind.wind_ms), // 돌풍 편차: 클수록 바람이 들쭉날쭉
      offshore: isOffshore(site.facing_deg, wind.wind_dir_deg),
    }
  }, { failTtlMs: 30_000 })
}

// =================================================================
// 핵심 도구 3. judge_activity
// =================================================================
// 활동별 기준 [항목, 비교, 한계값, 이유] (m/s, m). 초보자 기준의 보수적인 예시값입니다.
export const RULES = {
  surfing: {
    위험: [
      ['wind_ms', '>=', 11, '풍속 11m/s 이상'],
      ['gust_ms', '>=', 14, '돌풍 14m/s 이상'],
      ['wave_m', '>=', 3.0, '파도 3m 이상 (초보 위험)'],
    ],
    주의: [
      ['wind_ms', '>=', 7, '풍속 7m/s 이상, 파도가 거칠어짐'],
      ['gust_ms', '>=', 10, '돌풍 10m/s 이상'],
      ['wave_m', '>=', 2.0, '파도 2m 이상 (중급 이상 권장)'],
      ['wave_m', '<', 0.3, '파도가 거의 없음 (연습만 가능)'],
    ],
  },
  windsurfing: {
    위험: [
      ['wind_ms', '>=', 14, '풍속 14m/s 이상'],
      ['gust_ms', '>=', 17, '돌풍 17m/s 이상'],
    ],
    주의: [
      ['wind_ms', '>=', 10, '풍속 10m/s 이상 (숙련자 위주)'],
      ['gust_ms', '>=', 13, '돌풍 13m/s 이상'],
      ['gust_spread_ms', '>=', 5, '바람 세기 변화가 큼'],
      ['wind_ms', '<', 3, '바람 부족 (초보 연습만 가능)'],
    ],
  },
  paragliding: {
    위험: [
      ['wind_ms', '>=', 8, '풍속 8m/s 이상'],
      ['gust_ms', '>=', 10, '돌풍 10m/s 이상'],
      ['gust_spread_ms', '>=', 5, '돌풍 편차 5m/s 이상 (난기류 위험)'],
      ['precip_mm', '>', 0.5, '강수'],
    ],
    주의: [
      ['wind_ms', '>=', 5.5, '풍속 5.5m/s 이상'],
      ['gust_ms', '>=', 8, '돌풍 8m/s 이상'],
      ['gust_spread_ms', '>=', 3.5, '돌풍 편차 3.5m/s 이상'],
    ],
  },
}
const THUNDER_CODES = new Set([95, 96, 99]) // WMO 날씨 코드: 뇌우

const OPS = { '>=': (v, l) => v >= l, '>': (v, l) => v > l, '<': (v, l) => v < l }
const check = (value, op, limit) => value != null && OPS[op](value, limit)

const CONDITION_KEYS = ['wind_ms', 'gust_ms', 'gust_spread_ms', 'wind_dir_deg', 'wave_m', 'sea_temp_c', 'precip_mm']

// conditions 를 직접 주면 그 값으로, 주지 않으면 getWindGusts() 로 조회해서 판정합니다.
export async function judgeActivity({ site: siteId, conditions } = {}) {
  const site = getSite(siteId)
  const c = { ...(conditions ?? (await getWindGusts({ site: siteId }))) }
  if (c.gust_spread_ms == null && c.gust_ms != null && c.wind_ms != null) c.gust_spread_ms = gustSpread(c.gust_ms, c.wind_ms)
  const rules = RULES[site.activity]

  let status = '가능'
  let reasons = []
  if (THUNDER_CODES.has(c.weather_code)) {
    status = '위험'
    reasons = ['뇌우(천둥·번개)']
  } else {
    // 위에서부터 검사: 위험 → 주의 → 가능. 처음 걸리는 단계가 결과
    for (const level of ['위험', '주의']) {
      const hits = rules[level].filter(([key, op, limit]) => check(c[key], op, limit)).map(([, , , msg]) => msg)
      if (hits.length) {
        status = level
        reasons = hits
        break
      }
    }
  }

  const tips = []
  if (site.activity === 'surfing' && c.offshore) tips.push('오프쇼어 바람: 파도 면이 깔끔해 서핑에 유리')
  if (site.activity === 'surfing' && c.offshore === false && status === '가능') tips.push('온쇼어 바람: 파도가 흐트러질 수 있음')

  return {
    id: site.id,
    site: site.name,
    activity: ACTIVITY_KO[site.activity],
    activity_key: site.activity,
    lat: site.lat,
    lng: site.lng,
    note: site.note,
    status,
    reasons: reasons.length ? reasons : ['기준 내 양호'],
    tips,
    conditions: {
      ...Object.fromEntries(CONDITION_KEYS.map((k) => [k, c[k] ?? null])),
      offshore: c.offshore ?? null,
      temp_c: c.temp_c ?? null,
      time: c.time ?? null,
      source: c.source ?? 'manual',
    },
  }
}

// 모든 장소를 한 번에 판정 (홈·목록·지도 화면용). 장소별로 병렬 조회합니다.
export async function judgeAll({ activity } = {}) {
  return Promise.all(listSites({ activity }).map((s) => judgeActivity({ site: s.id })))
}
