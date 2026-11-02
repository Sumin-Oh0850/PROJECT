import { useEffect, useState } from 'react'
import { Alert, Badge } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import SiteMap from '../components/SiteMap'
import { ErrorAlert, Loading } from '../components/Status'
import { fetchJudgeAll } from '../api/client'
import { STATUS_VARIANT, isSample } from '../lib/format'

// 제주 지도: 레저 장소를 판정 색으로 표시
export default function MapPage() {
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    fetchJudgeAll()
      .then((d) => alive && setList(d))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  return (
    <>
      <PageHeader icon="map" title="제주 지도" subtitle="마커 색은 지금 바람·파도로 본 판정이에요. 마커를 누르면 자세한 조건이 나와요" />

      <div className="d-flex flex-wrap gap-2 mb-3" aria-label="범례">
        {['가능', '주의', '불가'].map((s) => (
          <Badge key={s} bg={STATUS_VARIANT[s]} text={s === '주의' ? 'dark' : undefined} className="fw-normal">
            {s} {list.filter((j) => j.status === s).length}곳
          </Badge>
        ))}
      </div>

      <ErrorAlert error={error} />
      {list.some(isSample) && (
        <Alert variant="warning" className="small">
          <i className="bi bi-info-circle me-2" />일부 값은 연습용 샘플 값이에요. 실제 활동 판단에는 쓰지 마세요.
        </Alert>
      )}
      {loading && <Loading text="바람과 파도를 확인하는 중..." />}
      {/* 지도는 로딩 중에도 먼저 보여 주고, 판정이 도착하면 마커만 채웁니다 */}
      <SiteMap items={list} onSelect={(id) => navigate(`/sites/${id}`)} />
    </>
  )
}
