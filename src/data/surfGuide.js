// 제주 서핑 가이드 데이터 — 출처: https://www.betterthansurf.com/JEJU_SURF_GUIDE_KR (설명은 줄여서 옮김)
// 업체는 [이름, 주소, 링크, 종목?]. 링크가 null 이면 링크 없이 이름만, 종목은 서핑 외 종목일 때만 적습니다. (modoo.at 링크·전화번호는 싣지 않음)
export const SOURCE = { label: 'Better Than Surf · 제주 서핑 가이드', url: 'https://www.betterthansurf.com/JEJU_SURF_GUIDE_KR' }

export const SEASON = {
  intro: '서핑은 바람의 영향을 많이 받고 계절마다 다른 파도를 만납니다. 여름에는 남쪽 스웰이 들어오는 서귀포, 겨울에는 북쪽 스웰이 들어오는 제주시 쪽 파도가 좋은 편입니다.',
  water: '수온은 연평균 16.2°C, 8월에는 26.5°C 입니다.',
  wetsuits: [
    ['3-4월', '5mm 웻수트'],
    ['5-6월', '3mm 웻수트'],
    ['7-8월', '수영복 + 덧입을 옷 (티셔츠·반바지·래시가드·워터레깅스 등)'],
    ['9-10월', '3mm 웻수트'],
    ['10-11월', '5mm 웻수트'],
  ],
  camping: '제주 해변의 캠핑장은 성수기(7~8월)를 빼면 대부분 무료입니다. 비수기에는 전기를 쓸 수 없는 곳이 많지만 샤워실·화장실은 잘 관리되어 있습니다.',
}

