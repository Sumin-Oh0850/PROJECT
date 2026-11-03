// 비짓제주(제주관광공사) 관광지(c1) 로 관광지 목록을 채웁니다. 한 번 내려받은 관광지 전체를 둘로 나눕니다.
//   listFacilities()           → 레저 업체·시설 (서핑·카약·요트·다이빙·승마·액티비티 …)
//   listVisitSpots(usedNames)  → 그 밖의 관광지·해변·포구 등 (한국관광공사 목록에 없는 곳)
//   모두 관광지·해변 목록과 같은 모양의 항목입니다. 분류는 이름·태그의 낱말로 나눈 것이라 틀릴 수 있습니다.
//   사진은 비짓제주의 대표 사진(작은 이미지)을 씁니다. 전화번호는 쓰지 않습니다.
import { cached } from './cache.js'
import { SITES } from './sites.js'

const BASE = 'https://api.visitjeju.net/vsjApi/contents/searchList'
const TIMEOUT = 20_000
const TTL = 24 * 60 * 60_000
const apiKey = () => process.env.VISITJEJU_API_KEY
const httpsUrl = (url) => (url ? String(url).replace(/^http:\/\//i, 'https://') : '')

// ── 레저 시설 분류 ────────────────────────────────────────
const CATS = [
  ['서핑·수상', /서핑|서프|카약|카누|요트|다이빙|스쿠버|윈드|스노클|래프팅|제트|패들|보트|잠수/],
  ['하늘', /패러글라이딩|스카이|열기구|행글라이딩|카이트/],
  ['승마·액티비티', /승마|ATV|카트|집라인|서바이벌|번지|짚라인|레포츠|낚시/],
]
const NOT_A_BUSINESS = /(해수욕장|해변|포구|항|해안도로|등대)$/ // 해변·항구 자체는 업체가 아니라서 레저 시설에서는 제외 (관광지로 들어감)
export const classify = (title, tag) => {
  const text = `${title} ${tag ?? ''}`
  return CATS.find(([, re]) => re.test(text))?.[0] ?? null
}
const isFacility = (r) => Boolean(classify(r.title, r.tag)) && !NOT_A_BUSINESS.test(String(r.title).trim())

// ── 관광지 분류 (기존 5개 묶음) ───────────────────────────
// 위에서부터 처음 맞는 묶음. 이름을 먼저 보고, 안 맞으면 이름+태그를 본다 (오름·산은 이름만 봄).
const GROUP_RULES = [
  ['oreum', /오름|[가-힣]산$/],
  ['coast', /해변|해수욕장|포구|해안|항$|등대|섬$|바당|갯|몽돌|연대|방파제|바다|해녀|용머리/],
  ['nature', /숲|곶자왈|폭포|계곡|동굴|수목원|휴양림|공원|올레|둘레길|생태|습지|호수|연못|천$|내$|기암|정원|화원/],
  ['history', /박물관|미술관|유적|사찰|성$|읍성|성지|기념|전시|문화|유배|향교|사$|암$|서원|관아|진$|비$|4\.3|항쟁|순례/],
]
export const groupOf = (title, tag) => {
  const t = String(title).trim()
  const text = `${t} ${tag ?? ''}`
  const hit = GROUP_RULES.find(([key, re]) => re.test(t) || (key !== 'oreum' && re.test(text)))
  return hit?.[0] ?? 'play'
}
const GROUP_LABEL = { oreum: '오름·산', nature: '숲·계곡·자연', coast: '해변·해안·포구', history: '역사·문화', play: '체험·휴양', leisure: '레저 시설' }

const rad = (d) => (d * Math.PI) / 180
function distanceKm(lat1, lng1, lat2, lng2) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(a)) * 10) / 10
}
const nearestSite = (lat, lng) => SITES.map((s) => ({ name: s.name, km: distanceKm(lat, lng, s.lat, s.lng) })).sort((a, b) => a.km - b.km)[0]

// 이름 비교용: 공백·괄호 안 글자·기호를 없앤다 (한국관광공사 목록과 같은 곳을 걸러 내기 위해)
export const normalizeName = (name) => String(name).replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/[\s·,.\-_/]/g, '').toLowerCase()

