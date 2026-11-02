import { useEffect, useRef } from 'react'
import { createOcean } from '../lib/ocean'

// Three.js 장면: 바다 + 바람 + 비. 데이터가 바뀌면 파도·바람·비·색이 부드럽게 따라 바뀝니다.
// WebGL 을 못 쓰면 아무것도 그리지 않고, 뒤의 CSS 그라디언트 배경이 그대로 보입니다.
export default function OceanCanvas({ sea = true, waveHeight, wavePeriod, windSpeed, windDir, level, precipMm, weatherCode }) {
  const box = useRef(null)
  const scene = useRef(null)

  useEffect(() => {
    scene.current = createOcean(box.current, { sea })
    return () => { scene.current?.dispose(); scene.current = null }
  }, [sea])

  useEffect(() => {
    scene.current?.update({ waveHeight, wavePeriod, windSpeed, windDir, level, precipMm, weatherCode })
  }, [sea, waveHeight, wavePeriod, windSpeed, windDir, level, precipMm, weatherCode])

  return <div ref={box} className="sea-layer" aria-hidden="true" />
}