export const SPOTS = [
  {
    no: 1, name: '이호테우해수욕장', region: '제주시',
    text: '공항에서 가장 가까워 많은 서퍼가 찾는 곳. 겨울에 북쪽 스웰이 들어와 서핑하기 좋고, 목마 등대가 있는 일몰 명소입니다. 입문자부터 중상급자까지 즐길 수 있는 파도가 있습니다.',
    shops: [
      ['키위브라운', '제주시 오도길 4-2', 'https://www.instagram.com/kiwibrownsurf/'],
      ['노리터서핑스쿨', '제주시 현사길 21-2', null],
      ['서프로와', '제주시 테우해안로 132', 'https://www.instagram.com/surfrowa/'],
    ],
  },
  {
    no: 2, name: '곽지해수욕장', region: '제주시',
    text: '서쪽에 있어 하얀 모래와 일몰이 아름다운 곳. 수심이 깊지 않고 모래가 부드러워 입문하기 좋습니다. 해변 언덕에 캠핑장이 있으며 가을·겨울에 좋은 파도가 있습니다.',
    shops: [
      ['제주도서핑 문서프', '제주시 애월읍 곽지7길 1', 'https://www.instagram.com/moonsurf_jeju'],
      ['바구스서핑스쿨이호', '제주시 애월읍 곽지9길 21', 'https://cafe.naver.com/bagussurf'],
      ['파인더웨이브', '제주시 애월읍 일주서로 6079 1,2층', 'https://www.findthewave.co.kr/'],
      ['제주도서핑 비치서프', '제주시 애월읍 곽지3길 20 1층', null],
      ['서프론트', '제주시 애월읍 곽지5길 21 1층', 'https://www.instagram.com/jejusurfront_gwakji/'],
    ],
  },
  {
    no: 3, name: '협재·금능해수욕장', region: '제주시',
    text: '서로 맞붙은 두 해변. 에메랄드빛 바다와 야자수, 비양도가 만드는 이국적인 풍경이 있습니다. 넓은 야영장과 샤워시설·화장실이 있고 일몰이 아름답습니다.',
    shops: [
      ['제주협재서프', '제주시 한림읍 한림로 349-1 1층', 'https://www.instagram.com/hyeopjae_surf'],
      ['금능서핑', '제주시 한림읍 한림로 242', null],
    ],
  },
  {
    no: 4, name: '월령해변', region: '제주시',
    text: '제주 도민이 쉼터로 찾는 작고 한적한 해변. 초보자에게 알맞은 크기의 파도가 있고, 선인장 군락지로 유명합니다. 스탠드업 패들보드(SUP)를 타기에 좋습니다.',
    shops: [
      ['선인장서프', '제주시 한림읍 금능6길 19', 'https://www.instagram.com/suninjang_surf/'],
    ],
  },
  {
    no: 5, name: '월정해수욕장', region: '제주시',
    text: '새하얀 모래와 투명한 에메랄드빛 바다가 이국적인 곳. 가을·겨울에 좋은 파도가 들어오며 수심이 일정한 편입니다. 해안도로 드라이브 코스로도 좋습니다.',
    shops: [
      ['월정퀵서프', '제주시 구좌읍 해맞이해안로 486 1층', 'https://blog.naver.com/hill9008'],
      ['월정서핑스쿨', '제주시 구좌읍 월정7길 28-26', null],
      ['메월서핑', '제주시 구좌읍 월정3길 57 1층 101호', 'https://blog.naver.com/mawolsurf'],
      ['월정서핑랑서프', '제주시 구좌읍 행원로1길 33 지하', 'https://www.instagram.com/rang_surf'],
      ['서프서프', '제주시 구좌읍 해맞이해안로 468 1층', 'https://www.instagram.com/surfsurf_jeju/'],
    ],
  },
  {
    no: 6, name: '함덕·삼양해수욕장', region: '제주시',
    text: '월정처럼 가을·겨울에 좋은 파도를 만날 수 있습니다. 함덕은 해변이 넓고 캠핑 구역이 넓어 캠핑과 서핑을 함께 즐기기 좋고, 삼양은 공항에서 가까워 서핑샵이 많고 초심자에게 알맞은 파도가 들어옵니다.',
    shops: [
      ['플레이서프', '제주시 조천읍 신북로 559', 'https://cafe.naver.com/playsurf'],
      ['범서프', '제주시 선사로8길 11', 'https://www.instagram.com/bumsurf'],
      ['서프앤조이', '제주시 선사로8길 12 1층', 'https://www.instagram.com/jejusurfing_surfnjoy'],
    ],
  },
  {
    no: 7, name: '김녕해수욕장', region: '제주시',
    text: '올레길과 함께하는 야영장이 있고 화장실이 있어 야영객이 많이 찾습니다. 주차장과 야영장이 가까워 장비를 옮기기 편하지만, 그늘이 없는 것이 단점입니다.',
    shops: [
      ['니모스토리 카페', '제주시 구좌읍 김녕로17길 33-1', 'https://nimostory.com/', '패들보드·윈드서핑·스노클링'],
    ],
  },
  {
    no: 8, name: '비양도·우도', region: '제주시',
    text: '우도 안의 비양도는 땅이 울퉁불퉁하지만 캠핑 장소가 따로 마련되어 있습니다. 바람이 심하고 제주에서 다시 배로 이동해야 하는 작은 섬이지만 일출과 현무암 경치가 빼어납니다.',
    shops: [],
  },
  {
    no: 9, name: '중문해수욕장', region: '서귀포시',
    text: '국내 최고의 파도가 들어오는 서퍼들의 천국. 5~10월에 파도가 좋고, 초보자 해변부터 상급자용 리프 포인트까지 있습니다. 절벽을 배경으로 한 풍경이 빼어나며 샤워실 옆에 작은 캠핑장이 있습니다.',
    shops: [
      ['제주서핑스쿨', '서귀포시 중문관광로 192 1층', 'https://www.instagram.com/jejusurfingschool/'],
      ['중문서핑스쿨&샵', '서귀포시 중문관광로 94', 'https://www.instagram.com/jungmunsurfing/'],
      ['제주배럴서핑스쿨', '서귀포시 색달중앙로 60', 'https://www.instagram.com/jeju_barrel_surf'],
      ['서퍼스 립컬 제주점', '서귀포시 중문관광로 305', 'https://www.instagram.com/surfers_jeju'],
      ['코코넛서프 서핑스쿨', '서귀포시 중문관광로 205 1층 1호', 'https://www.instagram.com/coconutsurf_jeju/'],
      ['김서프제주', '서귀포시 중문관광로 97', 'https://www.kimsurf.co.kr/'],
    ],
  },
  {
    no: 10, name: '화순금모래해수욕장', region: '서귀포시',
    text: '마라도·송악산까지 한눈에 들어오는 경치. 데크·개수대·화장실이 있고 담수 풀장은 무료입니다. 그늘이 적어 봄·가을 캠핑에 좋습니다.',
    shops: [],
  },
  {
    no: 11, name: '사계해수욕장', region: '서귀포시',
    text: '중문에 거친 파도가 들어올 때 안정적인 파도가 들어오는 곳. 한적한 해변과 산방산 풍경을 함께 즐길 수 있습니다.',
    shops: [
      ['제주도서핑 비고르서프', '서귀포시 안덕면 형제해안로 70', 'https://www.instagram.com/vigorsurf/'],
    ],
  },
  {
    no: 12, name: '신양해변', region: '서귀포시',
    text: '태풍이 접근해 다른 곳의 파도가 너무 높을 때 롱보드 타기 좋은 깨끗한 파도가 들어옵니다. 1년에 몇 번 안 되는 기회라 타이밍을 맞추기 어렵습니다.',
    shops: [
      ['쥬티윈드서핑클럽', '서귀포시 성산읍 신양로 111', 'https://www.facebook.com/JejuZOOTYClub/?locale=ko_KR', '윈드서핑·패들보드'],
    ],
  },
  {
    no: 13, name: '하도해수욕장', region: '제주시',
    text: '제주시 구좌읍 하도리에 있는 해변이에요.',
    shops: [
      ['라인업서프 하도서핑', '제주시 구좌읍 하도13길 55', 'https://www.instagram.com/lineupsurf_jeju/'],
      ['서프포인트 하도점', '제주시 구좌읍 해맞이해안로 1950', 'https://www.instagram.com/surfpoint__hado/'],
    ],
  },
]
