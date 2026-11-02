// AI 에이전트가 쓰는 도구 모음 (api/agent.js 와 scripts/test-tools.mjs 가 함께 사용)
import { SITES } from './sites.js'
import { getWindGusts, judgeActivity, listSites } from './leisure.js'
import { findNearby, listBeaches } from './nearby.js'
import { searchTour } from './tour.js'
import { getWeather } from './weather.js'

const siteEnum = SITES.map((s) => s.id)
const siteProp = { type: 'string', enum: siteEnum, description: `장소 ID. ${SITES.map((s) => `${s.id}=${s.name}`).join(', ')}` }

// ① 도구 설명서: Claude는 이 설명만 보고 "어떤 도구를 언제 쓸지" 결정한다
export const tools = [
  {
    name: 'list_sites',
    description: '제주의 서핑·윈드서핑·패러글라이딩 장소 목록(ID, 이름, 좌표, 설명)을 조회한다. 장소 ID를 모를 때 먼저 쓴다',
    input_schema: {
      type: 'object',
      properties: { activity: { type: 'string', enum: ['surfing', 'windsurfing', 'paragliding'], description: '생략하면 전체' } },
    },
  },
  {
    name: 'get_wind_gusts',
    description: '장소의 지금 풍속·돌풍·돌풍 편차·풍향·오프쇼어 여부·파도·수온·기온·강수를 조회한다 (단위 m/s, m)',
    input_schema: { type: 'object', properties: { site: siteProp }, required: ['site'] },
  },
  {
    name: 'judge_activity',
    description: '장소의 지금 조건으로 활동을 해도 되는지 가능/주의/위험으로 판정하고 이유와 팁을 준다. "탈 수 있어?" 같은 질문에는 반드시 이 도구를 쓴다',
    input_schema: { type: 'object', properties: { site: siteProp }, required: ['site'] },
  },
  {
    name: 'find_nearby',
    description: '장소 주변의 맛집·카페·관광지(한국관광공사)나 공용 샤워실(OpenStreetMap)을 가까운 순으로 찾는다',
    input_schema: {
      type: 'object',
      properties: {
        site: siteProp,
        kind: { type: 'string', enum: ['restaurant', 'cafe', 'attraction', 'shower'], description: 'restaurant 맛집, cafe 카페, attraction 관광지, shower 공용 샤워실' },
      },
      required: ['site', 'kind'],
    },
  },
  {
    name: 'list_beaches',
    description: '한국관광공사 TourAPI에 등록된 제주 해변·해수욕장 목록을 조회한다',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_weather',
    description: '기상청 단기예보로 제주시/서귀포시의 앞으로 몇 시간 기온·하늘·강수확률을 조회한다 (바람은 get_wind_gusts 를 쓴다)',
    input_schema: {
      type: 'object',
      properties: { place: { type: 'string', enum: ['제주시', '서귀포시'] } },
      required: ['place'],
    },
  },
  {
    name: 'search_tour_places',
    description: '한국관광공사 TourAPI로 제주의 관광지·레포츠·음식점·문화시설·축제를 키워드로 검색한다',
    input_schema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: '검색어 (예: 오름, 올레)' },
        contentTypeId: { type: 'string', description: '12 관광지, 28 레포츠, 39 음식점, 14 문화시설, 15 축제·행사' },
      },
    },
  },
]

// ② 도구 이름 → 실제 실행할 함수
export const runTool = {
  list_sites: (input) => listSites({ activity: input.activity }),
  get_wind_gusts: (input) => getWindGusts({ site: input.site }),
  judge_activity: (input) => judgeActivity({ site: input.site }), // 조건값은 모델이 지어내지 못하게 넘기지 않음
  find_nearby: (input) => findNearby({ site: input.site, kind: input.kind }),
  list_beaches: () => listBeaches(),
  get_weather: (input) => getWeather({ place: input.place }),
  search_tour_places: (input) => searchTour({ keyword: input.keyword, contentTypeId: input.contentTypeId }),
}

// 화면에 "에이전트가 무엇을 했는지" 보여줄 때 쓰는 결과 개수
export function countResult(result) {
  if (Array.isArray(result)) return result.length
  if (Array.isArray(result?.items)) return result.items.length
  return result ? 1 : 0
}
