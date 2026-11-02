import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import heroImg from '../assets/hero-gimnyeong.jpg'

// 홈 맨 위 인트로: 화면 가득 사진 → 휠을 내리거나 / 위로 스와이프 / ↓·Space / 버튼으로 홈 내용으로 부드럽게 이동
// onReveal(): 내용 영역(target)으로 스크롤. 사진 영역에 있을 때만 가로채고, 그 아래에서는 일반 스크롤.
export default function IntroHero({ targetRef }) {
  const heroRef = useRef(null)
  const busy = useRef(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const inIntro = () => {
      const hero = heroRef.current
      return hero && window.scrollY < hero.offsetHeight * 0.4
    }
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
      if (!inIntro()) return
      if (['ArrowDown', 'PageDown', ' '].includes(e.key) && !/INPUT|TEXTAREA|SELECT|BUTTON|A/.test(e.target.tagName)) {
        e.preventDefault()
        reveal()
      }
    }
    let startY = null
    const onTouchStart = (e) => { startY = inIntro() ? e.touches[0].clientY : null }
    const onTouchMove = (e) => {
      if (startY == null) return
      if (startY - e.touches[0].clientY > 30) { startY = null; reveal() }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    heroRef.current?.addEventListener('intro-reveal', reveal)
    const hero = heroRef.current
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      hero?.removeEventListener('intro-reveal', reveal)
    }
  }, [targetRef])

  return (
    <section className="intro-hero" ref={heroRef} style={{ backgroundImage: `url(${heroImg})` }} aria-label="김녕 바다 인트로">
      <div className="intro-hero-shade" />
      <div className="intro-hero-text container">
        <span className="badge text-bg-light mb-3">서핑 · 윈드서핑 · 패러글라이딩</span>
        <h1 className="fw-bold display-5">오늘,<br />제주의 바다와 하늘타기</h1>
        <Link to="/sites" className="btn btn-light mt-3"><i className="bi bi-geo-alt me-1" />장소 보기</Link>
      </div>
      <button type="button" className="intro-scroll" onClick={() => heroRef.current?.dispatchEvent(new Event('intro-reveal'))}>
        <span>아래로 내려 보기</span>
        <i className="bi bi-chevron-double-down" />
      </button>
    </section>
  )
}
