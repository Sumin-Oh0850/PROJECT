// React 화면이 우리 서버 함수(/api/...)를 부를 때 쓰는 함수 모음
// 공공데이터 API를 브라우저에서 직접 부르지 않습니다 (키 노출 + CORS 문제) → 반드시 /api 를 거칩니다.

// 응답을 JSON으로 읽고, 실패하면 에러를 던집니다
async function readJson(r) {
  let data
  try { data = await r.json() }
  catch { throw new Error(`서버 응답이 JSON이 아님 (${r.status}) — vercel dev 로 실행했는지 확인`) }
  if (!r.ok) throw new Error(data.error || r.statusText)
  return data
}

export async function get(path) {
  return readJson(await fetch(path))
}

export async function post(path, body) {
  return readJson(await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

// 동작 확인용
export const ping = () => get('/api/hello')

// 공공데이터 API
export const fetchSpots = () => get('/api/spots') // 관광지 약 100곳 (분류·위치가 고르게)
export const fetchWeather = (place = '제주시') =>
  get(`/api/weather?place=${encodeURIComponent(place)}`)

// 레저 장소 · 풍속/돌풍 · 가능/주의/위험 판정
export const fetchSites = (activity = '') => get(`/api/sites${activity ? `?activity=${activity}` : ''}`)
export const fetchWind = (site) => get(`/api/wind?site=${encodeURIComponent(site)}`)
export const fetchJudge = (site) => get(`/api/judge?site=${encodeURIComponent(site)}`)
export const fetchJudgeAll = (activity = '') => get(`/api/judge${activity ? `?activity=${activity}` : ''}`)

// 주변 정보 (kind: restaurant | cafe | attraction | shower)
export const fetchNearby = (site, kind) =>
  get(`/api/nearby?site=${encodeURIComponent(site)}&kind=${encodeURIComponent(kind)}`)

// STEP 6: 에이전트
export const askAgent = (message, history) => post('/api/agent', { message, history })
