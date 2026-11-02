// 화면에서 쓰는 표시용 도우미 (판정 색·아이콘, 숫자·풍향 문구)

export const STATUS_VARIANT = { 가능: 'success', 주의: 'warning', 불가: 'danger' }
export const STATUS_ICON = { 가능: 'check-circle-fill', 주의: 'exclamation-triangle-fill', 불가: 'x-octagon-fill' }
export const STATUS_HEX = { 가능: '#2e9d57', 주의: '#e8a600', 불가: '#d64545' } // 지도 마커 색

// bootstrap-icons 이름
export const ACTIVITY_ICON = { surfing: 'water', windsurfing: 'wind', paragliding: 'airplane' }

const COMPASS = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동', '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서']

// 풍향은 "바람이 불어오는 방향"입니다 (예: 북서풍 = 북서쪽에서 불어옴)
export const windDirText = (deg) => (deg == null ? '-' : `${COMPASS[Math.round(deg / 22.5) % 16]}풍 ${Math.round(deg)}°`)

// 숫자를 보기 좋게: 5.10 → "5.1", 14 → "14", 없으면 "-"
export const fmt = (value, unit = '') => {
  if (value == null || Number.isNaN(Number(value))) return '-'
  return `${Number(Number(value).toFixed(1))}${unit}`
}

export const isSample = (judgement) => judgement?.conditions?.source === 'sample'
