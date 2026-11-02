"""
제주 해양·항공 레저 도구 모음 (대주제: 서핑)

핵심 도구
  list_sites(activity)         : 서핑·윈드서핑·패러글라이딩 장소 목록
  get_wind_gusts(site_id)      : 풍속·돌풍·풍향 + 파고·수온
  judge_activity(site_id)      : 가능 / 주의 / 불가 판정과 이유

부가 도구 (주변 정보)
  get_weather, list_beaches, find_restaurants, find_cafes,   (TourAPI)
  find_showers (OSM Overpass), find_attractions, map_link (OSM)

⚠ 판정 기준은 학습·참고용 예시입니다. 실제 활동 전에는 반드시
  기상특보, 현장 강사·업체의 판단을 따르세요.
"""

import api_clients as api
from sites import SITES, ACTIVITY_KO


def _get_site(site_id: str) -> dict:
    for s in SITES:
        if s["id"] == site_id:
            return s
    raise ValueError(f"알 수 없는 장소 ID: {site_id}  (list_sites()로 확인하세요)")


# =================================================================
# 핵심 도구 1. list_sites
# =================================================================
def list_sites(activity: str | None = None) -> list:
    """activity: 'surfing' | 'windsurfing' | 'paragliding' | None(전체)"""
    return [s for s in SITES if activity is None or s["activity"] == activity]


# =================================================================
# 핵심 도구 2. get_wind_gusts
# =================================================================
def get_wind_gusts(site_id: str) -> dict:
    site = _get_site(site_id)
    data = api.fetch_wind_weather(site["lat"], site["lng"])
    if site["activity"] != "paragliding":          # 바다 활동이면 파도 정보도 함께
        data.update({k: v for k, v in api.fetch_marine(site["lat"], site["lng"]).items()
                     if k != "source"})
    data["gust_spread_ms"] = round(data["gust_ms"] - data["wind_ms"], 1)  # 돌풍 편차
    data["offshore"] = _is_offshore(site.get("facing_deg"), data["wind_dir_deg"])
    data["site"] = site["name"]
    return data


def _is_offshore(facing_deg, wind_from_deg):
    """바람이 육지 → 바다로 불면 True (서핑에 유리). facing 정보가 없으면 None."""
    if facing_deg is None or wind_from_deg is None:
        return None
    land_side = (facing_deg + 180) % 360           # 해변 뒤쪽(육지) 방향
    diff = abs((wind_from_deg - land_side + 180) % 360 - 180)
    return diff <= 60


# =================================================================
# 핵심 도구 3. judge_activity
# =================================================================
# 활동별 기준 (m/s, m). 초보자 기준의 보수적인 예시값입니다.
RULES = {
    "surfing": {
        "불가": [("wind_ms", ">=", 11, "풍속 11m/s 이상"),
                 ("gust_ms", ">=", 14, "돌풍 14m/s 이상"),
                 ("wave_m", ">=", 3.0, "파고 3m 이상 (초보 위험)")],
        "주의": [("wind_ms", ">=", 7, "풍속 7m/s 이상, 파도가 거칠어짐"),
                 ("gust_ms", ">=", 10, "돌풍 10m/s 이상"),
                 ("wave_m", ">=", 2.0, "파고 2m 이상 (중급 이상 권장)"),
                 ("wave_m", "<", 0.3, "파도가 거의 없음 (연습만 가능)")],
    },
    "windsurfing": {
        "불가": [("wind_ms", ">=", 14, "풍속 14m/s 이상"),
                 ("gust_ms", ">=", 17, "돌풍 17m/s 이상")],
        "주의": [("wind_ms", ">=", 10, "풍속 10m/s 이상 (숙련자 위주)"),
                 ("gust_ms", ">=", 13, "돌풍 13m/s 이상"),
                 ("gust_spread_ms", ">=", 5, "바람 세기 변화가 큼"),
                 ("wind_ms", "<", 3, "바람 부족 (초보 연습만 가능)")],
    },
    "paragliding": {
        "불가": [("wind_ms", ">=", 8, "풍속 8m/s 이상"),
                 ("gust_ms", ">=", 10, "돌풍 10m/s 이상"),
                 ("gust_spread_ms", ">=", 5, "돌풍 편차 5m/s 이상 (난기류 위험)"),
                 ("precip_mm", ">", 0.5, "강수")],
        "주의": [("wind_ms", ">=", 5.5, "풍속 5.5m/s 이상"),
                 ("gust_ms", ">=", 8, "돌풍 8m/s 이상"),
                 ("gust_spread_ms", ">=", 3.5, "돌풍 편차 3.5m/s 이상")],
    },
}
THUNDER_CODES = {95, 96, 99}   # Open-Meteo(WMO) 뇌우 코드


