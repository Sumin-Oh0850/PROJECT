// 즐겨찾기에 이미지·분류·주소가 붙는지 시험:  npm run test:favorites
// 실제 관광지 목록(TourAPI)과 레저 장소로, 저장되는 값(source · item_id · title)만 가지고 화면용 정보를 만들어 봅니다.
import { existsSync, readFileSync } from 'node:fs'

for (const file of ['.env', '.env.local']) {
  if (!existsSync(file)) continue
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const { enrichFavorite } = await import('../src/lib/favorites.js')
const { httpsUrl, listSpots } = await import('../server/spots.js')
const { listSites } = await import('../server/leisure.js')

let failed = 0
const ok = (cond, text) => {
  if (!cond) failed++
  console.log(`${cond ? '✅' : '❌'} ${text}`)
}

console.log('── 이미지 주소 ──')
ok(httpsUrl('http://tong.visitkorea.or.kr/a.jpg') === 'https://tong.visitkorea.or.kr/a.jpg', 'http:// 주소는 https:// 로 바뀜')
ok(httpsUrl('https://x.kr/a.jpg') === 'https://x.kr/a.jpg', '이미 https 면 그대로')
ok(httpsUrl('') === '' && httpsUrl(undefined) === '', '주소가 없으면 빈 문자열')

const spots = await listSpots({ n: 100 })
const sites = listSites()
const lookup = {
  spotById: new Map(spots.items.map((s) => [String(s.id), s])),
  siteById: new Map(sites.map((s) => [s.id, s])),
}

console.log('── 즐겨찾기 정보 붙이기 ──')
if (spots.source !== 'tourapi') {
  console.log(`⚠️ TourAPI 를 쓸 수 없어 관광지 시험은 건너뜀 (${spots.note})`)
} else {
  ok(spots.items.every((s) => s.image.startsWith('https://')), `관광지 ${spots.items.length}곳의 이미지가 모두 https://`)

  // 화면은 favorites 행(source, item_id, title)만 가지고 있다. item_id 는 문자열로 저장됨
  const tour = spots.items.find((s) => !s.is_beach)
  const a = enrichFavorite({ source: 'tour', item_id: String(tour.id), title: tour.name }, lookup)
  ok(a.image === tour.image && a.image.startsWith('https://'), `관광지 즐겨찾기(${tour.name}): 이미지 ${a.image ? '있음' : '없음'}`)
  ok(a.lines.length === 2 && a.lines[0].includes(tour.region), `분류·주소 줄: ${a.lines.join(' / ')}`)

  const beach = spots.items.find((s) => s.is_beach)
  const b = enrichFavorite({ source: 'beach', item_id: String(beach.id), title: beach.name }, lookup)
  ok(b.image === beach.image && b.image !== '', `해변 즐겨찾기(${beach.name}): 이미지 있음`)

  const allWithImage = spots.items.every((s) => enrichFavorite({ source: 'tour', item_id: String(s.id), title: s.name }, lookup).image)
  ok(allWithImage, '저장할 수 있는 관광지 100곳 모두 이미지가 붙음')
}

const site = enrichFavorite({ source: 'site', item_id: 'jungmun', title: '중문색달해변' }, lookup)
ok(site.image === '' && site.icon === 'water' && site.lines[0] === '서핑', `레저 장소(서핑): 사진 대신 아이콘 ${site.icon}, 설명 ${site.lines[0]}`)
const para = enrichFavorite({ source: 'site', item_id: 'geumoreum', title: '금오름 이륙장' }, lookup)
ok(para.icon === 'airplane', `패러글라이딩 장소는 아이콘 ${para.icon}`)

console.log('── 원본에서 못 찾는 경우(목록이 바뀐 뒤 등) ──')
const gone = enrichFavorite({ source: 'tour', item_id: '999999999', title: '사라진 곳' }, lookup)
ok(gone.image === '' && gone.lines.length === 0 && gone.icon === 'image', '관광지를 못 찾아도 오류 없이 기본 아이콘')
const goneSite = enrichFavorite({ source: 'site', item_id: 'nowhere', title: '없는 장소' }, lookup)
ok(goneSite.image === '' && goneSite.lines.length === 0, '레저 장소를 못 찾아도 오류 없이 기본값')
const empty = enrichFavorite({ source: 'tour', item_id: '1', title: 'x' }, { spotById: new Map(), siteById: new Map() })
ok(empty.image === '', '목록을 아직 못 불러온 상태에서도 오류 없음')

console.log(failed ? `\n❌ ${failed}개 실패` : '\n✅ 모두 통과')
process.exit(failed ? 1 : 0)
