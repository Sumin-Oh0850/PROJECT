import { Badge } from 'react-bootstrap'
import { STATUS_ICON, STATUS_VARIANT } from '../lib/format'

// 가능 / 주의 / 불가 를 색과 아이콘으로 보여 주는 배지 (색만으로 구분하지 않도록 글자도 함께 표시)
export default function StatusBadge({ status, size = 'normal' }) {
  const variant = STATUS_VARIANT[status] ?? 'secondary'
  return (
    <Badge bg={variant} text={variant === 'warning' ? 'dark' : undefined} className={size === 'lg' ? 'fs-6 px-3 py-2' : ''}>
      <i className={`bi bi-${STATUS_ICON[status] ?? 'question-circle'} me-1`} />{status}
    </Badge>
  )
}
