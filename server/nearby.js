// 주변 정보: 맛집 · 카페 (비짓제주, 실패하면 한국관광공사 TourAPI) · 관광지 (TourAPI) · 공용샤워실 (OpenStreetMap Overpass) · 해변 목록
//
// 외부 서버가 실패해도 화면이 멈추지 않도록 항상 같은 모양으로 답합니다.
//   { kind, site, source: 'visitjeju' | 'tourapi' | 'osm' | 'unavailable', radius_m, items: [...], note }
//   - items 가 비어 있으면 note 에 이유(키 없음, 서버 응답 없음, 결과 없음 …)가 들어 있습니다.
//   - 가짜 샘플 데이터는 만들지 않습니다. (정말 있는 곳처럼 보이면 안 되므로)
import { getSite } from './sites.js'
import { cached } from './cache.js'
import { nearbyFood } from './visitjeju.js'

const TOUR_BASE = 'https://apis.data.go.kr/B551011/KorService2'
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const CAFE_CAT3 = 'A05020900' // 음식점 중 세부분류 "카페/전통찻집"
const TOUR_TIMEOUT = 10_000
const OSM_TIMEOUT = 8_000
const TTL = 30 * 60_000

export const KINDS = {
  restaurant: { label: '맛집', radius: 3000 },
  cafe: { label: '카페', radius: 3000 },
  attraction: { label: '관광지', radius: 5000 },
  shower: { label: '공용 샤워실', radius: 3000 },
}

const tourKey = () => process.env.TOUR_API_KEY || process.env.DATA_GO_KR_KEY
const mapUrl = (lat, lng) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`

function badRequest(message) {
  const err = new Error(message)
  err.status = 400
  return err
}

// 두 좌표 사이 거리(m) - 하버사인 공식
function distanceM(lat1, lng1, lat2, lng2) {
  const rad = (d) => (d * Math.PI) / 180
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(a)))
}

// ── TourAPI ──────────────────────────────────────────────
async function tourFetch(op, extra) {
  const params = new URLSearchParams({
    serviceKey: tourKey(), MobileOS: 'ETC', MobileApp: 'JejuActivity', _type: 'json', ...extra,
  })
  const res = await fetch(`${TOUR_BASE}/${op}?${params}`, { signal: AbortSignal.timeout(TOUR_TIMEOUT) })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('TourAPI 응답이 JSON 이 아니에요') // 키 오류 등은 XML/텍스트로 옴. 본문은 키가 섞일 수 있어 싣지 않음
  }
  const items = json?.response?.body?.items
  if (!items) return [] // 결과가 없으면 빈 문자열이 옴
  return Array.isArray(items.item) ? items.item : [items.item]
}

const tourRow = (i) => ({
  id: i.contentid,
  name: i.title,
  address: i.addr1 ?? '',
  phone: i.tel ?? '',
  distance_m: i.dist ? Math.round(Number(i.dist)) : null,
  lat: Number(i.mapy),
  lng: Number(i.mapx),
  image: i.firstimage ?? '',
  map_url: mapUrl(i.mapy, i.mapx),
})

async function tourNearby(site, kind, radius, size) {
  const typeId = kind === 'attraction' ? 12 : 39
  const rows = await tourFetch('locationBasedList2', {
    mapX: site.lng, mapY: site.lat, radius: Math.min(radius, 20000),
    contentTypeId: typeId, arrange: 'E', // E = 거리순
    numOfRows: typeId === 39 ? 50 : size,  // 음식점은 맛집/카페로 나눠야 해서 넉넉히 받음
  })
  let list = rows
  if (kind === 'cafe') list = rows.filter((i) => i.cat3 === CAFE_CAT3)
  if (kind === 'restaurant') list = rows.filter((i) => i.cat3 !== CAFE_CAT3)
  return list.slice(0, size).map(tourRow)
}

// ── OpenStreetMap Overpass: amenity=shower ────────────────
async function osmShowers(site, radius, size) {
  const query = `[out:json][timeout:25];
(node["amenity"="shower"](around:${radius},${site.lat},${site.lng});
 way["amenity"="shower"](around:${radius},${site.lat},${site.lng}););
