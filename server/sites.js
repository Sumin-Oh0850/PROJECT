// 제주 해양·항공 레저 장소 목록 (정적 데이터)
//
// - 좌표는 해변/오름 중심부의 '대략적인' 위치입니다. 실제 이용 전 지도에서 확인하세요.
// - facing_deg: 해변이 바다를 바라보는 방향(도). 북쪽=0, 동쪽=90, 남쪽=180, 서쪽=270.
//   바람이 '육지에서 바다로' 부는 오프쇼어(offshore) 여부를 판단하는 데 씁니다.
// - 장소를 추가하려면 SITES 에 한 줄만 넣으면 화면·판정·에이전트에 모두 나타납니다.

export const SITES = [
  // ---------------- 서핑 ----------------
  { id: 'jungmun', name: '중문색달해변', activity: 'surfing', lat: 33.2447, lng: 126.4120, facing_deg: 180,
    note: '제주 대표 서핑 해변. 남쪽 너울이 들어오는 여름철에 파도가 좋음' },
  { id: 'iho', name: '이호테우해변', activity: 'surfing', lat: 33.4977, lng: 126.4530, facing_deg: 330,
    note: '공항에서 가장 가까움. 겨울 북서풍 시즌에 파도가 잘 들어옴' },
  { id: 'gwakji', name: '곽지해변', activity: 'surfing', lat: 33.4505, lng: 126.3048, facing_deg: 300,
    note: '애월 서쪽. 초보 강습이 많음' },
  { id: 'woljeong', name: '월정리해변', activity: 'surfing', lat: 33.5563, lng: 126.7958, facing_deg: 10,
    note: '동쪽 대표 입문 해변. 해녀박물관과 가까움' },
  { id: 'hado', name: '하도해변', activity: 'surfing', lat: 33.5100, lng: 126.8930, facing_deg: 30,
    note: '수심이 얕고 잔잔한 편. 해녀 체험마을과 같은 동네' },

  // 서핑 활동이 알려진 해변 (해변 방향 정보가 없어 facing_deg 는 null → 오프쇼어 안내는 나오지 않음)
  { id: 'hyeopjae', name: '협재해변', activity: 'surfing', lat: 33.3940, lng: 126.2400, facing_deg: null,
    note: '에메랄드빛 바다와 비양도가 보이는 서쪽 해변. 금능해변과 맞붙어 있음' },
  { id: 'geumneung', name: '금능해변', activity: 'surfing', lat: 33.3895, lng: 126.2356, facing_deg: null,
    note: '협재와 이어진 해변. 넓은 야영장과 샤워시설이 있음' },
  { id: 'hamdeok', name: '함덕해변', activity: 'surfing', lat: 33.5432, lng: 126.6699, facing_deg: null,
    note: '넓고 맑은 북동쪽 해변. 가을·겨울에 파도가 좋은 편' },
  { id: 'samyang', name: '삼양해변', activity: 'surfing', lat: 33.5255, lng: 126.5853, facing_deg: null,
    note: '공항에서 가까운 검은모래 해변. 서핑숍이 많고 초심자에게 알맞음' },
  { id: 'sehwa', name: '세화해변', activity: 'surfing', lat: 33.5250, lng: 126.8604, facing_deg: null,
    note: '동쪽 구좌읍의 해변. 월정리·하도와 가까움' },
  { id: 'hwasun', name: '화순금모래해변', activity: 'surfing', lat: 33.2404, lng: 126.3332, facing_deg: null,
    note: '송악산·마라도가 보이는 남쪽 해변. 파도는 계절·너울에 따라 달라짐' },

  // ---------------- 윈드서핑 ----------------
  { id: 'sinyang', name: '신양섭지코지해변', activity: 'windsurfing', lat: 33.4360, lng: 126.9200, facing_deg: 150,
    note: '바람이 꾸준해 윈드서핑·카이트서핑 명소로 알려짐' },
  { id: 'gimnyeong', name: '김녕해변', activity: 'windsurfing', lat: 33.5580, lng: 126.7590, facing_deg: 0,
    note: '넓은 모래사장과 꾸준한 바람' },

  // ---------------- 패러글라이딩 ----------------
  { id: 'geumoreum', name: '금오름 이륙장', activity: 'paragliding', lat: 33.3545, lng: 126.3060, facing_deg: null,
    note: '제주 대표 패러글라이딩 이륙장(한림). 체험은 업체 예약 필요' },
]

export const ACTIVITY_KO = { surfing: '서핑', windsurfing: '윈드서핑', paragliding: '패러글라이딩' }

export function getSite(id) {
  const site = SITES.find((s) => s.id === id)
  if (!site) {
    const err = new Error(`알 수 없는 장소 ID: ${id} (list_sites 로 확인하세요)`)
    err.status = 404
    throw err
  }
  return site
}
