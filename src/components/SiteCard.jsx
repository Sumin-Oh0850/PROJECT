import { Badge, Button, Card } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import { ACTIVITY_ICON, STATUS_VARIANT, fmt } from '../lib/format'

// 레저 장소 한 칸: 활동 종류 · 판정 · 핵심 수치 · 이유
export default function SiteCard({ judgement: j, onSave }) {
  const c = j.conditions
  return (
    <Card className={`h-100 item-card border-2 border-${STATUS_VARIANT[j.status]}`}>
      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Badge bg="secondary"><i className={`bi bi-${ACTIVITY_ICON[j.activity_key]} me-1`} />{j.activity}</Badge>
          <StatusBadge status={j.status} />
        </div>

        <Card.Title className="fs-6 fw-bold">{j.site}</Card.Title>
        <div className="small mb-2">
          <i className="bi bi-wind me-1" />풍속 <b>{fmt(c.wind_ms, 'm/s')}</b>
          <span className="mx-1">·</span>돌풍 <b>{fmt(c.gust_ms, 'm/s')}</b>
          {c.wave_m != null && <><span className="mx-1">·</span><i className="bi bi-water me-1" />파고 <b>{fmt(c.wave_m, 'm')}</b></>}
        </div>
        <div className="small text-muted mb-3">{j.reasons.join(' · ')}</div>

        <div className="mt-auto d-flex gap-2">
          <Button as={Link} to={`/sites/${j.id}`} size="sm" variant="primary" className="flex-grow-1">
            자세히 <i className="bi bi-chevron-right" />
          </Button>
          {onSave && (
            <Button size="sm" variant="outline-primary" onClick={onSave} title="즐겨찾기" aria-label={`${j.site} 즐겨찾기`}>
              <i className="bi bi-star" />
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  )
}
