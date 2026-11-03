import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const JEJU_CENTER = [33.38, 126.55]

// 제주 지도 (Leaflet + OpenStreetMap, 키 불필요) — 화면마다 마커 내용만 바꿔 쓰는 공용 지도
//
//  markers: [{
//    id, lat, lng, color,                 // 마커 위치·색
//    tooltip,                             // 마우스를 올리면 나오는 한 줄
//    popup: { title, lines: [글], actions: [{ label, onClick } | { label, href }] },
//  }]
//  focus: { id } — 새 객체를 넘길 때마다 그 마커로 이동하고 팝업을 엽니다 (목록의 "지도에서 보기" 버튼용)
//         같은 장소를 다시 눌러도 동작하도록 값이 아니라 "새 객체"가 바뀌는 것을 신호로 씁니다.
//  bounds: [[남, 서], [북, 동]] — 주면 처음 한 번 이 범위가 보이도록 맞춥니다 (없으면 마커 전체가 보이게)
export default function MapView({ markers = [], focus = null, height = 420, radius = 9, bounds = null, label = '제주 지도' }) {
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const byIdRef = useRef(new Map()) // id → Leaflet 마커
  const fittedRef = useRef(false)

  // ① 지도는 한 번만 만든다
  useEffect(() => {
    // preferCanvas: 마커가 천 개 넘어도 가볍게 그리도록 한 장의 캔버스에 그린다
    const map = L.map(boxRef.current, { center: JEJU_CENTER, zoom: 10, scrollWheelZoom: true, preferCanvas: true })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    const byId = byIdRef.current
    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
      byId.clear()
      fittedRef.current = false
    }
  }, [])

  // ② 마커가 바뀌면 마커만 다시 그린다
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    byIdRef.current.clear()

    const points = []
    for (const m of markers) {
      if (m.lat == null || m.lng == null || Number.isNaN(Number(m.lat)) || Number.isNaN(Number(m.lng))) continue
      const marker = L.circleMarker([m.lat, m.lng], {
        radius, color: '#fff', weight: 2, fillColor: m.color ?? '#6c757d', fillOpacity: 0.92,
      })
      if (m.tooltip) marker.bindTooltip(m.tooltip, { direction: 'top' })
      if (m.popup) marker.bindPopup(() => buildPopup(m.popup)) // 눌렀을 때 만든다 (마커가 많아도 처음에 가볍게)
      marker.addTo(layer)
      byIdRef.current.set(m.id, marker)
      points.push([m.lat, m.lng])
    }

    // 처음 한 번만 범위를 맞춘다 (이후엔 사용자가 옮긴 위치를 유지)
    if (points.length && !fittedRef.current) {
      map.invalidateSize() // 마커를 그리는 동안 화면 크기가 바뀌었을 수 있으니 다시 재고 맞춘다
      map.fitBounds(bounds ?? L.latLngBounds(points).pad(0.15))
      fittedRef.current = true
    }
  }, [markers, radius, bounds])

  // ③ focus 가 바뀌면 그 마커로 이동
  useEffect(() => {
    if (!focus) return
    const marker = byIdRef.current.get(focus.id)
    const map = mapRef.current
    if (!marker || !map) return
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 13), { duration: 0.6 })
    marker.openPopup()
  }, [focus])

  return <div ref={boxRef} className="site-map rounded-3 border" style={{ height }} role="application" aria-label={label} />
}

// 팝업은 문자열 HTML 대신 DOM 으로 만들어 글자가 코드로 해석되지 않게 한다
function buildPopup({ title, lines = [], actions = [] }) {
  const box = document.createElement('div')

  const head = document.createElement('div')
  head.className = 'fw-bold mb-1'
  head.textContent = title
  box.append(head)

  for (const text of lines) {
    const p = document.createElement('div')
    p.className = 'small text-muted'
    p.textContent = text
    box.append(p)
  }

  if (actions.length) {
    const row = document.createElement('div')
    row.className = 'd-flex gap-2 mt-2'
    for (const a of actions) {
      const el = document.createElement(a.href ? 'a' : 'button')
      el.className = `btn btn-sm ${a.variant ?? 'btn-primary'} flex-grow-1`
      el.textContent = a.label
      if (a.href) {
        el.href = a.href
        el.target = '_blank'
        el.rel = 'noreferrer'
      } else {
        el.type = 'button'
        el.addEventListener('click', () => a.onClick?.())
      }
      row.append(el)
    }
    box.append(row)
  }
  return box
}
