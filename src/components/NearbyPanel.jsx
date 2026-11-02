import { useEffect, useState } from 'react'
import { Alert, Badge, ListGroup, Tab, Tabs } from 'react-bootstrap'
import { fetchNearby } from '../api/client'
import { Loading } from './Status'

const TABS = [
  { kind: 'restaurant', label: '맛집', icon: 'egg-fried' },
  { kind: 'cafe', label: '카페', icon: 'cup-hot' },
  { kind: 'shower', label: '샤워실', icon: 'droplet' },
  { kind: 'attraction', label: '관광지', icon: 'binoculars' },
]

// 장소 주변의 맛집 · 카페 · 공용샤워실 · 관광지. 탭을 열 때 처음 한 번만 불러옵니다.
export default function NearbyPanel({ siteId }) {
  const [active, setActive] = useState('restaurant')
  const [byKind, setByKind] = useState({}) // kind → { state: 'loading' | 'ok' | 'error', data?, error? }

  useEffect(() => {
    if (byKind[active]) return // 이미 불러왔거나 불러오는 중
    setByKind((s) => ({ ...s, [active]: { state: 'loading' } }))
    fetchNearby(siteId, active)
      .then((data) => setByKind((s) => ({ ...s, [active]: { state: 'ok', data } })))
      .catch((e) => setByKind((s) => ({ ...s, [active]: { state: 'error', error: e.message } })))
  }, [active, siteId, byKind])

  return (
    <>
      <h5 className="fw-bold mb-3"><i className="bi bi-signpost-split me-2" />주변 정보</h5>
      <Tabs activeKey={active} onSelect={(k) => setActive(k)} className="mb-3" justify>
        {TABS.map((t) => (
          <Tab key={t.kind} eventKey={t.kind} title={<><i className={`bi bi-${t.icon} me-1`} />{t.label}</>}>
            <Result entry={byKind[t.kind]} kind={t.kind} />
          </Tab>
        ))}
      </Tabs>
    </>
  )
}

function Result({ entry, kind }) {
  if (!entry || entry.state === 'loading') return <Loading text="찾는 중..." />
  if (entry.state === 'error') return <Alert variant="danger">{entry.error}</Alert>

  const { items, note, source, radius_m } = entry.data
  return (
    <>
      {note && (
        <Alert variant={source === 'unavailable' ? 'warning' : items.length ? 'light' : 'secondary'} className="small py-2">
          <i className={`bi bi-${source === 'unavailable' ? 'exclamation-triangle' : 'info-circle'} me-2`} />{note}
        </Alert>
      )}
      {items.length > 0 && (
        <ListGroup>
          {items.map((it) => (
            <ListGroup.Item key={it.id ?? it.name} className="d-flex justify-content-between align-items-start gap-3">
              <div>
                <div className="fw-bold">
                  {it.name}
                  {kind === 'shower' && it.fee === 'no' && <Badge bg="success" className="ms-2 fw-normal">무료</Badge>}
                  {kind === 'shower' && it.fee === 'yes' && <Badge bg="secondary" className="ms-2 fw-normal">유료</Badge>}
                </div>
                {it.address && <div className="small text-muted">{it.address}</div>}
                {it.phone && <div className="small text-muted"><i className="bi bi-telephone me-1" />{it.phone}</div>}
              </div>
              <div className="text-end text-nowrap">
                {it.distance_m != null && <Badge bg="light" text="dark" className="fw-normal border">{it.distance_m >= 1000 ? `${(it.distance_m / 1000).toFixed(1)}km` : `${it.distance_m}m`}</Badge>}
                <div><a className="small" href={it.map_url} target="_blank" rel="noreferrer">지도</a></div>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
      {items.length > 0 && <div className="small text-muted mt-2">반경 {radius_m / 1000}km 안, 가까운 순</div>}
    </>
  )
}