// 이름 바로잡기: 원본의 오타·표기를 고친다. 정확히 짚은 것은 아래 표로, 같은 실수는 규칙으로 함께 고친다.
//  (표의 키는 normalizeName 결과 — 공백·기호를 뺀 이름)
const NAME_FIXES = new Map([
  ['43사건위령비', '4·3사건 위령비'],
  ['노형수퍼마켙', '노형수퍼마켓'],
])
export function fixName(raw) {
  const name = String(raw).replace(/^[\s"'“”]+|[\s"'“”]+$/g, '') // 앞뒤 공백·탭·따옴표
  return NAME_FIXES.get(normalizeName(name)) ?? name.replace(/마켙/g, '마켓').replace(/(?<![0-9])43(?=사건|항쟁)/g, '4·3')
}

// 관광지 탭에 어울리지 않는 업종을 뺀다 (병원·기업·상점·렌터카, 반려동물 미용·호텔·유치원·용품·간식).
// 반려동물 카페·체험, 학교·유적처럼 관광지일 수 있는 곳은 그대로 둔다.
const OFF_TOPIC_NAMES = ['카카오본사', '(주)시트러스', '제주고속(주)', '암퀘스트 농업회사법인 주식회사 (제주증류소)'] // 키워드로 걸러지지 않는 곳
const MEDICAL = /병원|의원|의료|검진|한의원|치과|성형|피부과|약국|클리닉|건강관리|건강증진/
const COMPANY = /본사|주식회사|\(주\)|㈜/ // (농업회사법인은 식물원 같은 관광지도 있어 이름만으로 거르지 않음)
const SHOP_CAR = /수퍼마[켓켙]|슈퍼마[켓켙]|마트$|편의점|렌터카|렌트카/
const PET_SERVICE_CATEGORY = /애견미용|반려견미용|미용서비스|유치원|애견호텔|반려견호텔|용품|수제간식|동물병원/ // 태그(분류) 기준
const PET_SERVICE_NAME = /그루밍|애견미용|펫스쿨|교육센터|간식/ // 이름 기준 (카페가 들어 있으면 카페라서 제외하지 않음)
const KEEP_NAMES = ['노형수퍼마켙', '노형수퍼마켓'] // 규칙에 걸려도 관광지로 남길 곳 (원본 표기는 "마켙", 화면에는 fixName 으로 "마켓")
export function isOffTopic({ title, tag }) {
  const name = String(title).trim()
  const category = String(tag ?? '').split(/[,，]/)[0].trim()
  if (KEEP_NAMES.includes(name)) return false
  if (OFF_TOPIC_NAMES.includes(name)) return true
  if (MEDICAL.test(name) || MEDICAL.test(category) || /병원/.test(category)) return true
  if (COMPANY.test(name) || SHOP_CAR.test(name)) return true
  if (PET_SERVICE_CATEGORY.test(category)) return true
  return PET_SERVICE_NAME.test(name) && !/카페/.test(name)
}

async function loadRows() {
  const rows = []
  for (let page = 1; page <= 20; page++) { // 관광지 1,306곳 → 100곳씩 14쪽
    const params = new URLSearchParams({ apiKey: apiKey(), locale: 'kr', category: 'c1', page })
    const res = await fetch(`${BASE}?${params}`, { signal: AbortSignal.timeout(TIMEOUT) })
    const json = await res.json()
    if (json.result && json.result !== '00' && json.items == null) throw new Error(`비짓제주 API 오류 ${json.result}`)
    if (!json.items?.length) break
    rows.push(...json.items)
  }
  // 좌표가 없거나(0,0) 제주 밖이면 지도에 못 찍으므로 제외
  return rows
    .filter((r) => r.latitude > 33.0 && r.latitude < 34.1 && r.longitude > 126.0 && r.longitude < 127.2)
    .filter((r) => !isOffTopic(r)) // 관광지에 어울리지 않는 업종 제외
}
const rowsOnce = () => cached('vj-c1-rows', TTL, loadRows, { failTtlMs: 5 * 60_000 })

function toItem(r, group, category) {
  const photo = r.repPhoto?.photoid
  const lat = r.latitude
  const lng = r.longitude
  return {
    id: `vj-${r.contentsid}`,
    name: fixName(r.title), // 앞뒤 공백·따옴표 정리 + 오타 바로잡기
    address: r.roadaddress || r.address || '',
    region: r.region1cd?.label ?? '',
    group,
    group_label: GROUP_LABEL[group],
    category,
    cat3: '',
    lat, lng,
    image: httpsUrl(photo?.thumbnailpath || photo?.imgpath || ''),
    map_url: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
    is_beach: /해수욕장|해변/.test(String(r.title)),
    visit: true,
    near: nearestSite(lat, lng), // 가까운 서핑 장소와 직선거리(km)
  }
}

export async function listFacilities() {
  if (!apiKey()) return []
  return (await rowsOnce()).filter(isFacility).map((r) => ({ ...toItem(r, 'leisure', classify(r.title, r.tag)), facility: true }))
}

/** 레저 시설이 아닌 관광지. usedNames: 이미 목록에 있는 이름들(한국관광공사 등) — 같은 이름은 빼고 더한다 */
export async function listVisitSpots(usedNames = []) {
  if (!apiKey()) return []
  const used = new Set(usedNames.map(normalizeName))
  const seen = new Set()
  return (await rowsOnce())
    .filter((r) => !isFacility(r))
    .filter((r) => {
      const n = normalizeName(r.title)
      if (!n || used.has(n) || seen.has(n)) return false
      seen.add(n)
      return true
    })
    .map((r) => {
      const g = groupOf(r.title, r.tag)
      return toItem(r, g, String(r.tag ?? '').split(',')[0].trim() || GROUP_LABEL[g])
    })
}
