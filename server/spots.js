// 제주 관광지 (한국관광공사 TourAPI 관광지 전체. n 을 주면 그 수만큼 "고루 분포"하도록 선정)
//
// 왜 선정이 필요한가: 한국관광공사에 등록된 제주 관광지는 132건인데 오름(산)이 37건으로 몰려 있어,
// 앞에서부터 100개를 자르면 분류도 위치도 한쪽으로 치우칩니다.
// 선정 방법
//   1) 분류를 5개 묶음(오름·산 / 숲·계곡·자연 / 해변·해안·포구 / 역사·문화 / 체험·휴양)으로 나눈다.
//   2) 묶음별 상한을 맞춘다: 가장 큰 묶음부터 줄여 전체가 n 곳이 되게 한다. (해수욕장은 항상 포함)
//   3) 묶음 안에서는 "이미 고른 곳과 가장 먼 곳"을 차례로 고른다(farthest-point sampling).
//      → 가까이 몰린 곳은 빠지고, 섬 전체에 퍼진다. 결과는 항상 같다(무작위 없음).
import { cached } from './cache.js'
import { findPhoto } from './visitjeju.js'
import { listFacilities, listVisitSpots } from './facilities.js'

const BASE = 'https://apis.data.go.kr/B551011/KorService2'
const TIMEOUT = 15_000
const TTL = 24 * 60 * 60_000
const tourKey = () => process.env.TOUR_API_KEY || process.env.DATA_GO_KR_KEY

export const GROUPS = {
  oreum: { label: '오름·산', color: '#2e7d32' },
  nature: { label: '숲·계곡·자연', color: '#00897b' },
  coast: { label: '해변·해안·포구', color: '#1e88e5' },
  history: { label: '역사·문화', color: '#8e24aa' },
  play: { label: '체험·휴양', color: '#ef6c00' },
  leisure: { label: '레저 시설', color: '#7b5ea7' }, // 비짓제주의 레저 업체·시설 (아래 listSpots 에서 더함)
}

// TourAPI 세부분류(cat3) → [이름, 묶음]  (categoryCode2 로 확인한 값)
const CAT3 = {
  A01010400: ['산', 'oreum'],
  A01010500: ['자연생태관광지', 'nature'], A01010600: ['자연휴양림', 'nature'], A01010700: ['수목원', 'nature'],
  A01010800: ['폭포', 'nature'], A01010900: ['계곡', 'nature'], A01011000: ['약수터', 'nature'],
  A01011700: ['호수', 'nature'], A01011900: ['동굴', 'nature'], A01020100: ['희귀동.식물', 'nature'], A01020200: ['기암괴석', 'nature'],
  A01011200: ['해수욕장', 'coast'], A01011100: ['해안절경', 'coast'], A01011400: ['항구/포구', 'coast'],
  A01011300: ['섬', 'coast'], A01011600: ['등대', 'coast'],
  A02010200: ['성', 'history'], A02010700: ['유적지/사적지', 'history'], A02010800: ['사찰', 'history'],
  A02050200: ['기념탑/기념비/전망대', 'history'], A02050600: ['유명건물', 'history'], A02030200: ['전통체험', 'history'],
  A02030100: ['농.산.어촌 체험', 'play'], A02020700: ['공원', 'play'], A02030400: ['이색체험', 'play'], A02030600: ['이색거리', 'play'],
  A02020600: ['테마공원', 'play'], A02020200: ['관광단지', 'play'], A02020800: ['유람선/잠수함관광', 'play'],
  A02040400: ['발전소', 'play'], A02050100: ['다리/대교', 'play'], A02050500: ['터널', 'play'],
}
const BEACH_CAT3 = 'A01011200' // 해수욕장 — 항상 포함
const REGION = { 3: '서귀포시', 4: '제주시' } // TourAPI sigungucode (areaCode 2 로 확인)

