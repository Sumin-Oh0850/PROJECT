import { useEffect, useRef, useState } from 'react'
import { Button, Form, InputGroup, Spinner } from 'react-bootstrap'
import { useAppStore } from '../store/useAppStore'
import { cleanAnswer } from '../lib/format'

const MOBILE_QUERY = '(max-width: 575.98px)' // theme.css 의 모바일 규칙과 같은 폭

// 화면이 좁은지 (바뀌면 다시 계산)
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = (e) => setMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return mobile
}

// AI 가이드: 화면 왼쪽 아래 동그란 버튼 → 누르면 채팅 창이 열림 (어느 페이지에서나 사용)
//  - 데스크톱: 왼쪽 아래의 작은 창
//  - 모바일: 화면 전체 창. 키보드가 올라오면 "키보드를 뺀 보이는 높이"에 맞춰 줄어들어 입력칸이 항상 키보드 바로 위에 있음
export default function ChatWidget() {
  const messages = useAppStore((s) => s.messages)
  const loading = useAppStore((s) => s.chatLoading)
  const sendMessage = useAppStore((s) => s.sendMessage)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const bodyRef = useRef(null)
  const winRef = useRef(null)
  const mobile = useIsMobile()

  const scrollToBottom = () => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }

  // 새 메시지가 오면 맨 아래로
  useEffect(() => {
    if (open) scrollToBottom()
  }, [open, messages, loading])

  // Esc 로 닫기
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // 모바일: 키보드가 올라오면 보이는 영역(visualViewport)에 맞춰 창의 높이·위치를 바꾼다.
  //  (iPhone 사파리는 키보드가 올라와도 화면 높이가 줄지 않아서, 이렇게 하지 않으면 입력칸이 키보드에 가려짐)
  useEffect(() => {
    const vv = window.visualViewport
    if (!open || !mobile || !vv) return undefined
    const el = winRef.current
    const sync = () => {
      if (!el) return
      el.style.height = `${vv.height}px`
      el.style.top = `${vv.offsetTop}px`
      scrollToBottom() // 키보드가 올라오고 내려갈 때마다 대화를 맨 아래로
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      if (el) { el.style.height = ''; el.style.top = '' }
    }
  }, [open, mobile])

  // 모바일: 창이 열려 있는 동안 뒤의 페이지가 같이 스크롤되지 않게 잠근다
  useEffect(() => {
    if (!open || !mobile) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, mobile])

  function onSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    sendMessage(input)
    setInput('')
  }

  return (
    <>
      {open && (
        <section ref={winRef} className="chat-window shadow-lg" role="dialog" aria-label="AI 가이드" aria-modal={mobile || undefined}>
          <header className="chat-window-head">
            <span className="fw-bold"><i className="bi bi-robot me-2" />AI 가이드</span>
            <button type="button" className="btn-close btn-close-white" onClick={() => setOpen(false)} aria-label="닫기" />
          </header>
          <div className="chat-window-body chat-box" ref={bodyRef}>
            {messages.length === 0 && (
              <div className="text-muted small">
                <div className="mb-2">장소·바람·파도·주변 정보를 직접 확인해서 답해 드려요.</div>
                <div>예) 지금 서핑 어디가 제일 좋아?</div>
                <div>예) 월정리 서핑해도 돼? 끝나고 갈 카페도 알려줘</div>
                <div>예) 오늘 패러글라이딩 가능한지 알려줘</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>{m.role === 'assistant' ? cleanAnswer(m.text) : m.text}</div>
            ))}
            {loading && <div className="small text-muted"><Spinner size="sm" className="me-2" />확인하는 중...</div>}
          </div>
          <Form onSubmit={onSubmit} method="post" className="chat-window-foot">
            <InputGroup>
              {/* 모바일은 열자마자 키보드가 올라와 대화를 가리지 않도록 자동 포커스를 하지 않는다 */}
              <Form.Control value={input} onChange={(e) => setInput(e.target.value)} placeholder="질문을 입력하세요" aria-label="질문"
                autoFocus={!mobile} enterKeyHint="send" onFocus={() => setTimeout(scrollToBottom, 350)} />
              <Button type="submit" disabled={loading} aria-label="보내기"><i className="bi bi-send" /></Button>
            </InputGroup>
          </Form>
        </section>
      )}
      <button type="button" className={`chat-fab${open ? ' open' : ''}`} onClick={() => setOpen((o) => !o)} aria-label={open ? 'AI 가이드 닫기' : 'AI 가이드 열기'} aria-expanded={open}>
        <i className={`bi ${open ? 'bi-x-lg' : 'bi-robot'}`} />
      </button>
    </>
  )
}
