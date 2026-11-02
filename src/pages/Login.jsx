import { useState } from 'react'
import { Alert, Button, Card, Form } from 'react-bootstrap'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { isEmail } from '../lib/auth'
import { useAppStore } from '../store/useAppStore'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAppStore((s) => s.user)
  const signIn = useAppStore((s) => s.signIn)
  const toast = useAppStore((s) => s.toast)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const from = location.state?.from ?? '/' // 로그인이 필요해서 왔다면 원래 가려던 곳으로
  if (user) return <Navigate to={from} replace />

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!isEmail(email.trim())) return setError('이메일 형식이 올바르지 않아요')
    if (!password) return setError('비밀번호를 입력하세요')
    setBusy(true)
    const result = await signIn({ email: email.trim(), password })
    setBusy(false)
    if (result.error) return setError(result.error)
    toast('로그인했어요')
    navigate(from, { replace: true })
  }

  return (
    <div style={{ maxWidth: 420 }} className="mx-auto">
      <PageHeader icon="box-arrow-in-right" title="로그인" subtitle="즐겨찾기를 저장하려면 로그인하세요" />
      <Card>
        <Card.Body>
          <Form method="post" onSubmit={onSubmit} noValidate>
            <Form.Group className="mb-3" controlId="login-email">
              <Form.Label>이메일</Form.Label>
              <Form.Control type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </Form.Group>
            <Form.Group className="mb-3" controlId="login-password">
              <Form.Label>비밀번호</Form.Label>
              <Form.Control type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Form.Group>
            {error && <Alert variant="danger" className="py-2 small" role="alert">{error}</Alert>}
            <Button type="submit" className="w-100" disabled={busy}>{busy ? '로그인 중...' : '로그인'}</Button>
          </Form>
        </Card.Body>
      </Card>
      <p className="text-center small mt-3 mb-0">아직 회원이 아니신가요? <Link to="/signup" state={{ from }}>회원가입</Link></p>
    </div>
  )
}
