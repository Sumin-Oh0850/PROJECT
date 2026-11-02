import { ACTIVITY_ICON } from './format.js' // 확장자를 적어야 Node(시험 스크립트)에서도 읽힙니다

// favorites 테이블에는 source · item_id · title 만 저장됩니다.
// 그래서 즐겨찾기를 보여 줄 때, 원본 목록(관광지 /api/spots, 레저 장소 /api/sites)에서 같은 번호를 찾아
// 이미지·분류·주소를 붙입니다. 원본에서 못 찾아도(목록이 바뀐 경우 등) 이름과 기본 아이콘으로 보여 줍니다.
//
//  lookup: { spotById: Map(id → 관광지), siteById: Map(id → 레저 장소) }
//  반환:   { image, icon, lines: [보조 설명 줄] }
export function enrichFavorite(fav, { spotById, siteById }) {
  if (fav.source === 'site') {
    const site = siteById.get(fav.item_id)
    return {
      image: '', // 레저 장소는 사진 자료가 없어서, 활동 종류 아이콘으로 보여 줌
      icon: ACTIVITY_ICON[site?.activity] ?? 'water',
      lines: site ? [site.activity_ko, site.note] : [],
    }
  }

  // tour(관광지) · beach(해변): 둘 다 관광지 목록에서 찾음
  const spot = spotById.get(String(fav.item_id))
  return {
    image: spot?.image ?? '',
    icon: fav.source === 'beach' ? 'sun' : 'image',
    lines: spot ? [`${spot.region} · ${spot.category}`, spot.address] : [],
  }
}
