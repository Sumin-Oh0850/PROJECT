import { useState } from 'react'
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap'
import { Navigate, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Loading } from '../components/Status'
import { MIN_PASSWORD, displayName } from '../lib/auth'
import { useAppStore } from '../store/useAppStore'

const CONFIRM_WORD = '회원탈퇴'

// 내 정보: 계정 정보 · 비밀번호 변경 · 회원 삭제
export default function Account() {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const authReady = useAppStore((s) => s.authReady)
  const changePassword = useAppStore((s) => s.changePassword)
  const deleteAccount = useAppStore((s) => s.deleteAccount)
  const toast = useAppStore((s) => s.toast)

  const [pw, setPw] = useState({ current: '', next: '', next2: '' })
  const [pwResult, setPwResult] = useState(null) // { ok, text }
  const [pwBusy, setPwBusy] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [delError, setDelError] = useState('')
  const [delBusy, setDelBusy] = useState(false)

  if (!authReady) return <Loading text="확인하는 중..." />
  if (!user) return <Navigate to="/login" state={{ from: '/account' }} replace />

  async function onChangePassword(e) {
    e.preventDefault()
    setPwResult(null)
    if (pw.next.length < MIN_PASSWORD) return setPwResult({ ok: false, text: `새 비밀번호는 ${MIN_PASSWORD}자 이상이어야 해요` })
    if (pw.next !== pw.next2) return setPwResult({ ok: false, text: '새 비밀번호가 서로 달라요' })
    if (pw.next === pw.current) return setPwResult({ ok: false, text: '새 비밀번호가 현재 비밀번호와 같아요' })
    setPwBusy(true)
    const result = await changePassword({ current: pw.current, next: pw.next })
    setPwBusy(false)
    if (result.error) return setPwResult({ ok: false, text: result.error })
    setPw({ current: '', next: '', next2: '' })
    setPwResult({ ok: true, text: '비밀번호를 바꿨어요' })
  }

  async function onDelete(e) {
    e.preventDefault()
    setDelError('')
    if (!confirm('정말 탈퇴할까요?\n계정과 즐겨찾기가 모두 삭제되며 되돌릴 수 없습니다.')) return
    setDelBusy(true)
    const result = await deleteAccount()
    setDelBusy(false)
    if (result.error) return setDelError(result.error)
    toast('회원 탈퇴가 끝났어요. 이용해 주셔서 감사합니다')
    navigate('/', { replace: true })
  }

  return (
    <>
      <PageHeader icon="person-circle" title="내 정보" subtitle="계정 정보를 확인하고 비밀번호를 바꾸거나 탈퇴할 수 있어요" />

      <Row className="g-4">
        <Col lg={6}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title className="fs-6 fw-bold"><i className="bi bi-person me-2" />계정</Card.Title>
              <dl className="row mb-0 small">
                <dt className="col-4 text-muted fw-normal">닉네임</dt><dd className="col-8">{displayName(user)}</dd>
                <dt className="col-4 text-muted fw-normal">이메일</dt><dd className="col-8">{user.email}</dd>
                <dt className="col-4 text-muted fw-normal">가입일</dt><dd className="col-8 mb-0">{new Date(user.created_at).toLocaleDateString('ko-KR')}</dd>
              </dl>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <Card.Title className="fs-6 fw-bold"><i className="bi bi-key me-2" />비밀번호 변경</Card.Title>
              <Form onSubmit={onChangePassword} noValidate>
                <Form.Group className="mb-3" controlId="pw-current">
                  <Form.Label>현재 비밀번호</Form.Label>
                  <Form.Control type="password" autoComplete="current-password" value={pw.current}
                    onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
                </Form.Group>
                <Form.Group className="mb-3" controlId="pw-next">
                  <Form.Label>새 비밀번호 <small className="text-muted">({MIN_PASSWORD}자 이상)</small></Form.Label>
                  <Form.Control type="password" autoComplete="new-password" value={pw.next}
                    onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
                </Form.Group>
                <Form.Group className="mb-3" controlId="pw-next2">
                  <Form.Label>새 비밀번호 확인</Form.Label>
                  <Form.Control type="password" autoComplete="new-password" value={pw.next2}
                    onChange={(e) => setPw((p) => ({ ...p, next2: e.target.value }))} />
                </Form.Group>
                {pwResult && <Alert variant={pwResult.ok ? 'success' : 'danger'} className="py-2 small" role="alert">{pwResult.text}</Alert>}
                <Button type="submit" disabled={pwBusy || !pw.current}>{pwBusy ? '바꾸는 중...' : '비밀번호 변경'}</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card border="danger">
            <Card.Body>
              <Card.Title className="fs-6 fw-bold text-danger"><i className="bi bi-exclamation-triangle me-2" />회원 탈퇴</Card.Title>
              <p className="small text-muted">
                탈퇴하면 계정과 즐겨찾기가 모두 삭제되며 <b>되돌릴 수 없어요.</b>
              </p>
              <Form onSubmit={onDelete}>
                <Form.Group className="mb-3" controlId="del-confirm">
                  <Form.Label className="small">확인을 위해 <b>{CONFIRM_WORD}</b> 를 입력하세요</Form.Label>
                  <Form.Control value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
                </Form.Group>
                {delError && <Alert variant="danger" className="py-2 small" role="alert">{delError}</Alert>}
                <Button type="submit" variant="danger" disabled={confirmText !== CONFIRM_WORD || delBusy}>
                  {delBusy ? '탈퇴 처리 중...' : '회원 탈퇴'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  )
}
