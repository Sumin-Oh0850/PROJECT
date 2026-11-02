import { lazy, Suspense } from 'react'
import { STATUS_ICON, fmt } from '../lib/format'
import { rainIntensity } from '../lib/weatherFx'

// 3D 장면(바다·바람·비)은 크기가 커서 이 화면을 열 때 따로 내려받습니다
const OceanCanvas = lazy(() => import('./OceanCanvas'))

const LEVEL = { 가능: 'go', 주의: 'caution', 위험: 'danger' }

// 장소 상세 맨 위 Three.js 애니메이션 (배경 + 정보 시각화):
//  - 파고 → 물결 높이·움직임 (가능/주의/위험에 따라 낙폭 범위가 달라짐)
//  - 풍속 → 수면 잔물결 + 바람 줄기 (풍향대로 흐르고, 세질수록 많고 빠름)
//  - 강수/날씨 → 비 (비가 오면 하늘이 어두워짐)
//  - 패러글라이딩(금오름 이륙장): 바다 없이 하늘 위에 바람(·비)만
export default function SceneHero({ conditions: c, status, activityKey }) {
  const sea = activityKey !== 'paragliding'
  const level = LEVEL[status] ?? 'go'
  const rain = rainIntensity({ precipMm: c.precip_mm, weatherCode: c.weather_code }) > 0
  return (
    <div className={`site-scene ${sea ? '' : 'site-scene-sky'}`} data-level={level} data-rain={rain ? '1' : undefined}
      role="img" aria-label={`${sea ? `파도 ${fmt(c.wave_m, ' m')}, ` : ''}풍속 ${fmt(c.wind_ms, ' m/s')}, ${rain ? '비, ' : ''}${status} 상태를 보여 주는 애니메이션`}>
      <Suspense fallback={null}>
        <OceanCanvas sea={sea} waveHeight={c.wave_m} wavePeriod={c.wave_period_s} windSpeed={c.wind_ms} windDir={c.wind_dir_deg}
          level={level} precipMm={c.precip_mm} weatherCode={c.weather_code} />
      </Suspense>
      <div className="site-scene-info">
        <span className="site-scene-chip"><i className={`bi bi-${STATUS_ICON[status]} me-1`} aria-hidden="true" />{status}</span>
        {sea && <span className="site-scene-chip"><i className="bi bi-water me-1" aria-hidden="true" />파도 {fmt(c.wave_m, ' m')}</span>}
        <span className="site-scene-chip"><i className="bi bi-wind me-1" aria-hidden="true" />풍속 {fmt(c.wind_ms, ' m/s')}</span>
        {rain && <span className="site-scene-chip"><i className="bi bi-cloud-rain me-1" aria-hidden="true" />비{c.precip_mm > 0 ? ` ${fmt(c.precip_mm, ' mm')}` : ''}</span>}
      </div>
    </div>
  )
}
