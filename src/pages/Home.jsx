import { useEffect, useState } from 'react'
import { Badge, Button, Card, Col, Row } from 'react-bootstrap'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchJudgeAll, ping } from '../api/client'
import { displayName } from '../lib/auth'
import { isSupabaseReady, supabase } from '../lib/supabase'
import { STATUS_VARIANT, fmt } from '../lib/format'
import { useAppStore } from '../store/useAppStore'
import StatusBadge from '../components/StatusBadge'
import WeatherBadge from '../components/WeatherBadge'

// 홈 = 서비스 소개 + 지금 현황 + 내 계정
// "동작 체크"(개발자용 점검 카드)는 숨겨 두었고, 주소 뒤에 ?check 를 붙이면(예: /?check) 나타납니다.
export default function Home() {
  const user = useAppStore((s) => s.user)
  const authReady = useAppStore((s) => s.authReady)
  const [params] = useSearchParams()
  const [overview, setOverview] = useState({ state: 'wait', list: [] })

  useEffect(() => {
    // 지금 현황: 모든 장소의 가능/주의/불가
    fetchJudgeAll()
      .then((list) => setOverview({ state: 'ok', list }))
      .catch((e) => setOverview({ state: 'fail', list: [], msg: e.message }))
  }, [])

  const count = (status) => overview.list.filter((j) => j.status === status).length

  return (
    <>
      <section className="hero rounded-4 p-4 p-md-5 mb-4">
        <Badge bg="light" text="dark" className="mb-3">서핑 · 윈드서핑 · 패러글라이딩</Badge>
        <h1 className="fw-bold">오늘, 제주 바다와 하늘은 탈 수 있을까?</h1>
        <p className="lead">풍속·돌풍·파고를 보고 가능 / 주의 / 불가를 알려 드려요. 주변 맛집·카페·샤워실·관광지까지 한 번에.</p>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <Button as={Link} to="/sites" variant="light"><i className="bi bi-geo-alt me-1" />장소·판정 보기</Button>
          <WeatherBadge place="서귀포시" />
        </div>
      </section>

      <h5 className="fw-bold mb-3"><i className="bi bi-traffic-light me-2" />지금 현황</h5>
      <Card className="mb-4">
        <Card.Body>
          {overview.state === 'wait' && <div className="text-muted small">바람과 파도를 확인하는 중...</div>}
          {overview.state === 'fail' && <div className="text-danger small">현황을 불러오지 못했어요: {overview.msg}</div>}
          {overview.state === 'ok' && (
            <>
              <div className="d-flex flex-wrap gap-3 mb-3">
                {['가능', '주의', '불가'].map((s) => (
                  <Badge key={s} bg={STATUS_VARIANT[s]} text={s === '주의' ? 'dark' : undefined} className="fs-6 fw-normal">
                    {s} {count(s)}곳
                  </Badge>
                ))}
              </div>
              <Row xs={1} md={2} className="g-2">
                {overview.list.map((j) => (
                  <Col key={j.id}>
                    <Link to={`/sites/${j.id}`} className="d-flex justify-content-between align-items-center text-decoration-none text-body border rounded px-3 py-2">
                      <span>
                        <b>{j.site}</b> <small className="text-muted">{j.activity}</small>
                        <div className="small text-muted">풍속 {fmt(j.conditions.wind_ms, 'm/s')} · 돌풍 {fmt(j.conditions.gust_ms, 'm/s')}{j.conditions.wave_m != null && ` · 파고 ${fmt(j.conditions.wave_m, 'm')}`}</div>
                      </span>
                      <StatusBadge status={j.status} />
                    </Link>
                  </Col>
                ))}
              </Row>
            </>
          )}
        </Card.Body>
      </Card>

      {/* 개발자용 점검 카드: /?check 일 때만 보임 (이때만 점검 요청도 보냄) */}
      {params.has('check') && <SystemCheck />}

      <Card className="mt-4">
        <Card.Body className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <Card.Title className="fs-6 fw-bold mb-1"><i className="bi bi-person-circle me-2" />내 계정</Card.Title>
            <div className="small text-muted">
              {!authReady ? '확인 중...' : user ? `${displayName(user)}님으로 로그인했어요. 즐겨찾기가 내 계정에 저장돼요.` : '로그인하면 즐겨찾기를 내 계정에 저장할 수 있어요.'}
            </div>
          </div>
          {authReady && (user ? (
            <Button as={Link} to="/account" size="sm" variant="outline-primary">내 정보</Button>
          ) : (
            <span className="d-flex gap-2">
              <Button as={Link} to="/login" size="sm">로그인</Button>
              <Button as={Link} to="/signup" size="sm" variant="outline-primary">회원가입</Button>
            </span>
          ))}
        </Card.Body>
      </Card>
    </>
  )
}

// 동작 체크: React·라우터, Supabase 연결, 서버 함수(/api)
function SystemCheck() {
  const [db, setDb] = useState(isSupabaseReady
    ? { state: 'wait', msg: '확인 중...' }
    : { state: 'fail', msg: '.env.local 에 VITE_SUPABASE_URL / ANON_KEY 를 넣으세요' })
  const [api, setApi] = useState({ state: 'wait', msg: '확인 중...' })

  useEffect(() => {
    if (isSupabaseReady) supabase.from('favorites').select('id').limit(1).then(({ error }) =>
      setDb(error ? { state: 'fail', msg: error.message } : { state: 'ok', msg: '연결 OK' }))

    ping()
      .then((d) => setApi({ state: 'ok', msg: `OK · 공공데이터 키 ${d.hasDataKey ? '있음' : '없음'} · Claude 키 ${d.hasClaudeKey ? '있음' : '없음'}` }))
      .catch(() => setApi({ state: 'fail', msg: '서버 함수(/api)에 연결하지 못했어요. npm run dev 로 실행했는지 확인' }))
  }, [])

  return (
    <>
      <h5 className="fw-bold mb-3"><i className="bi bi-clipboard-check me-2" />동작 체크</h5>
      <Row xs={1} md={3} className="g-3">
        <Col><Check title="React · 라우터" state="ok" msg="이 화면이 보이면 OK" /></Col>
        <Col><Check title="Supabase" {...db} /></Col>
        <Col><Check title="서버 함수 /api" {...api} /></Col>
      </Row>
    </>
  )
}

function Check({ title, state, msg }) {
  const icon = { ok: 'check-circle-fill text-success', fail: 'x-circle-fill text-danger', wait: 'hourglass-split text-muted' }[state]
  return (
    <Card className="h-100">
      <Card.Body>
        <div className="fw-bold mb-1"><i className={`bi bi-${icon} me-2`} />{title}</div>
        <div className="small text-muted">{msg}</div>
      </Card.Body>
    </Card>
  )
}