out center ${size * 2};`
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    // Overpass 는 User-Agent 가 없으면 406 으로 거절합니다
    headers: { 'User-Agent': 'jeju-leisure-guide/0.1 (learning project)', Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(OSM_TIMEOUT),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { elements = [] } = await res.json()
  return elements
    .map((e) => {
      const lat = e.lat ?? e.center?.lat
      const lng = e.lon ?? e.center?.lon
      const tags = e.tags ?? {}
      return {
        id: `${e.type}/${e.id}`,
        name: tags.name ?? '샤워장 (이름 미등록)',
        address: tags['addr:full'] ?? '',
        fee: tags.fee ?? '', // yes / no (유료 여부)
        phone: '',
        distance_m: distanceM(site.lat, site.lng, lat, lng),
        lat, lng, image: '',
        map_url: `https://www.openstreetmap.org/${e.type}/${e.id}`,
      }
    })
    .sort((a, b) => a.distance_m - b.distance_m)
    .slice(0, size)
}

const SHOWER_HINT = '해수욕장 공용 샤워장은 보통 여름 개장 기간에만 운영돼요. 그 외 기간에는 서핑숍 샤워실(강습·대여 고객용)을 확인하세요.'

// ── 공개 도구 ────────────────────────────────────────────
export async function findNearby({ site: siteId, kind, radius, size = 5 } = {}) {
  const site = getSite(siteId)
  const meta = KINDS[kind]
  if (!meta) throw badRequest(`kind 는 ${Object.keys(KINDS).join(' | ')} 중 하나예요`)
  const radius_m = Math.min(Math.max(Number(radius) || meta.radius, 100), 20000)
  const base = { kind, kind_label: meta.label, site: site.name, radius_m }

  return cached(`nearby:${site.id}:${kind}:${radius_m}`, TTL, async () => {
    if (kind === 'shower') {
      try {
        const items = await osmShowers(site, radius_m, size)
        return {
          ...base, source: 'osm', items,
          note: items.length
            ? `OpenStreetMap에 등록된 샤워장이에요. ${SHOWER_HINT}`
            : `OpenStreetMap에는 이 근처 샤워장이 등록돼 있지 않아요 (한국은 등록이 적어요). ${SHOWER_HINT}`,
        }
      } catch {
        return { ...base, source: 'unavailable', items: [], note: `샤워장 정보 서버(OpenStreetMap)가 응답하지 않아요. 잠시 뒤 다시 시도해 주세요. ${SHOWER_HINT}` }
      }
    }

    // 맛집·카페: 비짓제주를 먼저 쓰고, 실패하거나 결과가 없으면 아래 한국관광공사로 대신한다
    if (kind === 'restaurant' || kind === 'cafe') {
      try {
        const items = await nearbyFood({ lat: site.lat, lng: site.lng, kind, radius: radius_m, size })
        if (items.length) return { ...base, source: 'visitjeju', items, note: '비짓제주(제주관광공사)에 등록된 장소예요.' }
      } catch {
        // 비짓제주 키가 없거나 서버가 응답하지 않음 → 한국관광공사로 대신
      }
    }

    if (!tourKey()) {
      return { ...base, source: 'unavailable', items: [], note: '한국관광공사 키(TOUR_API_KEY 또는 DATA_GO_KR_KEY)가 없어요. .env.local 을 확인하세요.' }
    }
    try {
      const items = await tourNearby(site, kind, radius_m, size)
      return {
        ...base, source: 'tourapi', items,
        note: items.length ? '한국관광공사에 등록된 장소예요.' : `반경 ${radius_m / 1000}km 안에 한국관광공사에 등록된 ${meta.label}이(가) 없어요.`,
      }
    } catch {
      return { ...base, source: 'unavailable', items: [], note: '한국관광공사 서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.' }
    }
  }, { failTtlMs: 60_000 })
}

// 제주 해변 목록 (TourAPI 키워드 검색 "해수욕장" + "해변")
export async function listBeaches() {
  if (!tourKey()) {
    return { source: 'unavailable', items: [], note: '한국관광공사 키가 없어요. .env.local 을 확인하세요.' }
  }
  return cached('beaches', TTL, async () => {
    try {
      const found = await Promise.all(['해수욕장', '해변'].map((keyword) =>
        tourFetch('searchKeyword2', { keyword, areaCode: 39, numOfRows: 20 })))
      const byId = new Map()
      for (const i of found.flat()) if (!byId.has(i.contentid)) byId.set(i.contentid, tourRow(i))
      const items = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      return { source: 'tourapi', items, note: items.length ? '한국관광공사에 등록된 제주 해변이에요.' : '검색 결과가 없어요.' }
    } catch {
      return { source: 'unavailable', items: [], note: '한국관광공사 서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.' }
    }
  }, { failTtlMs: 60_000 })
}
