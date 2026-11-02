import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { STATUS_HEX, fmt } from '../lib/format'

const JEJU_CENTER = [33.38, 126.55]

// 제주 지도 (Leaflet + OpenStreetMap, 키 불필요)
//  - items: judge 결과 배열 [{ id, site, activity, status, lat, lng, conditions }]
//  - 마커 색 = 판정 (가능 초록 · 주의 노랑 · 불가 빨강)
//  - 마커를 누르면 팝업, 팝업의 "자세히" 버튼은 onSelect(id) 를 부릅니다.
export default function SiteMap({ items = [], height = 520, onSelect }) {
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const fittedRef = useRef(false)
  const onSelectRef = useRef(onSelect)
  // 최신 콜백을 쓰되, 지도는 다시 만들지 않음 (렌더 중이 아니라 효과 안에서 갱신)
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  // ① 지도는 한 번만 만든다
  useEffect(() => {
    const map = L.map(boxRef.current, { center: JEJU_CENTER, zoom: 10, scrollWheelZoom: true })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
      fittedRef.current = false
    }
  }, [])

  // ② items 가 바뀌면 마커만 다시 그린다
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    const points = []
    for (const item of items) {
      if (item.lat == null || item.lng == null) continue
      const color = STATUS_HEX[item.status] ?? '#6c757d'
      const marker = L.circleMarker([item.lat, item.lng], {
        radius: 11, color: '#fff', weight: 3, fillColor: color, fillOpacity: 0.95,
      })
      marker.bindTooltip(`${item.site} · ${item.status}`, { direction: 'top' })
      marker.bindPopup(buildPopup(item, (id) => onSelectRef.current?.(id)))
      marker.addTo(layer)
      points.push([item.lat, item.lng])
    }

    // 처음 한 번만 마커가 모두 보이도록 맞춘다 (이후엔 사용자가 옮긴 위치를 유지)
    if (points.length && !fittedRef.current) {
      map.fitBounds(L.latLngBounds(points).pad(0.25))
      fittedRef.current = true
    }
  }, [items])

  return <div ref={boxRef} className="site-map rounded-3 border" style={{ height }} role="application" aria-label="제주 레저 장소 지도" />
}

// 팝업은 문자열 HTML 대신 DOM 으로 만들어 글자가 코드로 해석되지 않게 한다
function buildPopup(item, onSelect) {
  const c = item.conditions ?? {}
  const box = document.createElement('div')

  const title = document.createElement('div')
  title.className = 'fw-bold'
  title.textContent = item.site
  box.append(title)

  const sub = document.createElement('div')
  sub.className = 'small text-muted mb-1'
  sub.textContent = `${item.activity} · ${item.status}`
  box.append(sub)

  const line = document.createElement('div')
  line.className = 'small mb-2'
  line.textContent = `풍속 ${fmt(c.wind_ms, 'm/s')} · 돌풍 ${fmt(c.gust_ms, 'm/s')}${c.wave_m != null ? ` · 파고 ${fmt(c.wave_m, 'm')}` : ''}`
  box.append(line)

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'btn btn-sm btn-primary w-100'
  btn.textContent = '자세히'
  btn.addEventListener('click', () => onSelect(item.id))
  box.append(btn)

  return box
}
