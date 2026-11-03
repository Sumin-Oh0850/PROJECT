import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Badge, ButtonGroup, Col, Row, ToggleButton } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import SiteCard from '../components/SiteCard'
import SiteMap from '../components/SiteMap'
import { Empty, ErrorAlert, Loading } from '../components/Status'
import { fetchJudgeAll } from '../api/client'
import { STATUS_VARIANT, isSample } from '../lib/format'
import { useAppStore } from '../store/useAppStore'

const ACTIVITIES = [
  { value: '', label: '전체' },
  { value: 'surfing', label: '서핑' },
  { value: 'windsurfing', label: '윈드서핑' },
  { value: 'paragliding', label: '패러글라이딩' },
]

// 장소 목록 + 지금 해도 되는지 판정 + 지도 (list_sites → get_wind_gusts → judge_activity)
export default function Sites() {
  const navigate = useNavigate()
  const addFavorite = useAppStore((s) => s.addFavorite)
  const [activity, setActivity] = useState('')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [focus, setFocus] = useState(null)
  const mapBox = useRef(null)

  useEffect(() => {
    let alive = true // 필터를 빠르게 바꿀 때 늦게 도착한 이전 응답을 무시
    setLoading(true)
    setError('')
    fetchJudgeAll(activity)
      .then((data) => alive && setList(data))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [activity])

  const openDetail = useCallback((id) => navigate(`/sites/${id}`), [navigate])
  // 카드의 "지도에서 보기": 지도로 스크롤하고 그 장소로 이동
  const locate = (id) => {
    mapBox.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setFocus({ id })
  }

  return (
    <>
      <PageHeader icon="geo-alt" title="서핑" subtitle="지금 바람·돌풍·파도로 서핑 / 윈드서핑 / 패러글라이딩을 해도 되는지 보여 줘요" />

      <ButtonGroup className="mb-3 flex-wrap">
        {ACTIVITIES.map((a) => (
          <ToggleButton key={a.value} id={`act-${a.value || 'all'}`} type="radio" variant="outline-primary"
            name="activity" value={a.value} checked={activity === a.value} onChange={() => setActivity(a.value)}>
            {a.label}
          </ToggleButton>
        ))}
      </ButtonGroup>

      <ErrorAlert error={error} />
      {list.some(isSample) && (
        <Alert variant="warning" className="small">
          <i className="bi bi-info-circle me-2" />일부 값은 외부 날씨 서버에 연결하지 못해 <b>연습용 샘플 값</b>이에요. 실제 활동 판단에는 쓰지 마세요.
        </Alert>
      )}

      {/* 지도: 마커 색 = 판정. 로딩 중에도 먼저 보여 주고, 판정이 도착하면 마커만 채웁니다 */}
      <div ref={mapBox} className="mb-3">
        <div className="d-flex flex-wrap gap-2 mb-2" aria-label="범례">
          {['가능', '주의', '위험'].map((s) => (
            <Badge key={s} bg={STATUS_VARIANT[s]} text={s === '주의' ? 'dark' : undefined} className="fw-normal">
              {s} {list.filter((j) => j.status === s).length}곳
            </Badge>
          ))}
          <span className="small text-muted align-self-center">마커를 누르면 조건이 나와요</span>
        </div>
        <SiteMap items={list} onSelect={openDetail} focus={focus} height={380} />
      </div>

      {loading ? <Loading text="바람과 파도를 확인하는 중..." /> : list.length === 0 ? <Empty text="장소가 없어요" /> : (
        <Row xs={1} sm={2} lg={3} className="g-3">
          {list.map((j) => (
            <Col key={j.id}>
              <SiteCard judgement={j} onLocate={() => locate(j.id)}
                onSave={() => addFavorite({ source: 'site', id: j.id, title: j.site })} />
            </Col>
          ))}
        </Row>
      )}

      <p className="small text-muted mt-4 mb-0">
        <i className="bi bi-exclamation-circle me-1" />판정 기준은 초보자 기준의 학습·참고용 예시입니다. 실제 활동 전에는 기상특보와 현장 강사·업체의 안내를 따르세요.
      </p>
    </>
  )
}
