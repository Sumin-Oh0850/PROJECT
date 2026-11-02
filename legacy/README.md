# 제주 레저 활동 도구 (서핑 · 윈드서핑 · 패러글라이딩)

장소별 **풍속·돌풍·파고**를 조회해 **가능 / 주의 / 불가**를 판정하고, 주변 맛집·카페·샤워장·관광지와 제주 지도를 함께 보여줍니다. 설계 내용은 `DESIGN.md`를 보세요.

## 파일 구성

| 파일 | 역할 |
|---|---|
| `sites.py` | 장소 목록 (좌표, 해변 방향) |
| `api_clients.py` | 외부 API 호출 + 샘플 데이터 |
| `tools.py` | 도구: `list_sites`, `get_wind_gusts`, `judge_activity` 외 부가 도구 |
| `map_view.py` | 판정 결과를 지도 HTML로 저장 |
| `main.py` | 전체 실행 데모 |

## 1. 설치 (Python 3.10 이상)

```bash
pip install -r requirements.txt
```

## 2. 실행

```bash
python main.py
```

- **키 없이도 바로 실행됩니다.** 바람·파도·날씨는 무료 API(Open-Meteo)라 실제 값이 나옵니다.
- 맛집·카페·샤워장·관광지·해변은 키를 넣기 전까지 `[샘플]` 데이터로 나옵니다.
- 실행 후 생긴 `jeju_activity_map.html`을 더블클릭하면 판정 결과가 색깔 마커로 표시된 제주 지도가 열립니다.

## 3. API 키 넣기 (선택)

1. `.env.example`을 복사해 이름을 `.env`로 바꿉니다.
2. 키를 붙여 넣습니다.

| 키 | 발급처 | 쓰이는 곳 |
|---|---|---|
| `TOUR_API_KEY` | [공공데이터포털](https://www.data.go.kr)에서 "한국관광공사 국문 관광정보 서비스" 활용신청 → 일반 인증키(Decoding) | 제주 해수욕장, 맛집, 카페, 관광지 |

## 4. 도구만 따로 써보기

```python
from tools import list_sites, get_wind_gusts, judge_activity, find_cafes

print(list_sites("paragliding"))       # 패러글라이딩 장소
print(get_wind_gusts("iho"))           # 이호테우 바람·파도
print(judge_activity("jungmun"))       # 중문 서핑 판정
print(find_cafes("woljeong"))          # 월정리 주변 카페

# 조건값을 직접 넣어 판정 기준 실험하기
print(judge_activity("geumoreum", {"wind_ms": 6, "gust_ms": 11, "gust_spread_ms": 5}))
```

## 5. 성공 확인

- 터미널에 장소 8곳의 풍속·돌풍·파고와 🟢 가능 / 🟡 주의 / 🔴 불가가 표로 나온다.
- 지도 파일에 마커가 색깔별로 보이고, 마커를 누르면 판정 이유와 OpenStreetMap 링크가 나온다.
- 맨 위에 "샘플 데이터입니다"라는 안내가 나오면 인터넷 연결을 확인한다. 회사·학교망에서는 외부 API가 막혀 있을 수 있다.

## 6. 자주 나는 오류

| 증상 | 확인할 것 |
|---|---|
| `ModuleNotFoundError: requests` | `pip install -r requirements.txt` 실행 |
| 샤워장이 "검색 결과 없음" | 정상일 수 있음. 한국은 OpenStreetMap 샤워장 등록이 적어 서핑숍 샤워실을 따로 확인 |
| TourAPI 결과가 계속 `[샘플]` | Decoding 키를 넣었는지, 활용신청 승인 후 1시간 정도 지났는지 |
| 지도에 마커만 있고 배경이 안 보임 | 인터넷 연결 (지도 타일을 온라인으로 불러옴) |

> 판정 결과는 학습·참고용입니다. 실제 활동 전에는 기상특보와 현장 강사·업체의 안내를 따르세요.
