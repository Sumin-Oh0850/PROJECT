import { useEffect, useRef, useState } from 'react'
import { Button, Form, InputGroup, Spinner } from 'react-bootstrap'
import { useAppStore } from '../store/useAppStore'
import { cleanAnswer } from '../lib/format'

// AI 가이드: 화면 왼쪽 아래 동그란 버튼 → 누르면 채팅 창이 열림 (어느 페이지에서나 사용)
export default function ChatWidget() {
  const messages = useAppStore((s) => s.messages)
  const loading = useAppStore((s) => s.chatLoading)
  const sendMessage = useAppStore((s) => s.sendMessage)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const bodyRef = useRef(null)

  // 새 메시지가 오면 맨 아래로
  useEffect(() => {
    if (open && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [open, messages, loading])

  // Esc 로 닫기
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function onSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    sendMessage(input)
    setInput('')
  }

  return (
    <>
      {open && (
        <section className="chat-window shadow-lg" role="dialog" aria-label="AI 가이드">
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
              <Form.Control value={input} onChange={(e) => setInput(e.target.value)} placeholder="질문을 입력하세요" aria-label="질문" autoFocus />
              <Button type="submit" disabled={loading} aria-label="보내기"><i className="bi bi-send" /></Button>
            </InputGroup>
          </Form>
        </section>
      )}
      <button type="button" className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label={open ? 'AI 가이드 닫기' : 'AI 가이드 열기'} aria-expanded={open}>
        <i className={`bi ${open ? 'bi-x-lg' : 'bi-robot'}`} />
      </button>
    </>
  )
}
