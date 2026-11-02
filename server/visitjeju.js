// 비짓제주(제주관광공사) 관광정보 API 로 장소 대표 사진 찾기
//   findPhoto('협재해수욕장') → 사진 주소(https) 또는 '' (못 찾으면)
//   키: VISITJEJU_API_KEY (서버 전용 — 브라우저에 내려가지 않게 VITE_ 를 붙이지 않습니다)
import { cached } from './cache.js'

const BASE = 'https://api.visitjeju.net/vsjApi/contents/searchList'
const TIMEOUT = 15_000
const TTL = 24 * 60 * 60_000
const apiKey = () => process.env.VISITJEJU_API_KEY
const httpsUrl = (url) => (url ? String(url).replace(/^http:\/\//i, 'https://') : '')

// "OO해수욕장" ↔ "OO해변" 처럼 같은 곳이 다른 이름으로 올라 있을 수 있어 둘 다 찾는다
const nameVariants = (name) => [...new Set([name, name.replace('해수욕장', '해변'), name.replace('해변', '해수욕장')])]
// 검색어는 짧게("협재해수욕장" → "협재") 해야 비슷한 이름도 걸린다
const searchWord = (name) => name.replace(/해수욕장|해변/g, '').trim() || name

async function search(title) {
  const params = new URLSearchParams({ apiKey: apiKey(), locale: 'kr', page: 1, pageSize: 50, title })
  const res = await fetch(`${BASE}?${params}`, { signal: AbortSignal.timeout(TIMEOUT) })
  const json = await res.json()
  if (json.result && json.result !== '00' && json.items == null) throw new Error(`비짓제주 API 오류 ${json.result}`)
  return json.items ?? []
}

export async function findPhoto(name) {
  if (!apiKey()) return ''
  return cached(`vj-photo:${name}`, TTL, async () => {
    const items = await search(searchWord(name))
    const want = nameVariants(name)
    // 이름이 정확히 같은 것만 (이름이 비슷한 식당·숙소 사진이 섞이지 않게)
    const hit = items.find((i) => want.includes(String(i.title).trim()) && i.repPhoto?.photoid)
    const photo = hit?.repPhoto?.photoid
    return httpsUrl(photo?.thumbnailpath || photo?.imgpath || '')
  }, { failTtlMs: 5 * 60_000 })
}

// ── 주변 식당·카페 (음식점 분류 c4 전체를 한 번 내려받아 서버에서 거리 계산) ──────────────
// 비짓제주 API 는 좌표·반경 검색을 못 해서(보내도 무시) 전체를 받아 24시간 저장해 두고 쓴다.
// 카페는 분류가 따로 없어, 이름·태그에 아래 낱말이 있으면 카페로 본다.
const CAFE_WORDS = /카페|커피|cafe|coffee|디저트|베이커리|빵집|제과|티룸|찻집|로스터|브런치/i
export const isCafe = (title, tag) => CAFE_WORDS.test(`${title} ${tag ?? ''}`)

const rad = (d) => (d * Math.PI) / 180
function distanceM(lat1, lng1, lat2, lng2) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(a)))
}

async function page(n) {
  const params = new URLSearchParams({ apiKey: apiKey(), locale: 'kr', category: 'c4', page: n, pageSize: 100 })
  const res = await fetch(`${BASE}?${params}`, { signal: AbortSignal.timeout(TIMEOUT) })
  const json = await res.json()
  if (json.result && json.result !== '00' && json.items == null) throw new Error(`비짓제주 API 오류 ${json.result}`)
  return json
}

async function loadFood() {
  const first = await page(1)
  const per = first.items?.length || 100
  const pages = Math.ceil((first.totalCount ?? per) / per)
  const rest = []
  for (let p = 2; p <= pages; p += 4) { // 4쪽씩 묶어 가져와 서버에 부담을 줄임
    const batch = await Promise.all(Array.from({ length: Math.min(4, pages - p + 1) }, (_, i) => page(p + i)))
    rest.push(...batch)
  }
  return [first, ...rest].flatMap((r) => r.items ?? [])
    .filter((i) => Number.isFinite(i.latitude) && Number.isFinite(i.longitude))
    .map((i) => ({
      id: i.contentsid,
      name: String(i.title).trim(),
      address: i.roadaddress || i.address || '',
      phone: i.phoneno ?? '',
      lat: i.latitude,
      lng: i.longitude,
      cafe: isCafe(i.title, i.tag),
    }))
}

/** 장소 주변의 식당/카페 (가까운 순). kind: 'restaurant' | 'cafe'. 키가 없으면 오류를 던져 호출한 쪽이 대신할 수 있게 함 */
export async function nearbyFood({ lat, lng, kind, radius, size }) {
  if (!apiKey()) throw new Error('비짓제주 키가 없어요')
  const all = await cached('vj-food', TTL, loadFood, { failTtlMs: 2 * 60_000 })
  return all
    .filter((i) => (kind === 'cafe' ? i.cafe : !i.cafe))
    .map((i) => ({ ...i, distance_m: distanceM(lat, lng, i.lat, i.lng) }))
    .filter((i) => i.distance_m <= radius)
    .sort((a, b) => a.distance_m - b.distance_m)
    .slice(0, size)
    .map(({ cafe, ...i }) => ({ ...i, image: '', map_url: `https://www.openstreetmap.org/?mlat=${i.lat}&mlon=${i.lng}#map=17/${i.lat}/${i.lng}` })) // 사진은 쓰지 않음
}
