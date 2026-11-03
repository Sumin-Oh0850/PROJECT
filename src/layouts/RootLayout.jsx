import { useEffect } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router-dom'
import { Button, Container, Nav, Navbar, Toast, ToastContainer } from 'react-bootstrap'
import { NAV_ITEMS } from '../router'
import { displayName } from '../lib/auth'
import { useAppStore } from '../store/useAppStore'
import ChatWidget from '../components/ChatWidget'

export default function RootLayout() {
  const toasts = useAppStore((s) => s.toasts)
  const user = useAppStore((s) => s.user)
  const authReady = useAppStore((s) => s.authReady)
  const initAuth = useAppStore((s) => s.initAuth)
  const signOut = useAppStore((s) => s.signOut)

  // 앱이 열릴 때 한 번: 로그인 상태 확인(새로고침해도 로그인이 유지됨)
  useEffect(() => { initAuth() }, [initAuth])

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar expand="md" bg="primary" data-bs-theme="dark" collapseOnSelect sticky="top">
        <Container>
          <Navbar.Brand as={NavLink} to="/">
            <i className="bi bi-water me-2" /><strong>바당타기</strong>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="me-auto">
              {NAV_ITEMS.map((item) => (
                <Nav.Link key={item.to} as={NavLink} to={item.to} end={item.to === '/'} eventKey={item.to}>
                  <i className={`bi bi-${item.icon} me-1`} />{item.label}
                </Nav.Link>
              ))}
            </Nav>

            {/* 로그인 상태에 따라: 내 정보·로그아웃 / 로그인·회원가입 (확인 중에는 깜빡이지 않게 비워 둠) */}
            {authReady && (user ? (
              <Nav className="align-items-md-center gap-md-2">
                <Nav.Link as={NavLink} to="/account" eventKey="/account">
                  <i className="bi bi-person-circle me-1" />{displayName(user)}님
                </Nav.Link>
                <Button size="sm" variant="outline-light" onClick={signOut}>로그아웃</Button>
              </Nav>
            ) : (
              <Nav className="align-items-md-center gap-md-2">
                <Nav.Link as={NavLink} to="/login" eventKey="/login">로그인</Nav.Link>
                <Button as={Link} to="/signup" size="sm" variant="light">회원가입</Button>
              </Nav>
            ))}
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <main className="flex-grow-1 py-4">
        <Container>
          <Outlet />   {/* ← 여기에 주소에 맞는 페이지가 들어갑니다 */}
        </Container>
      </main>

      <footer className="py-3 border-top bg-light">
        <Container className="small text-muted">
          제주대 청년도약 부트캠프 1기 · 데이터 출처: Open-Meteo(바람·파도), 한국관광공사 TourAPI, 기상청 · 판정은 학습·참고용입니다
        </Container>
      </footer>

      <ChatWidget />

      {/* 메뉴로 다른 화면에 가면 맨 위에서 시작, 뒤로 가기는 보던 위치로 */}
      <ScrollRestoration />

      {/* 스토어의 toast() 로 띄운 알림 */}
      <ToastContainer position="bottom-end" className="p-3 position-fixed">
        {toasts.map((t) => (
          <Toast key={t.id} bg={t.variant}>
            <Toast.Body className="text-white">{t.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </div>
  )
}
