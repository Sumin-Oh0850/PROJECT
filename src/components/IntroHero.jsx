import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import hero1 from '../assets/hero/hero-1.jpg'
import hero3 from '../assets/hero/hero-3.jpg'
import hero4 from '../assets/hero/hero-4.jpg'
import hero5 from '../assets/hero/hero-5.jpg'
import hero6 from '../assets/hero/hero-6.jpg'

// 슬라이드 사진 (순서대로). position: 화면에 맞게 잘릴 때 보이는 위치
const SLIDES = [
  { src: hero1, alt: '구름 위 하늘', position: 'center 70%' },
  { src: hero3, alt: '푸른 하늘과 바다', position: 'center 85%' },
  { src: hero4, alt: '하얀 모래와 현무암 해변', position: 'center 80%' },
  { src: hero5, alt: '현무암 해안과 바다', position: 'center 70%' },
  { src: hero6, alt: '김녕 바다', position: 'center 60%' },
]
const INTERVAL = 10_000 // 자동 전환 간격(ms)

// 홈 맨 위 인트로: 화면 가득 사진 슬라이드
//  - 사진: 10초마다 자동 전환(크로스페이드) / 좌우 화살표·점 / 모바일 좌우 스와이프
//  - 내용으로 이동: 휠 내리기 / 위로 스와이프 / ↓·Space / "아래로" 버튼 → 홈 내용으로 부드럽게 이동
export default function IntroHero({ targetRef }) {
  const heroRef = useRef(null)
  const busy = useRef(false)
  const [index, setIndex] = useState(0)
  const [reduce] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  const go = useCallback((n) => setIndex((i) => (i + n + SLIDES.length) % SLIDES.length), [])

  // 나머지 사진은 첫 사진이 뜬 뒤에 미리 불러온다 (첫 화면을 가볍게)
  useEffect(() => {
    const t = setTimeout(() => SLIDES.slice(1).forEach((s) => { new Image().src = s.src }), 800)
    return () => clearTimeout(t)
  }, [])

  // 자동 전환: 넘길 때마다 시간이 다시 시작됨 (움직임 줄이기 설정이면 자동 전환 없음)
  useEffect(() => {
    if (reduce) return undefined
    const t = setInterval(() => go(1), INTERVAL)
    return () => clearInterval(t)
  }, [index, reduce, go])

  useEffect(() => {
    const hero = heroRef.current
    const inIntro = () => hero && window.scrollY < hero.offsetHeight * 0.4
    const reveal = () => {
      if (busy.current || !targetRef.current) return
      busy.current = true
      const nav = document.querySelector('.navbar')?.offsetHeight ?? 0
      const top = targetRef.current.getBoundingClientRect().top + window.scrollY - nav - 16
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
      setTimeout(() => { busy.current = false }, reduce ? 0 : 900)
    }

    const onWheel = (e) => {
      if (!inIntro() || e.deltaY <= 0) return
      e.preventDefault()
      reveal()
    }
    const onKey = (e) => {
      if (!inIntro() || /INPUT|TEXTAREA|SELECT|BUTTON|A/.test(e.target.tagName)) return
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); reveal() }
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    // 터치: 세로로 더 많이 움직이면 내용으로, 가로로 더 많이 움직이면 사진 넘기기
    let start = null
    const onTouchStart = (e) => { start = inIntro() ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null }
    const onTouchMove = (e) => {
      if (!start) return
      const dx = e.touches[0].clientX - start.x
      const dy = e.touches[0].clientY - start.y
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { start = null; go(dx < 0 ? 1 : -1) }
      else if (-dy > 30 && Math.abs(dy) > Math.abs(dx)) { start = null; reveal() }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    hero?.addEventListener('intro-reveal', reveal)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      hero?.removeEventListener('intro-reveal', reveal)
    }
  }, [targetRef, reduce, go])

  return (
    <section className="intro-hero" ref={heroRef} aria-roledescription="carousel" aria-label="제주 바다 사진 슬라이드">
      {SLIDES.map((s, i) => (
        <div key={s.src} className={`intro-slide${i === index ? ' active' : ''}`} role="img" aria-label={s.alt} aria-hidden={i !== index}
          style={{ backgroundImage: `url(${s.src})`, backgroundPosition: s.position }} />
      ))}
      <div className="intro-hero-shade" />
      <div className="intro-hero-text container">
        <span className="badge text-bg-light mb-3">서핑 · 윈드서핑 · 패러글라이딩</span>
        <h1 className="fw-bold display-5">오늘,<br />제주의 바다와 하늘타기</h1>
        <Link to="/sites" className="btn btn-light mt-3"><i className="bi bi-geo-alt me-1" />장소 보기</Link>
      </div>

      <button type="button" className="intro-arrow prev" onClick={() => go(-1)} aria-label="이전 사진"><i className="bi bi-chevron-left" /></button>
      <button type="button" className="intro-arrow next" onClick={() => go(1)} aria-label="다음 사진"><i className="bi bi-chevron-right" /></button>
      <div className="intro-dots" role="group" aria-label="사진 선택">
        {SLIDES.map((s, i) => (
          <button key={s.src} type="button" className={i === index ? 'on' : ''} onClick={() => setIndex(i)} aria-label={`${i + 1}번째 사진`} aria-current={i === index} />
        ))}
      </div>

      <button type="button" className="intro-scroll" onClick={() => heroRef.current?.dispatchEvent(new Event('intro-reveal'))}>
        <span>아래로 내려 보기</span>
        <i className="bi bi-chevron-double-down" />
      </button>
    </section>
  )
}
