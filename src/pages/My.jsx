import { useEffect } from 'react'
import { Alert, Button, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ItemCard from '../components/ItemCard'
import { Empty, Loading } from '../components/Status'
import { useAppStore } from '../store/useAppStore'

// 저장한 곳의 종류 이름 (favorites.source 값 → 화면 표시)
const SOURCE_LABEL = { site: '레저 장소', beach: '해변', tour: '관광지', heritage: '국가유산' }

// 즐겨찾기 — 로그인한 사용자 본인이 저장한 것만 보여줍니다 (STEP 5)
export default function My() {
  const { user, authReady, favorites, favLoading, loadFavorites, removeFavorite } = useAppStore()

  useEffect(() => { loadFavorites() }, [user?.id, loadFavorites])

  if (!authReady) return <Loading text="확인하는 중..." />

  return (
    <>
      <PageHeader icon="star" title="내 즐겨찾기" subtitle="내 계정에 저장한 장소·해변·관광지" />
      {!user ? (
        <Alert variant="info" className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span><i className="bi bi-lock me-2" />로그인하면 내 즐겨찾기를 볼 수 있어요</span>
          <span className="d-flex gap-2">
            <Button as={Link} to="/login" state={{ from: '/my' }} size="sm">로그인</Button>
            <Button as={Link} to="/signup" state={{ from: '/my' }} size="sm" variant="outline-primary">회원가입</Button>
          </span>
        </Alert>
      ) : favLoading ? <Loading /> : favorites.length === 0 ? <Empty text="아직 저장한 항목이 없어요" /> : (
        <Row xs={1} sm={2} lg={3} className="g-3">
          {favorites.map((f) => (
            <Col key={f.id}>
              <ItemCard title={f.title} badge={SOURCE_LABEL[f.source] ?? f.source} subtitle={new Date(f.created_at).toLocaleString('ko-KR')}
                to={f.source === 'site' ? `/sites/${f.item_id}` : undefined}
                onRemove={() => removeFavorite(f.id)} />
            </Col>
          ))}
        </Row>
      )}
    </>
  )
}
