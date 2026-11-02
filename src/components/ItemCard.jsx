import { Badge, Button, Card } from 'react-bootstrap'
import { Link } from 'react-router-dom'

// 관광지·해변·즐겨찾기 등 "목록의 한 칸"을 모두 이 카드 하나로 표시합니다 (재사용 컴포넌트)
//  - badge/badgeColor: 종류 라벨(색을 주면 그 색으로)
//  - onSave: 즐겨찾기 · onLocate: 지도에서 보기 · to: 상세 링크 · onRemove: 삭제
export default function ItemCard({ title, subtitle, image, badge, badgeColor, to, onSave, onLocate, onRemove }) {
  const hasActions = onSave || onLocate || to || onRemove
  return (
    <Card className="h-100 item-card">
      {image
        ? <Card.Img variant="top" src={image} alt={title} className="item-card-img" loading="lazy" />
        : <div className="item-card-img placeholder-img"><i className="bi bi-image" /></div>}
      <Card.Body className="d-flex flex-column">
        {badge && (
          <Badge bg={badgeColor ? undefined : 'secondary'} style={badgeColor ? { backgroundColor: badgeColor } : undefined} className="align-self-start mb-2">
            {badge}
          </Badge>
        )}
        <Card.Title className="fs-6 fw-bold">{title}</Card.Title>
        {subtitle && <Card.Text className="small text-muted">{subtitle}</Card.Text>}
        {hasActions && (
          <div className="mt-auto d-flex gap-2">
            {to && <Button as={Link} to={to} size="sm" variant="primary" className="flex-grow-1">자세히</Button>}
            {onLocate && (
              <Button size="sm" variant="outline-secondary" onClick={onLocate} title="지도에서 보기" aria-label={`${title} 지도에서 보기`}>
                <i className="bi bi-geo-alt" />
              </Button>
            )}
            {onSave && (
              <Button size="sm" variant="outline-primary" className={to || onLocate ? '' : 'flex-grow-1'} onClick={onSave} aria-label={`${title} 즐겨찾기`}>
                <i className="bi bi-star me-1" />즐겨찾기
              </Button>
            )}
            {onRemove && (
              <Button size="sm" variant="outline-danger" className={to ? '' : 'flex-grow-1'} onClick={onRemove}>
                <i className="bi bi-trash me-1" />삭제
              </Button>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  )
}