def _check(value, op, limit):
    if value is None:
        return False
    return {">=": value >= limit, ">": value > limit, "<": value < limit}[op]


def judge_activity(site_id: str, conditions: dict | None = None) -> dict:
    """conditions를 주지 않으면 get_wind_gusts()로 직접 조회합니다."""
    site = _get_site(site_id)
    c = conditions or get_wind_gusts(site_id)
    rules = RULES[site["activity"]]

    if c.get("weather_code") in THUNDER_CODES:
        status, reasons = "불가", ["뇌우(천둥·번개)"]
    else:
        status, reasons = "가능", []
        for level in ("불가", "주의"):
            hits = [msg for key, op, lim, msg in rules[level] if _check(c.get(key), op, lim)]
            if hits:
                status, reasons = level, hits
                break

    tips = []
    if site["activity"] == "surfing" and c.get("offshore"):
        tips.append("오프쇼어 바람: 파도 면이 깔끔해 서핑에 유리")
    if site["activity"] == "surfing" and c.get("offshore") is False and status == "가능":
        tips.append("온쇼어 바람: 파도가 흐트러질 수 있음")

    return {
        "site": site["name"],
        "activity": ACTIVITY_KO[site["activity"]],
        "status": status,
        "reasons": reasons or ["기준 내 양호"],
        "tips": tips,
        "conditions": {k: c.get(k) for k in
                       ("wind_ms", "gust_ms", "gust_spread_ms", "wind_dir_deg",
                        "wave_m", "sea_temp_c", "precip_mm", "source")},
    }


# =================================================================
# 부가 도구 (지도 · 날씨 · 해변 · 맛집 · 카페 · 공용샤워실 · 관광지)
# =================================================================
def get_weather(site_id: str) -> dict:
    s = _get_site(site_id)
    return api.fetch_wind_weather(s["lat"], s["lng"])


def list_beaches() -> list:
    """TourAPI로 제주 해수욕장 검색"""
    return api.tour_search("해수욕장")


def find_restaurants(site_id: str, radius=3000) -> list:
    s = _get_site(site_id)
    return api.tour_nearby(s["lat"], s["lng"], "restaurant", radius)


def find_cafes(site_id: str, radius=3000) -> list:
    s = _get_site(site_id)
    return api.tour_nearby(s["lat"], s["lng"], "cafe", radius)


def find_attractions(site_id: str, radius=5000) -> list:
    s = _get_site(site_id)
    return api.tour_nearby(s["lat"], s["lng"], "attraction", radius)


def find_showers(site_id: str, radius=3000) -> list:
    """OpenStreetMap에 등록된 샤워장(amenity=shower) 검색.
    해수욕장 공용 샤워장은 주로 여름 개장 기간에만 운영되고,
    그 외 기간에는 서핑숍 샤워실(강습·대여 고객용)을 이용하는 경우가 많습니다."""
    s = _get_site(site_id)
    return api.osm_showers(s["lat"], s["lng"], radius)


def map_link(site_id: str) -> str:
    """OpenStreetMap에서 바로 열리는 링크 (키 불필요)"""
    s = _get_site(site_id)
    return (f"https://www.openstreetmap.org/?mlat={s['lat']}&mlon={s['lng']}"
            f"#map=15/{s['lat']}/{s['lng']}")
