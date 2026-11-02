import { useState } from 'react'
import { Button, Card, Form, InputGroup, Spinner } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { useAppStore } from '../store/useAppStore'

export default function Agent() {
  const messages = useAppStore((s) => s.messages)
  const loading = useAppStore((s) => s.chatLoading)
  const sendMessage = useAppStore((s) => s.sendMessage)
  const [input, setInput] = useState('')

  function onSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    sendMessage(input)
    setInput('')
  }

  return (
    <>
      <PageHeader icon="robot" title="AI 가이드" subtitle="장소·바람·판정·주변 정보를 도구로 확인해서 답하는 에이전트" />
      <Card className="chat-box mb-3">
        <Card.Body>
          {messages.length === 0 && (
            <div className="text-muted">
              <div>예) 지금 서핑 어디가 제일 좋아?</div>
              <div>예) 월정리 서핑해도 돼? 끝나고 갈 카페도 알려줘</div>
              <div>예) 오늘 패러글라이딩 가능한지, 안 되면 대신 뭘 할지 추천해줘</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              {m.steps?.length > 0 && (
                <div className="small text-muted mb-1">
                  <i className="bi bi-tools me-1" />
                  {m.steps.map((s) => `${s.tool}(${JSON.stringify(s.args)}) → ${s.count}건`).join(' · ')}
                </div>
              )}
              {m.text}
            </div>
          ))}
          {loading && <div className="small text-muted"><Spinner size="sm" className="me-2" />에이전트가 도구를 사용하는 중...</div>}
        </Card.Body>
      </Card>
      <Form onSubmit={onSubmit}>
        <InputGroup>
          <Form.Control value={input} onChange={(e) => setInput(e.target.value)} placeholder="질문을 입력하세요" />
          <Button type="submit" disabled={loading}><i className="bi bi-send" /></Button>
        </InputGroup>
      </Form>
    </>
  )
}
