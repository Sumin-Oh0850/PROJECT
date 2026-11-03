import { useEffect, useRef, useState } from 'react'
import { Badge, Button, Card, Col, Row } from 'react-bootstrap'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchJudgeAll, fetchSeaIndex, ping } from '../api/client'
import { displayName } from '../lib/auth'
import { isSupabaseReady, supabase } from '../lib/supabase'
import { STATUS_VARIANT, fmt } from '../lib/format'
import { useAppStore } from '../store/useAppStore'
import IntroHero from '../components/IntroHero'
import StatusBadge from '../components/StatusBadge'
import WeatherBadge from '../components/WeatherBadge'

// 홈 = 서비스 소개 + 지금 현황 + 내 계정
// "동작 체크"(개발자용 점검 카드)는 숨겨 두었고, 주소 뒤에 ?check 를 붙이면(예: /?check) 나타납니다.
export default function Home() {
  const user = useAppStore((s) => s.user)
  const authReady = useAppStore((s) => s.authReady)
  const [params] = useSearchParams()
  const contentRef = useRef(null)
  const [overview, setOverview] = useState({ state: 'wait', list: [] })

  useEffect(() => {
    // 지금 현황: 모든 장소의 가능/주의/위험
    fetchJudgeAll()
      .then((list) => setOverview({ state: 'ok', list }))
      .catch((e) => setOverview({ state: 'fail', list: [], msg: e.message }))
  }, [])

  const count = (status) => overview.list.filter((j) => j.status === status).length

  return (
    <>
      <IntroHero targetRef={contentRef} />

      {/* 소개 문구: 큰 영어 제목 + 설명 (스크롤로 내려오면 가장 먼저 보이는 곳) */}
      <section ref={contentRef} className="home-message" aria-label="소개">
        <h2 className="home-message-title">GO WITH THE WIND, STAY SAFE</h2>
        <p className="home-message-text">좋은 파도보다 먼저 필요한 것은 안전한 하루입니다.<br />바당타기가 제주의 바람과 파도를 읽어 드릴게요.</p>
      </section>

      {/* 제목은 위, 날씨 데이터는 그 아래 줄 */}
      <div className="mb-4">
        <h5 className="fw-bold mb-3"><i className="bi bi-cloud-sun me-2" />오늘 날씨</h5>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <WeatherBadge place="제주시" />
          <WeatherBadge place="서귀포시" />
        </div>
      </div>

      {/* 바다 지수: "오늘 날씨" 바로 아래 */}
      <div className="mb-4"><SeaIndex /></div>

      <h5 className="fw-bold mb-3"><i className="bi bi-traffic-light me-2" />지금 현황</h5>
      <Card className="mb-4">
        <Card.Body>
          {overview.state === 'wait' && <div className="text-muted small">바람과 파도를 확인하는 중...</div>}
          {overview.state === 'fail' && <div className="text-danger small">현황을 불러오지 못했어요: {overview.msg}</div>}
          {overview.state === 'ok' && (
            <>
              <div className="d-flex flex-wrap gap-3 mb-3">
                {['가능', '주의', '위험'].map((s) => (
                  <Badge key={s} bg={STATUS_VARIANT[s]} text={s === '주의' ? 'dark' : undefined} className="fs-6 fw-normal">
                    {s} {count(s)}곳
                  </Badge>
                ))}
              </div>
              <Row xs={1} md={2} className="g-2">
                {overview.list.map((j) => (
                  <Col key={j.id}>
                    {/* 항목 전체를 누르던 방식 → 항목 아래쪽의 긴 "상세" 버튼으로만 이동 */}
                    <div className="border rounded px-3 py-2 h-100 d-flex flex-column gap-2">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <span>
                          <b>{j.site}</b> <small className="text-muted">{j.activity}</small>
                          <div className="small text-muted">풍속 {fmt(j.conditions.wind_ms, 'm/s')} · 돌풍 {fmt(j.conditions.gust_ms, 'm/s')}{j.conditions.wave_m != null && ` · 파도 ${fmt(j.conditions.wave_m, 'm')}`}</div>
                        </span>
                        <span className="flex-shrink-0"><StatusBadge status={j.status} /></span>
                      </div>
                      <Button as={Link} to={`/sites/${j.id}`} size="sm" variant="primary" className="w-100 mt-auto" aria-label={`${j.site} 상세 보기`}>상세</Button>
                    </div>
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

// 바다 지수: 해양조사원 바다여행 예보의 제주 4개 해역 (글자·아이콘·색을 함께 써서 색만으로 구분하지 않음)
const SEA_VARIANT = { 매우좋음: 'success', 좋음: 'success', 보통: 'warning', 나쁨: 'danger', 매우나쁨: 'danger' }
const SEA_ICON = { 매우좋음: 'emoji-smile-fill', 좋음: 'check-circle-fill', 보통: 'dash-circle-fill', 나쁨: 'exclamation-triangle-fill', 매우나쁨: 'x-octagon-fill' }

function SeaIndex() {
  const [sea, setSea] = useState({ state: 'wait' })
  useEffect(() => {
    let alive = true
    fetchSeaIndex()
      .then((d) => alive && setSea({ state: 'ok', data: d }))
      .catch(() => alive && setSea({ state: 'fail' }))
    return () => { alive = false }
  }, [])

  // "지금 현황"과 같은 모양: 제목은 위, 내용은 흰색 카드 안
  const title = <h5 className="fw-bold mb-3"><i className="bi bi-water me-2" />바다 지수</h5>
  if (sea.state === 'wait') return <>{title}<Card><Card.Body><div className="text-muted small">바다 지수를 확인하는 중...</div></Card.Body></Card></>
  if (sea.state === 'fail' || !sea.data.items?.length) {
    return <>{title}<Card><Card.Body><div className="text-muted small"><i className="bi bi-info-circle me-1" />{sea.data?.note ?? '바다 지수를 불러오지 못했어요.'}</div></Card.Body></Card></>
  }
  const { items, note, date, period } = sea.data
  return (
    <>
      {title}
      <Card>
        <Card.Body>
      <div className="small text-muted mb-3">제주 4개 해역 · {String(date).slice(5).replace('-', '/')} {period}</div>
      <Row xs={2} md={4} className="g-2">
        {items.map((s) => (
          <Col key={s.area}>
            <div className="border rounded px-3 py-2 h-100">
              <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
                <b>{s.area.replace(/^제주/, '')}</b>
                <Badge bg={SEA_VARIANT[s.index] ?? 'secondary'} text={SEA_VARIANT[s.index] === 'warning' ? 'dark' : undefined} className="fw-normal">
                  <i className={`bi bi-${SEA_ICON[s.index] ?? 'question-circle'} me-1`} />{s.index}
                </Badge>
              </div>
              <div className="small text-muted">
                수온 {fmt(s.sea_temp_c, '℃')} · 파도 {fmt(s.wave_m, 'm')}<br />
                풍속 {fmt(s.wind_ms, 'm/s')} · {s.tide || '조석 정보 없음'}<br />
                {s.weather}
              </div>
            </div>
          </Col>
        ))}
      </Row>
      <div className="small text-muted mt-2">{note}</div>
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