const mapUrl = (lat, lng) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`

// TourAPI 이미지 주소는 http:// 로 내려오는데, 사이트를 https:// 로 배포하면 브라우저가 http 이미지를 막습니다(혼합 콘텐츠).
// 같은 서버가 https 로도 응답하므로 https 로 바꿔 줍니다.
export const httpsUrl = (url) => (url ? String(url).replace(/^http:\/\//i, 'https://') : '')

// 제주(부속 섬 포함) 좌표 범위. 이 밖의 값은 지도에 잘못 찍히므로 걸러낸다.
const inJeju = (lat, lng) => lat > 33.0 && lat < 34.1 && lng > 126.0 && lng < 127.2

// 공공데이터에 가끔 있는 좌표 입력 실수를 다룬다. (예: 영주산 경도 12.797 → 126.797)
//  - 범위 안이면 그대로 쓴다.
//  - 경도가 100 미만이면 "앞자리 126 이 빠졌다"고 보고 소수부를 살려 보정해 본다. 보정해도 범위 밖이면 버린다.
export function cleanCoord(lat, lng) {
  if (inJeju(lat, lng)) return { lat, lng, fixed: false }
  if (lng > 0 && lng < 100) {
    const repaired = 126 + (lng % 1)
    if (inJeju(lat, repaired)) return { lat, lng: Number(repaired.toFixed(10)), fixed: true }
  }
  return null
}

// 두 지점 사이 거리(km). 제주 정도 범위에서는 평면 근사로 충분합니다.
const distKm = (a, b) => {
  const dy = (a.lat - b.lat) * 111.0
  const dx = (a.lng - b.lng) * 111.0 * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180))
  return Math.hypot(dx, dy)
}

// 묶음 안에서 count 곳을 서로 멀리 떨어지게 고른다. must 는 반드시 포함할 곳.
function farthestPoints(items, count, must = []) {
  if (items.length <= count) return [...items]
  const chosen = [...must]
  const rest = items.filter((i) => !must.includes(i))
  if (chosen.length === 0) {
    // 시작점: 묶음 중심에서 가장 먼 곳
    const c = { lat: items.reduce((s, i) => s + i.lat, 0) / items.length, lng: items.reduce((s, i) => s + i.lng, 0) / items.length }
    rest.sort((a, b) => distKm(b, c) - distKm(a, c) || a.id.localeCompare(b.id))
    chosen.push(rest.shift())
  }
  while (chosen.length < count && rest.length) {
    let bestIdx = 0
    let bestScore = -1
    rest.forEach((cand, idx) => {
      const score = Math.min(...chosen.map((c) => distKm(cand, c))) // 이미 고른 곳과의 최소 거리
      if (score > bestScore || (score === bestScore && cand.id < rest[bestIdx].id)) {
        bestScore = score
        bestIdx = idx
      }
    })
    chosen.push(rest.splice(bestIdx, 1)[0])
  }
  return chosen
}

// 후보 전체에서 n 곳을 분류·위치가 고르게 선정한다. (순수 함수: 시험 가능)
export function selectSpread(candidates, n = 100) {
  const byGroup = {}
  for (const c of candidates) (byGroup[c.group] ??= []).push(c)
  const keys = Object.keys(byGroup)

  // 묶음별 상한: 가장 큰 상한부터 1씩 줄여 합이 n 이 될 때까지 (동점이면 원래 더 큰 묶음부터)
  const caps = Object.fromEntries(keys.map((k) => [k, byGroup[k].length]))
  const total = () => Object.values(caps).reduce((a, b) => a + b, 0)
  while (total() > n) {
    const k = keys.filter((x) => caps[x] > 0).sort((a, b) => caps[b] - caps[a] || byGroup[b].length - byGroup[a].length || a.localeCompare(b))[0]
    caps[k] -= 1
  }

  const picked = []
  for (const k of keys.sort()) {
    const must = byGroup[k].filter((i) => i.cat3 === BEACH_CAT3) // 해수욕장은 항상 포함
    picked.push(...farthestPoints(byGroup[k], Math.max(caps[k], must.length), must))
  }
  return picked.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

async function fetchCandidates() {
  const params = new URLSearchParams({
    serviceKey: tourKey(), MobileOS: 'ETC', MobileApp: 'JejuActivity', _type: 'json',
    areaCode: 39, contentTypeId: 12, numOfRows: 500, pageNo: 1,
  })
  const res = await fetch(`${BASE}/areaBasedList2?${params}`, { signal: AbortSignal.timeout(TIMEOUT) })
  let json
  try {
    json = JSON.parse(await res.text())
  } catch {
    throw new Error('TourAPI 응답이 JSON 이 아니에요')
  }
  const raw = json?.response?.body?.items?.item
  const rows = Array.isArray(raw) ? raw : raw ? [raw] : []
  return rows
    .map((r) => ({ r, coord: cleanCoord(Number(r.mapy), Number(r.mapx)) }))
    .filter(({ coord }) => coord) // 좌표가 없거나 제주 밖이면 지도에 못 찍으므로 제외
    .map(({ r, coord }) => {
      const [catName, group] = CAT3[r.cat3] ?? ['기타', 'play']
      const { lat, lng } = coord
      return {
        id: r.contentid,
        name: r.title,
        address: [r.addr1, r.addr2].filter(Boolean).join(' '),
        region: REGION[r.sigungucode] ?? (r.addr1?.includes('서귀포') ? '서귀포시' : '제주시'),
        group,
        group_label: GROUPS[group].label,
        category: catName,
        cat3: r.cat3,
        lat, lng,
        image: httpsUrl(r.firstimage),
        map_url: mapUrl(lat, lng),
        is_beach: r.cat3 === BEACH_CAT3 || /해수욕장|해변/.test(r.title),
      }
    })
}

// 한국관광공사 "관광지"에는 해수욕장이 5곳뿐이라, 널리 알려진 제주 해수욕장·해변을 직접 더했습니다.
// 좌표는 OpenStreetMap 에서 확인한 값입니다. 사진·분류 정보는 없어서 이미지 칸은 비어 있습니다.
// (이미 있는 곳과 겹치지 않도록 TourAPI 의 삼양·함덕·하모·논짓물은 넣지 않았습니다. 같은 이름이 TourAPI 에 있으면 자동으로 빠집니다.)
export const EXTRA_BEACHES = [
  ['협재해수욕장', '제주시', '제주특별자치도 제주시 한림읍 협재리', 33.3940, 126.2400],
  ['금능해수욕장', '제주시', '제주특별자치도 제주시 한림읍 금능리', 33.3895, 126.2356],
  ['곽지해수욕장', '제주시', '제주특별자치도 제주시 애월읍 곽지리', 33.4505, 126.3048],
  ['이호테우해수욕장', '제주시', '제주특별자치도 제주시 이호일동', 33.4970, 126.4550],
  ['김녕해수욕장', '제주시', '제주특별자치도 제주시 구좌읍 김녕리', 33.5562, 126.7593],
  ['월정리해수욕장', '제주시', '제주특별자치도 제주시 구좌읍 월정리', 33.5563, 126.7958],
  ['세화해수욕장', '제주시', '제주특별자치도 제주시 구좌읍 세화리', 33.5250, 126.8604],
  ['중문색달해수욕장', '서귀포시', '제주특별자치도 서귀포시 색달동', 33.2449, 126.4090],
  ['화순금모래해수욕장', '서귀포시', '제주특별자치도 서귀포시 안덕면 화순리', 33.2404, 126.3332],
  ['표선해수욕장', '서귀포시', '제주특별자치도 서귀포시 표선면 표선리', 33.3280, 126.8370],
  ['소금막해변', '서귀포시', '제주특별자치도 서귀포시 표선면', 33.3312, 126.8425],
  ['광치기해변', '서귀포시', '제주특별자치도 서귀포시 성산읍 고성리', 33.4538, 126.9255],
  ['하도해변', '제주시', '제주특별자치도 제주시 구좌읍 하도리', 33.5135, 126.8988], // 한국관광공사 목록에서 빠져서 직접 더함 (이미 목록에 있으면 자동으로 건너뜀)
].map(([name, region, address, lat, lng]) => ({
  id: `extra-${name}`,
  name,
  address,
  region,
  group: 'coast',
  group_label: GROUPS.coast.label,
  category: '해수욕장',
  cat3: BEACH_CAT3,
  lat, lng,
  image: '',
  map_url: mapUrl(lat, lng),
  is_beach: true,
  extra: true,
}))

export async function listSpots({ n } = {}) {
  // n 을 주지 않으면 한국관광공사 목록 전체를 쓴다 (n 을 주면 그 수만큼 분류·위치가 고르게 추려 냄)
  const count = Number(n) > 0 ? Math.max(Number(n), 10) : Infinity
  if (!tourKey()) {
    return { source: 'unavailable', count: 0, items: [], note: '한국관광공사 키(TOUR_API_KEY 또는 DATA_GO_KR_KEY)가 없어요. .env.local 을 확인하세요.' }
  }
  return cached(`spots:${count}`, TTL, async () => {
    try {
      const candidates = await fetchCandidates()
      const known = new Set(candidates.map((c) => c.name))
      const merged = [...selectSpread(candidates, count), ...EXTRA_BEACHES.filter((b) => !known.has(b.name))]
        .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      // 사진이 없는 곳은 비짓제주에서 찾아 채운다 (키가 없거나 못 찾으면 그대로 빈 이미지)
      const base = await Promise.all(merged.map(async (i) => (i.image ? i : { ...i, image: await findPhoto(i.name).catch(() => '') })))
      // 비짓제주: 레저 업체·시설 + 한국관광공사 목록에 없는 관광지 (같은 이름은 빼고). 키가 없거나 응답이 없으면 건너뜀
      const facilities = await listFacilities().catch(() => [])
      const visit = await listVisitSpots([...base.map((i) => i.name), ...candidates.map((c) => c.name)]).catch(() => [])
      const items = [...base, ...facilities, ...visit].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      const tally = (key, items_) => items_.reduce((a, i) => ((a[i[key]] = (a[i[key]] ?? 0) + 1), a), {})
      const groupAll = { ...tally('group', candidates), leisure: facilities.length }
      const groupSel = tally('group', items)
      return {
        source: 'tourapi',
        candidates: candidates.length,
        count: items.length,
        groups: Object.entries(GROUPS).map(([key, g]) => ({ key, label: g.label, color: g.color, count: groupSel[key] ?? 0, total: groupAll[key] ?? 0 })),
        regions: Object.entries(tally('region', items)).map(([key, c]) => ({ key, count: c })),
        items,
        note: `한국관광공사 TourAPI에 등록된 제주 관광지 ${candidates.length}곳${base.length - base.filter((i) => i.extra).length < candidates.length ? ` 중 분류와 위치가 고르게 퍼지도록 ${base.length - base.filter((i) => i.extra).length}곳을 골랐고` : ' 전부와'}, 널리 알려진 해수욕장·해변 ${base.filter((i) => i.extra).length}곳${facilities.length || visit.length ? `, 비짓제주의 관광지 ${visit.length}곳과 레저 업체·시설 ${facilities.length}곳` : ''}을 더했어요.`,
      }
    } catch {
      return { source: 'unavailable', count: 0, items: [], note: '한국관광공사 서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.' }
    }
  }, { failTtlMs: 60_000 })
}
