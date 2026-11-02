# 🏄 제주 서핑·레저 가이드

제주의 **서핑 · 윈드서핑 · 패러글라이딩** 장소별 **풍속·돌풍·파고**를 보고 지금 해도 되는지 **가능 / 주의 / 불가**로 알려 주고,
주변 **맛집 · 카페 · 공용 샤워실 · 관광지**와 **제주 지도**를 함께 보여 주는 웹 서비스입니다.
(Vite + React + Router + Zustand + Bootstrap + Supabase, 서버 함수는 `api/`)

> ⚠️ 판정 기준은 초보자 기준의 **학습·참고용 예시값**입니다. 실제 활동 전에는 기상특보와 현장 강사·업체의 안내를 따르세요.

## 실행
```bash
npm install
cp .env.example .env.local     # 값 채우기 (Windows: copy .env.example .env.local)
npm run dev                    # 화면 + /api 서버 함수 (http://localhost:5173)
```
`npm run dev` 만으로 `/api` 가 동작합니다. (개발용 플러그인 `dev/api-plugin.js` — Vercel 로그인·CLI 불필요, 배포에는 쓰이지 않음)
배포와 똑같이 실행하려면 `vercel dev` 를 쓸 수도 있습니다.

### 환경 변수 (`.env.local`)
| 이름 | 용도 | 없으면 |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | 즐겨찾기 저장 (브라우저용, 공개돼도 되는 값) | 즐겨찾기만 안 됨 |
| `DATA_GO_KR_KEY` (또는 `TOUR_API_KEY`) | 한국관광공사·기상청 (공공데이터포털 Decoding 키, 서버 전용) | 주변 맛집·카페·관광지·해변·예보가 "정보 없음" |
| `ANTHROPIC_API_KEY` | AI 가이드 (서버 전용) | AI 가이드에 안내 문구 표시 |

`VITE_` 가 붙은 값만 브라우저에 들어갑니다. **서버 키에는 절대 `VITE_` 를 붙이지 마세요.** 바람·파고(Open-Meteo)는 키가 필요 없습니다.

## 화면
| 주소 | 내용 |
|---|---|
| `/` | 소개 · **지금 현황**(가능/주의/불가 개수와 장소별 한 줄) · 동작 체크(React·Supabase·/api) · 닉네임 |
| `/sites` | **장소·판정** 목록. 서핑 / 윈드서핑 / 패러글라이딩 필터, 장소별 풍속·돌풍·파고와 판정 이유, 즐겨찾기 |
| `/sites/:id` | **상세**: 판정과 이유·팁, 조건값 8가지, 오프쇼어 여부, 주변 정보 탭(맛집·카페·샤워실·관광지) |
| `/map` | **제주 지도**(Leaflet + OpenStreetMap). 마커 색 = 판정, 팝업에서 상세로 이동 |
| `/places` | **관광지·해변**: 제주 해변 목록과 관광지 키워드 검색 |
| `/agent` | **AI 가이드**: 아래 도구로 확인해서 답하는 에이전트 |
| `/my` | **내 즐겨찾기**: 닉네임별 Supabase 저장, 삭제 |

## 도구 (서버 함수 = 에이전트 도구)
| 도구 | 입력 | 출력 | 데이터 | API 주소 |
|---|---|---|---|---|
| `list_sites` | activity(생략하면 전체) | 장소 ID·이름·좌표·해변 방향·설명 | `server/sites.js` | `/api/sites` |
| `get_wind_gusts` | site | 풍속·돌풍·돌풍 편차·풍향·오프쇼어·파고·수온·기온·강수 | Open-Meteo (키 불필요) | `/api/wind` |
| `judge_activity` | site | `status`(가능/주의/불가)·이유·팁·사용한 조건값 | 아래 판정 기준 | `/api/judge` |
| `find_nearby` | site, kind(`restaurant`·`cafe`·`attraction`·`shower`) | 가까운 순 장소 목록, 출처, 안내 문구 | TourAPI · OpenStreetMap | `/api/nearby` |
| `list_beaches` | – | 제주 해변 목록 | TourAPI | `/api/beaches` |
| `get_weather` | place(제주시/서귀포시) | 기상청 단기예보 | 기상청 | `/api/weather` |
| `search_tour_places` | keyword, contentTypeId | 관광지 등 검색 | TourAPI | `/api/tour` |

### 판정 기준 (`server/leisure.js` 의 `RULES`)
단위: 풍속·돌풍 m/s, 파고 m. **불가 → 주의 → 가능** 순으로 검사해 처음 걸리는 단계가 결과이고, 뇌우(천둥·번개)가 있으면 모든 활동이 **불가**입니다.

