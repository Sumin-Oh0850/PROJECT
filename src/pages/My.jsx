import { useEffect } from 'react'
import { Col, Form, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import ItemCard from '../components/ItemCard'
import { Empty, Loading } from '../components/Status'
import { useAppStore } from '../store/useAppStore'

// 저장한 곳의 종류 이름 (favorites.source 값 → 화면 표시)
const SOURCE_LABEL = { site: '레저 장소', beach: '해변', tour: '관광지', heritage: '국가유산' }

// 즐겨찾기 — store 의 favorites 를 그대로 보여줍니다 (STEP 5)
export default function My() {
  const { nickname, setNickname, favorites, favLoading, loadFavorites, removeFavorite } = useAppStore()

  useEffect(() => { loadFavorites() }, [nickname, loadFavorites])

  return (
    <>
      <PageHeader icon="star" title="내 즐겨찾기" subtitle="닉네임별로 Supabase에 저장한 장소·해변·관광지" />
      <Form.Control className="mb-4" style={{ maxWidth: 320 }} placeholder="닉네임"
        value={nickname} onChange={(e) => setNickname(e.target.value)} />
      {favLoading ? <Loading /> : favorites.length === 0 ? <Empty text="아직 저장한 항목이 없어요" /> : (
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
