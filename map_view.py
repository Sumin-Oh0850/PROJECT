"""
판정 결과를 제주 지도(HTML)로 저장합니다.
- Leaflet + OpenStreetMap 사용 → API 키 불필요
- 마커 색: 초록=가능, 주황=주의, 빨강=불가
"""

import json

COLORS = {"가능": "#1baf7a", "주의": "#eda100", "불가": "#e34948"}

TEMPLATE = """<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>제주 레저 활동 지도</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
 body{margin:0;font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif}
 header{padding:12px 16px;background:#1f3a5f;color:#fff}
 header h1{margin:0;font-size:18px} header p{margin:4px 0 0;font-size:13px;opacity:.85}
 #map{height:calc(100vh - 64px)}
 .legend{background:#fff;padding:8px 10px;border-radius:6px;font-size:13px;line-height:1.7}
 .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}
</style></head><body>
<header><h1>제주 레저 활동 지도</h1><p>__SUB__</p></header>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const data = __DATA__;
const colors = __COLORS__;
const map = L.map('map').setView([33.38, 126.55], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {maxZoom: 18, attribution: '&copy; OpenStreetMap'}).addTo(map);
data.forEach(d => {
  L.circleMarker([d.lat, d.lng], {radius: 10, color: '#fff', weight: 2,
     fillColor: colors[d.status], fillOpacity: 0.95}).addTo(map)
   .bindPopup(`<b>${d.site}</b> (${d.activity})<br>판정: <b>${d.status}</b><br>
     ${d.reasons.join('<br>')}<br>풍속 ${d.wind} m/s · 돌풍 ${d.gust} m/s
     ${d.wave != null ? ' · 파고 ' + d.wave + ' m' : ''}<br>
     <a href="${d.link}" target="_blank">OpenStreetMap에서 크게 보기</a>`);
});
const lg = L.control({position: 'bottomright'});
lg.onAdd = () => { const div = L.DomUtil.create('div', 'legend');
  div.innerHTML = Object.entries(colors).map(([k, v]) =>
    `<span class="dot" style="background:${v}"></span>${k}`).join('<br>'); return div; };
lg.addTo(map);
</script></body></html>"""


def save_map(results: list, sites: dict, links: dict, path="jeju_activity_map.html", subtitle=""):
    rows = []
    for r in results:
        s = sites[r["site"]]
        c = r["conditions"]
        rows.append({"site": r["site"], "activity": r["activity"], "status": r["status"],
                     "reasons": r["reasons"], "lat": s["lat"], "lng": s["lng"],
                     "wind": c["wind_ms"], "gust": c["gust_ms"], "wave": c.get("wave_m"),
                     "link": links[r["site"]]})
    html = (TEMPLATE.replace("__DATA__", json.dumps(rows, ensure_ascii=False))
                    .replace("__COLORS__", json.dumps(COLORS, ensure_ascii=False))
                    .replace("__SUB__", subtitle))
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    return path
