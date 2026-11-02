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
