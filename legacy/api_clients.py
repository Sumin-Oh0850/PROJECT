"""
외부 API 호출 모음

| 데이터            | 사용 API                         | 키 필요 |
|-------------------|----------------------------------|---------|
| 풍속·돌풍·날씨    | Open-Meteo Forecast              | 불필요  |
| 파고·수온         | Open-Meteo Marine                | 불필요  |
| 맛집·카페·관광지  | TourAPI 위치기반 조회             | 필요    |
|                   | (KorService2/locationBasedList2)  | (공공데이터포털 키) |
| 공용샤워실        | OpenStreetMap Overpass API        | 불필요  |
| 해변 목록         | TourAPI 키워드 검색               | 필요    |

키가 없거나 인터넷 호출이 실패하면, 프로그램이 멈추지 않도록
'샘플 데이터'를 돌려줍니다. 결과에 source="sample" 로 표시됩니다.
"""

import os
import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# 공공데이터포털 '일반 인증키(Decoding)'. TOUR_API_KEY가 비어 있으면 공통키를 씁니다.
TOUR_API_KEY = os.getenv("TOUR_API_KEY") or os.getenv("DATA_GO_KR_KEY", "")
TOUR_BASE = "https://apis.data.go.kr/B551011/KorService2"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
TIMEOUT = 10
_OFFLINE = False   # 한 번 연결에 실패하면 이후 호출은 바로 샘플로 (대기 시간 단축)


def _get_json(url, **kw):
    global _OFFLINE
    if _OFFLINE:
        raise ConnectionError("offline")
    try:
        method = kw.pop("method", "get")
        r = requests.request(method, url, timeout=TIMEOUT, **kw)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        _OFFLINE = True
        raise


# ---------------------------------------------------------------
# 1. 날씨 · 풍속 · 돌풍 (Open-Meteo, 키 불필요)
# ---------------------------------------------------------------
def fetch_wind_weather(lat: float, lng: float) -> dict:
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat, "longitude": lng,
        "current": "temperature_2m,precipitation,weather_code,"
                   "wind_speed_10m,wind_gusts_10m,wind_direction_10m",
        "wind_speed_unit": "ms",          # 풍속 단위: m/s
        "timezone": "Asia/Seoul",
    }
    try:
        cur = _get_json(url, params=params)["current"]
        return {
            "source": "open-meteo",
            "time": cur["time"],
            "temp_c": cur["temperature_2m"],
            "precip_mm": cur["precipitation"],
            "weather_code": cur["weather_code"],
            "wind_ms": cur["wind_speed_10m"],
            "gust_ms": cur["wind_gusts_10m"],
            "wind_dir_deg": cur["wind_direction_10m"],
        }
    except Exception as e:
        return _sample_wind(lat, lng, reason=str(e))


# ---------------------------------------------------------------
# 2. 파고 · 수온 (Open-Meteo Marine, 키 불필요)
# ---------------------------------------------------------------
def fetch_marine(lat: float, lng: float) -> dict:
    url = "https://marine-api.open-meteo.com/v1/marine"
    params = {
        "latitude": lat, "longitude": lng,
        "current": "wave_height,wave_period,wave_direction,sea_surface_temperature",
        "timezone": "Asia/Seoul",
    }
    try:
        cur = _get_json(url, params=params)["current"]
        return {
            "source": "open-meteo-marine",
            "wave_m": cur["wave_height"],
            "wave_period_s": cur["wave_period"],
            "sea_temp_c": cur["sea_surface_temperature"],
        }
    except Exception as e:
        return _sample_marine(lat, lng, reason=str(e))


# ---------------------------------------------------------------
# 3. 주변 장소 검색 (한국관광공사 TourAPI 위치기반 조회)
#    contentTypeId: 12=관광지, 39=음식점(카페 포함), 28=레포츠
#    카페는 음식점 중 세부분류(cat3)가 A05020900(카페/전통찻집)인 것
# ---------------------------------------------------------------
CAFE_CAT3 = "A05020900"


def tour_nearby(lat, lng, kind, radius=3000, size=5) -> list:
    """kind: 'restaurant' | 'cafe' | 'attraction' | 'leports'"""
    if not TOUR_API_KEY:
        return _sample_places(kind)
    type_id = {"restaurant": 39, "cafe": 39, "attraction": 12, "leports": 28}[kind]
    params = {"serviceKey": TOUR_API_KEY, "MobileOS": "ETC", "MobileApp": "JejuActivity",
              "_type": "json", "mapX": lng, "mapY": lat, "radius": min(radius, 20000),
              "contentTypeId": type_id, "arrange": "E",       # E = 거리순
              "numOfRows": 50 if type_id == 39 else size}
    try:
        items = _tour_items(_get_json(f"{TOUR_BASE}/locationBasedList2", params=params))
        if kind == "cafe":
            items = [i for i in items if i.get("cat3") == CAFE_CAT3]
        elif kind == "restaurant":
            items = [i for i in items if i.get("cat3") != CAFE_CAT3]
        return [_tour_row(i) for i in items[:size]]
    except Exception:
        return _sample_places(kind)


def _tour_items(js):
    items = js["response"]["body"]["items"]
    if not items:                       # 결과가 없으면 빈 문자열이 옴
        return []
    items = items["item"]
    return items if isinstance(items, list) else [items]


