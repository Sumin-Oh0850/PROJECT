import { useState } from 'react'
import { Alert, Button, Card, Form } from 'react-bootstrap'
import { Link, Navigate, useLocation } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { MIN_PASSWORD, isEmail } from '../lib/auth'
import { useAppStore } from '../store/useAppStore'

export default function Signup() {
  const location = useLocation()
  const user = useAppStore((s) => s.user)
  const signUp = useAppStore((s) => s.signUp)
  const toast = useAppStore((s) => s.toast)
  const [form, setForm] = useState({ nickname: '', email: '', password: '', password2: '' })
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState('') // 인증 메일을 보낸 주소
  const [busy, setBusy] = useState(false)

  const from = location.state?.from ?? '/'
  if (user) return <Navigate to={from} replace />

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    const nickname = form.nickname.trim()
    const email = form.email.trim()
    if (!nickname) return setError('닉네임을 입력하세요')
    if (nickname.length > 20) return setError('닉네임은 20자 이하로 적어 주세요')
    if (!isEmail(email)) return setError('이메일 형식이 올바르지 않아요')
    if (form.password.length < MIN_PASSWORD) return setError(`비밀번호는 ${MIN_PASSWORD}자 이상이어야 해요`)
    if (form.password !== form.password2) return setError('비밀번호가 서로 달라요')

    setBusy(true)
    const result = await signUp({ email, password: form.password, nickname })
    setBusy(false)
    if (result.error) return setError(result.error)
    if (result.needsConfirm) return setSentTo(email) // 메일 인증이 필요한 설정
    toast('가입했어요. 환영합니다!') // 바로 로그인된 상태 → 위의 Navigate 가 이동시킴
  }

  if (sentTo) {
    return (
      <div style={{ maxWidth: 420 }} className="mx-auto">
        <PageHeader icon="envelope-check" title="메일을 확인하세요" />
        <Alert variant="success">
          <b>{sentTo}</b> 로 인증 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인하세요.
          <div className="small mt-2 text-muted">메일이 안 보이면 스팸함도 확인해 보세요.</div>
        </Alert>
        <Button as={Link} to="/login" className="w-100">로그인하러 가기</Button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 420 }} className="mx-auto">
      <PageHeader icon="person-plus" title="회원가입" subtitle="이메일로 가입하고 즐겨찾기를 내 계정에 저장하세요" />
      <Card>
        <Card.Body>
          <Form method="post" onSubmit={onSubmit} noValidate>
            <Form.Group className="mb-3" controlId="su-nickname">
              <Form.Label>닉네임</Form.Label>
              <Form.Control value={form.nickname} onChange={set('nickname')} maxLength={20} autoComplete="nickname" autoFocus />
            </Form.Group>
            <Form.Group className="mb-3" controlId="su-email">
              <Form.Label>이메일</Form.Label>
              <Form.Control type="email" value={form.email} onChange={set('email')} autoComplete="email" />
            </Form.Group>
            <Form.Group className="mb-3" controlId="su-password">
              <Form.Label>비밀번호 <small className="text-muted">({MIN_PASSWORD}자 이상)</small></Form.Label>
              <Form.Control type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
            </Form.Group>
            <Form.Group className="mb-3" controlId="su-password2">
              <Form.Label>비밀번호 확인</Form.Label>
              <Form.Control type="password" value={form.password2} onChange={set('password2')} autoComplete="new-password" />
            </Form.Group>
            {error && <Alert variant="danger" className="py-2 small" role="alert">{error}</Alert>}
            <Button type="submit" className="w-100" disabled={busy}>{busy ? '가입 중...' : '가입하기'}</Button>
          </Form>
        </Card.Body>
      </Card>
      <p className="text-center small mt-3 mb-0">이미 회원이신가요? <Link to="/login" state={{ from }}>로그인</Link></p>
    </div>
  )
}
