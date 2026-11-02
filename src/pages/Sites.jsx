import { useEffect, useState } from 'react'
import { Alert, Col, Row, ToggleButton, ButtonGroup } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import SiteCard from '../components/SiteCard'
import { Empty, ErrorAlert, Loading } from '../components/Status'
import { fetchJudgeAll } from '../api/client'
import { isSample } from '../lib/format'
import { useAppStore } from '../store/useAppStore'

const ACTIVITIES = [
  { value: '', label: '전체' },
  { value: 'surfing', label: '서핑' },
  { value: 'windsurfing', label: '윈드서핑' },
  { value: 'paragliding', label: '패러글라이딩' },
]

// 장소 목록 + 지금 해도 되는지 판정 (list_sites → get_wind_gusts → judge_activity)
export default function Sites() {
  const addFavorite = useAppStore((s) => s.addFavorite)
  const [activity, setActivity] = useState('')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <>
      <PageHeader icon="geo-alt" title="장소·판정" subtitle="지금 바람·돌풍·파고로 서핑 / 윈드서핑 / 패러글라이딩을 해도 되는지 보여 줘요" />

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

      {loading ? <Loading text="바람과 파도를 확인하는 중..." /> : list.length === 0 ? <Empty text="장소가 없어요" /> : (
        <Row xs={1} sm={2} lg={3} className="g-3">
          {list.map((j) => (
            <Col key={j.id}>
              <SiteCard judgement={j} onSave={() => addFavorite({ source: 'site', id: j.id, title: j.site })} />
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