def _tour_row(i):
    return {"source": "tourapi", "name": i["title"], "address": i.get("addr1", ""),
            "phone": i.get("tel", ""),
            "distance_m": int(float(i["dist"])) if i.get("dist") else None,
            "lat": float(i["mapy"]), "lng": float(i["mapx"]),
            "image": i.get("firstimage", ""), "url": ""}


# ---------------------------------------------------------------
# 3-1. 공용샤워실 (OpenStreetMap Overpass API, 키 불필요)
#      OSM 태그 amenity=shower 를 반경 안에서 찾습니다.
#      ※ 한국은 OSM 등록 데이터가 적어 결과가 없을 수 있습니다.
# ---------------------------------------------------------------
def osm_showers(lat, lng, radius=3000, size=5) -> list:
    query = f"""
    [out:json][timeout:25];
    (node["amenity"="shower"](around:{radius},{lat},{lng});
     way["amenity"="shower"](around:{radius},{lat},{lng}););
    out center {size * 2};
    """
    try:
        els = _get_json(OVERPASS_URL, method="post", data={"data": query})["elements"]
        rows = []
        for e in els:
            plat = e.get("lat") or e.get("center", {}).get("lat")
            plng = e.get("lon") or e.get("center", {}).get("lon")
            tags = e.get("tags", {})
            rows.append({"source": "osm", "name": tags.get("name", "샤워장 (이름 미등록)"),
                         "address": tags.get("addr:full", ""),
                         "fee": tags.get("fee", ""),                 # yes/no (유료 여부)
                         "phone": "", "distance_m": _distance_m(lat, lng, plat, plng),
                         "lat": plat, "lng": plng,
                         "url": f"https://www.openstreetmap.org/{e['type']}/{e['id']}"})
        return sorted(rows, key=lambda r: r["distance_m"])[:size]
    except Exception:
        return _sample_places("shower")


def _distance_m(lat1, lng1, lat2, lng2):
    """두 좌표 사이 거리(m) - 하버사인 공식"""
    from math import radians, sin, cos, asin, sqrt
    dlat, dlng = radians(lat2 - lat1), radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return int(2 * 6371000 * asin(sqrt(a)))


# ---------------------------------------------------------------
# 4. 해변 · 관광지 (한국관광공사 TourAPI KorService2)
#    areaCode 39 = 제주도
# ---------------------------------------------------------------
def tour_search(keyword: str, rows: int = 10) -> list:
    if not TOUR_API_KEY:
        return _sample_tour(keyword)
    url = f"{TOUR_BASE}/searchKeyword2"
    params = {"serviceKey": TOUR_API_KEY, "MobileOS": "ETC", "MobileApp": "JejuActivity",
              "_type": "json", "keyword": keyword, "areaCode": 39, "numOfRows": rows}
    try:
        items = _tour_items(_get_json(url, params=params))
        return [{"source": "tourapi", "name": i["title"], "address": i.get("addr1", ""),
                 "lat": float(i["mapy"]), "lng": float(i["mapx"]),
                 "image": i.get("firstimage", "")} for i in items]
    except Exception:
        return _sample_tour(keyword)


# ---------------------------------------------------------------
# 샘플 데이터 (키가 없거나 인터넷 연결이 안 될 때)
# ---------------------------------------------------------------
_SAMPLE_WIND = {  # 판정 결과가 골고루 나오도록 일부러 다르게 설정한 값
    "jungmun": (4.2, 6.0, 200), "iho": (8.5, 12.5, 320), "gwakji": (6.0, 8.5, 300),
    "woljeong": (3.0, 4.5, 190), "hado": (2.5, 3.8, 40), "sinyang": (7.5, 10.0, 110),
    "gimnyeong": (14.5, 18.0, 350), "geumoreum": (3.5, 5.0, 270),
}
_SAMPLE_WAVE = {"jungmun": 1.2, "iho": 2.4, "gwakji": 1.5, "woljeong": 0.8,
                "hado": 0.4, "sinyang": 1.0, "gimnyeong": 2.8, "geumoreum": None}


def _nearest_site_id(lat, lng):
    from sites import SITES
    return min(SITES, key=lambda s: (s["lat"] - lat) ** 2 + (s["lng"] - lng) ** 2)["id"]


def _sample_wind(lat, lng, reason=""):
    w, g, d = _SAMPLE_WIND.get(_nearest_site_id(lat, lng), (4.0, 6.0, 0))
    return {"source": "sample", "time": "샘플", "temp_c": 17.0, "precip_mm": 0.0,
            "weather_code": 2, "wind_ms": w, "gust_ms": g, "wind_dir_deg": d}


def _sample_marine(lat, lng, reason=""):
    return {"source": "sample", "wave_m": _SAMPLE_WAVE.get(_nearest_site_id(lat, lng), 1.0),
            "wave_period_s": 7.0, "sea_temp_c": 20.0}


def _sample_places(tag):
    label = {"restaurant": "식당", "cafe": "카페", "attraction": "관광지",
             "leports": "레포츠", "shower": "샤워장"}.get(tag, tag)
    return [{"source": "sample", "name": f"[샘플] {label} {i}", "address": "제주특별자치도 (샘플 주소)",
             "phone": "", "distance_m": 300 * i, "lat": None, "lng": None, "url": ""}
            for i in range(1, 4)]


def _sample_tour(keyword):
    return [{"source": "sample", "name": f"[샘플] '{keyword}' 검색 결과 {i}",
             "address": "제주특별자치도 (샘플 주소)", "lat": None, "lng": None, "image": ""}
            for i in range(1, 4)]
