import { useMemo } from 'react'
import MapView from './MapView'
import { STATUS_HEX, fmt } from '../lib/format'

// 레저 장소 지도: 마커 색 = 판정 (가능 초록 · 주의 노랑 · 위험 빨강)
//  - items: judge 결과 배열 [{ id, site, activity, status, lat, lng, conditions }]
//  - 팝업의 "자세히" 버튼은 onSelect(id) 를 부릅니다. focus({ id }) 를 주면 그 장소로 이동합니다.
export default function SiteMap({ items = [], height = 380, onSelect, focus }) {
  const markers = useMemo(() => items.map((j) => {
    const c = j.conditions ?? {}
    return {
      id: j.id,
      lat: j.lat,
      lng: j.lng,
      color: STATUS_HEX[j.status],
      radius: 11,
      tooltip: `${j.site} · ${j.status}`,
      popup: {
        title: j.site,
        lines: [
          `${j.activity} · ${j.status}`,
          `풍속 ${fmt(c.wind_ms, 'm/s')} · 돌풍 ${fmt(c.gust_ms, 'm/s')}${c.wave_m != null ? ` · 파도 ${fmt(c.wave_m, 'm')}` : ''}`,
        ],
        actions: [{ label: '자세히', onClick: () => onSelect?.(j.id) }],
      },
    }
  }), [items, onSelect])

  return <MapView markers={markers} focus={focus} height={height} radius={11} label="제주 레저 장소 지도" />
}
