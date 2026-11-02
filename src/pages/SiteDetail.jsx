import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, Col, Row } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import NearbyPanel from '../components/NearbyPanel'
import StatusBadge from '../components/StatusBadge'
import { ErrorAlert, Loading } from '../components/Status'
import { fetchJudge } from '../api/client'
import { ACTIVITY_ICON, STATUS_VARIANT, fmt, isSample, windDirText } from '../lib/format'
import { useAppStore } from '../store/useAppStore'

// 한 장소의 판정 · 이유 · 조건값 상세
export default function SiteDetail() {
  const { id } = useParams()
  const addFavorite = useAppStore((s) => s.addFavorite)
  const [j, setJ] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setJ(null)
    setError('')
    fetchJudge(id).then((d) => alive && setJ(d)).catch((e) => alive && setError(e.message))
    return () => { alive = false }
  }, [id])

  if (error) {
    return (
      <>
        <ErrorAlert error={error} />
        <Button as={Link} to="/sites" variant="outline-primary"><i className="bi bi-arrow-left me-1" />장소 목록으로</Button>
      </>
    )
  }
  if (!j) return <Loading text="바람과 파도를 확인하는 중..." />

  const c = j.conditions
  const stats = [
    ['wind', '풍속', fmt(c.wind_ms, ' m/s')],
    ['tornado', '돌풍', fmt(c.gust_ms, ' m/s')],
    ['activity', '돌풍 편차', fmt(c.gust_spread_ms, ' m/s')],
    ['compass', '풍향', windDirText(c.wind_dir_deg)],
    ...(c.wave_m != null ? [['water', '파도', fmt(c.wave_m, ' m')]] : []),
    ...(c.sea_temp_c != null ? [['thermometer-half', '수온', fmt(c.sea_temp_c, ' ℃')]] : []),
    ['thermometer-sun', '기온', fmt(c.temp_c, ' ℃')],
    ['cloud-rain', '강수', fmt(c.precip_mm, ' mm')],
  ]
  const osm = `https://www.openstreetmap.org/?mlat=${j.lat}&mlon=${j.lng}#map=15/${j.lat}/${j.lng}`

  return (
    <>
      <Button as={Link} to="/sites" variant="link" className="px-0 mb-2"><i className="bi bi-arrow-left me-1" />장소 목록</Button>

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <Badge bg="secondary" className="mb-2"><i className={`bi bi-${ACTIVITY_ICON[j.activity_key]} me-1`} />{j.activity}</Badge>
          <h2 className="fw-bold mb-1">{j.site}</h2>
          <p className="text-muted mb-0">{j.note}</p>
        </div>
        <StatusBadge status={j.status} size="lg" />
      </div>

      {isSample(j) && (
        <Alert variant="warning" className="small">
          <i className="bi bi-info-circle me-2" />외부 날씨 서버에 연결하지 못해 <b>연습용 샘플 값</b>을 보여 주고 있어요. 실제 활동 판단에는 쓰지 마세요.
        </Alert>
      )}

      <Card className={`mb-4 border-2 border-${STATUS_VARIANT[j.status]}`}>
        <Card.Body>
          <Card.Title className="fs-6 fw-bold">왜 {j.status}일까요?</Card.Title>
          <ul className="mb-2">
            {j.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
          {j.tips.map((t) => (
            <div key={t} className="small text-success"><i className="bi bi-lightbulb me-1" />{t}</div>
          ))}
        </Card.Body>
      </Card>

      <h5 className="fw-bold mb-3"><i className="bi bi-speedometer2 me-2" />지금 조건 {c.time && <small className="text-muted fw-normal">({String(c.time).replace('T', ' ')})</small>}</h5>
      <Row xs={2} md={4} className="g-3 mb-4">
        {stats.map(([icon, label, value]) => (
          <Col key={label}>
            <Card className="h-100 text-center">
              <Card.Body className="py-3">
                <div className="text-muted small"><i className={`bi bi-${icon} me-1`} />{label}</div>
                <div className="fs-5 fw-bold">{value}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      {j.activity_key === 'surfing' && c.offshore != null && (
        <p className="small text-muted">
          <i className="bi bi-compass me-1" />바람 방향: {c.offshore ? '오프쇼어(육지→바다)' : '온쇼어(바다→육지)'}
        </p>
      )}

      <div className="d-flex flex-wrap gap-2 mb-4">
        <Button variant="outline-primary" onClick={() => addFavorite({ source: 'site', id: j.id, title: j.site })}>
          <i className="bi bi-star me-1" />즐겨찾기
        </Button>
        <Button variant="outline-secondary" href={osm} target="_blank" rel="noreferrer">
          <i className="bi bi-map me-1" />지도에서 보기 (OpenStreetMap)
        </Button>
      </div>

      <NearbyPanel key={j.id} siteId={j.id} />

      <p className="small text-muted mt-4 mb-0">
        <i className="bi bi-exclamation-circle me-1" />판정은 학습·참고용입니다. 실제 활동 전에는 기상특보와 현장 강사·업체의 안내를 따르세요.
      </p>
    </>
  )
}
