"""
실행:  python main.py
1) 모든 장소의 풍속·돌풍을 조회하고 가능/주의/불가를 판정해 표로 출력
2) 첫 번째 '가능' 장소 주변의 맛집·카페·샤워장·관광지를 출력
3) jeju_activity_map.html 지도 파일 생성
"""

from tools import (list_sites, judge_activity, find_restaurants, find_cafes,
                   find_showers, find_attractions, list_beaches, map_link)
from sites import SITES
from map_view import save_map

ICON = {"가능": "🟢", "주의": "🟡", "불가": "🔴"}


def main():
    print("=" * 72)
    print(" 제주 레저 활동 판정 (서핑 · 윈드서핑 · 패러글라이딩)")
    print("=" * 72)

    results = [judge_activity(s["id"]) for s in list_sites()]
    sources = {r["conditions"]["source"] for r in results}
    if "sample" in sources:
        print(" ※ 인터넷 연결이 안 되어 일부 값은 샘플 데이터입니다.\n")

    print(f"{'장소':<12}{'활동':<9}{'풍속':>6}{'돌풍':>6}{'파고':>6}  판정  이유")
    for r in results:
        c = r["conditions"]
        wave = f"{c['wave_m']:.1f}" if c.get("wave_m") is not None else "-"
        print(f"{r['site']:<10}\t{r['activity']:<7}{c['wind_ms']:>6.1f}{c['gust_ms']:>6.1f}"
              f"{wave:>6}  {ICON[r['status']]} {r['status']}  {', '.join(r['reasons'])}")
        for t in r["tips"]:
            print(f"{'':<40}↳ {t}")

    # 가능한 서핑 장소 하나를 골라 주변 정보 출력
    ok = next((s for s, r in zip(list_sites(), results)
               if r["status"] == "가능" and s["activity"] == "surfing"), list_sites()[0])
    print("\n" + "-" * 72)
    print(f" 추천 장소: {ok['name']}  ({map_link(ok['id'])})")
    print("-" * 72)
    for title, fn in [("맛집", find_restaurants), ("카페", find_cafes),
                      ("샤워장", find_showers), ("관광지", find_attractions)]:
        items = fn(ok["id"])
        print(f"[{title}]")
        if not items:
            print("  - 검색 결과 없음" + ("  (해변 샤워장은 여름 개장기간 운영, 그 외엔 서핑숍 샤워실 문의)"
                                       if title == "샤워장" else ""))
        for p in items[:3]:
            dist = f"{p['distance_m']}m" if p.get("distance_m") is not None else ""
            print(f"  - {p['name']}  {dist}  {p.get('address', '')}")

    print("[제주 해수욕장 (TourAPI)]")
    for b in list_beaches()[:5]:
        print(f"  - {b['name']}  {b['address']}")

    site_by_name = {s["name"]: s for s in SITES}
    links = {s["name"]: map_link(s["id"]) for s in SITES}
    path = save_map(results, site_by_name, links,
                    subtitle="초록=가능 · 주황=주의 · 빨강=불가  |  참고용 판정이며 현장 안내를 우선하세요")
    print(f"\n✅ 지도 파일 생성: {path}  (브라우저로 열어 보세요)")


if __name__ == "__main__":
    main()