| 활동 | 불가 | 주의 |
|---|---|---|
| 서핑 | 풍속 ≥ 11 · 돌풍 ≥ 14 · 파고 ≥ 3.0 | 풍속 ≥ 7 · 돌풍 ≥ 10 · 파고 ≥ 2.0 · 파고 < 0.3 |
| 윈드서핑 | 풍속 ≥ 14 · 돌풍 ≥ 17 | 풍속 ≥ 10 · 돌풍 ≥ 13 · 돌풍 편차 ≥ 5 · 풍속 < 3 |
| 패러글라이딩 | 풍속 ≥ 8 · 돌풍 ≥ 10 · 돌풍 편차 ≥ 5 · 강수 > 0.5mm | 풍속 ≥ 5.5 · 돌풍 ≥ 8 · 돌풍 편차 ≥ 3.5 |

돌풍 편차 = 돌풍 − 평균 풍속(0 미만이면 0). 서핑은 바람이 육지→바다로 부는 **오프쇼어**일 때 팁이 붙습니다.

## 외부 서버가 실패해도 멈추지 않아요
- **바람·파고**: Open-Meteo 호출이 실패하면 연습용 **샘플 값**(`source: "sample"`)을 쓰고, 화면에 노란 안내가 나옵니다.
- **맛집·카페·관광지·해변**: 키가 없거나 서버가 응답하지 않으면 가짜 데이터 대신 `source: "unavailable"` 과 이유 문구를 돌려줍니다.
- **공용 샤워실**(OpenStreetMap Overpass): 제한시간 8초. 이 서버는 네트워크에 따라 응답하지 않을 수 있고, 한국은 등록 데이터가 적습니다. 공용 샤워장은 보통 여름 개장 기간에만 운영되니 그 외에는 서핑숍 샤워실을 확인하세요.
- 같은 요청은 메모리에 캐시합니다 (바람·파고 10분, 주변 정보 30분).

## 시험·점검
| 명령 | 내용 |
|---|---|
| `npm run test:judge` | 장소 목록·판정 기준 38가지를 조건값을 직접 넣어 확인 (인터넷 불필요) |
| `npm run test:tools` | 에이전트 도구 7개를 실제로 실행해 연결 확인 (인터넷 필요, Claude 키 불필요) |
| `npm run check:supabase [-- --write]` | Supabase 연결 점검 (`--write` 는 임시 행 저장·삭제까지) |
| `npm run lint` | 코드 점검 (스타터에서 온 "효과 안 setState" 경고는 동작에 영향 없음) |

## 구조
```
api/        서버 함수 (/api/파일이름) — 비밀 키는 여기서만
server/     외부 API 호출·판정 로직 (api/ 와 에이전트가 함께 사용)
  sites.js        장소 목록          leisure.js   바람·판정 도구     nearby.js   주변 정보·해변
  cache.js        메모리 캐시        agent-tools.js 에이전트 도구 정의
src/
  main.jsx · router.jsx · layouts/ · store/(Zustand) · lib/(supabase, format) · api/client.js
  pages/       Home Sites SiteDetail MapPage Places Agent My
  components/  SiteCard StatusBadge SiteMap NearbyPanel ItemCard …
dev/api-plugin.js   npm run dev 용 /api 서버
supabase/favorites.sql   즐겨찾기 테이블 (SQL Editor 에서 한 번 실행)
scripts/    test-judge · test-tools · check-supabase
legacy/     스타터 적용 전의 이전 작업(Python 도구 등)을 그대로 보관
```

## 장소 추가
`server/sites.js` 의 `SITES` 에 한 줄만 넣으면 목록·판정·지도·에이전트에 모두 나타납니다. (`facing_deg` 는 해변이 바다를 바라보는 방향, 북 0 · 동 90 · 남 180 · 서 270)

## 디자인 바꾸기
`src/main.jsx` 의 `bootswatch/dist/minty/...` 에서 `minty` 를 `lux`, `flatly`, `cosmo` 등으로 바꾸면 전체 디자인이 바뀝니다. (https://bootswatch.com)

## 단계별 확인 현황
| 단계 | 내용 | 상태 |
|---|---|---|
| 0~1 | React · 라우터 · Bootstrap · Zustand · 서버 함수 `/api` | ✅ |
| 2~4 | 관광(TourAPI) · 날씨(기상청) | ✅ |
| 5 | Supabase 즐겨찾기 (저장 · 목록 · 중복 안내 · 삭제) | ✅ |
| A | `list_sites` · `get_wind_gusts` · `judge_activity` (시험 38개, 실제 Open-Meteo 확인) | ✅ |
| B | 장소·판정 목록, 상세, 홈 현황, 즐겨찾기 연결 | ✅ |
| C | 제주 지도 (판정 색 마커) | ✅ |
| D | 맛집·카페·관광지·해변 (TourAPI) / 공용 샤워실 (OSM, 응답 없으면 안내) | ✅ |
| E | AI 가이드 도구 7개 연결 (`test:tools` 통과) | ✅ 도구 / ⏳ 실제 대화는 `ANTHROPIC_API_KEY` 필요 |
