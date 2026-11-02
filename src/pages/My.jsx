import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ItemCard from '../components/ItemCard'
import { Empty, Loading } from '../components/Status'
import { fetchSites, fetchSpots } from '../api/client'
import { enrichFavorite } from '../lib/favorites'
import { useAppStore } from '../store/useAppStore'

// 저장한 곳의 종류 이름 (favorites.source 값 → 화면 표시)
const SOURCE_LABEL = { site: '레저 장소', beach: '해변', tour: '관광지', heritage: '국가유산' }

// 즐겨찾기 — 로그인한 사용자 본인이 저장한 것만 보여줍니다 (STEP 5)
export default function My() {
  const { user, authReady, favorites, favLoading, loadFavorites, removeFavorite } = useAppStore()
  const [spots, setSpots] = useState([])
  const [sites, setSites] = useState([])

  useEffect(() => { loadFavorites() }, [user?.id, loadFavorites])

  // 사진·분류·주소는 favorites 에 저장돼 있지 않아서, 원본 목록(관광지·레저 장소)에서 찾아 붙입니다.
  // 하나가 실패해도 나머지는 보이도록 따로 불러오고, 실패하면 이름만 있는 카드로 보여 줍니다.
  useEffect(() => {
    if (!user) return
    let alive = true
    fetchSpots().then((d) => alive && setSpots(d.items ?? [])).catch(() => {})
    fetchSites().then((d) => alive && setSites(d)).catch(() => {})
    return () => { alive = false }
  }, [user])

  const lookup = useMemo(() => ({
    spotById: new Map(spots.map((s) => [String(s.id), s])),
    siteById: new Map(sites.map((s) => [s.id, s])),
  }), [spots, sites])

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
          {favorites.map((f) => {
            const info = enrichFavorite(f, lookup)
            return (
              <Col key={f.id}>
                <ItemCard title={f.title} image={info.image} icon={info.icon} badge={SOURCE_LABEL[f.source] ?? f.source}
                  subtitle={<>{info.lines.map((line) => <span key={line} className="d-block">{line}</span>)}<span className="d-block mt-1">저장 {new Date(f.created_at).toLocaleString('ko-KR')}</span></>}
                  to={f.source === 'site' ? `/sites/${f.item_id}` : undefined}
                  onRemove={() => removeFavorite(f.id)} />
              </Col>
            )
          })}
        </Row>
      )}
    </>
  )
}
