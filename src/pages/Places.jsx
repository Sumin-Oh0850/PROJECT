import { useEffect, useState } from 'react'
import { Alert, Button, Col, Form, InputGroup, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import ItemCard from '../components/ItemCard'
import { Empty, ErrorAlert, Loading } from '../components/Status'
import { fetchBeaches, fetchPlaces } from '../api/client'
import { useAppStore } from '../store/useAppStore'

const TYPES = { 12: '관광지', 28: '레포츠', 39: '음식점', 14: '문화시설', 15: '축제·행사' }
const QUICK = ['오름', '올레', '서핑', '해녀']

export default function Places() {
  const addFavorite = useAppStore((s) => s.addFavorite)   // STEP 5에서 사용
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState('12')
  const [places, setPlaces] = useState([])               // ① 데이터
  const [loading, setLoading] = useState(true)           // ② 로딩
  const [error, setError] = useState('')                 // ③ 에러
  const [beaches, setBeaches] = useState({ state: 'wait', items: [], note: '' })

  async function search(e, overrides = {}) {
    e?.preventDefault()                                  // 폼 제출 시 새로고침 막기
    const q = overrides.keyword ?? keyword
    setLoading(true); setError('')
    try { setPlaces(await fetchPlaces(q, overrides.type ?? type)) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { search() }, [])                      // 처음 한 번 자동 검색

  useEffect(() => {                                       // 해변 목록
    fetchBeaches()
      .then((d) => setBeaches({ state: 'ok', items: d.items, note: d.note, source: d.source }))
      .catch((e) => setBeaches({ state: 'error', items: [], note: e.message }))
  }, [])

  return (
    <>
      <PageHeader icon="umbrella" title="관광지·해변" subtitle="한국관광공사 TourAPI에 등록된 제주 해변과 관광지" />

      <h5 className="fw-bold mb-3"><i className="bi bi-sun me-2" />제주 해변</h5>
      {beaches.state === 'wait' && <Loading text="해변을 찾는 중..." />}
      {beaches.state !== 'wait' && beaches.items.length === 0 && (
        <Alert variant="warning" className="small"><i className="bi bi-exclamation-triangle me-2" />{beaches.note || '해변 정보를 불러오지 못했어요'}</Alert>
      )}
      {beaches.items.length > 0 && (
        <Row xs={1} sm={2} lg={4} className="g-3 mb-4">
          {beaches.items.map((b) => (
            <Col key={b.id}>
              <ItemCard title={b.name} subtitle={b.address} image={b.image} badge="해변"
                onSave={() => addFavorite({ source: 'beach', id: b.id, title: b.name })} />
            </Col>
          ))}
        </Row>
      )}

      <h5 className="fw-bold mb-3"><i className="bi bi-search me-2" />관광지 검색</h5>
      <Form onSubmit={search} className="mb-2">
        <InputGroup>
          <Form.Select value={type} onChange={(e) => setType(e.target.value)} style={{ maxWidth: 140 }} aria-label="종류">
            {Object.entries(TYPES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </Form.Select>
          <Form.Control value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="검색어 (비우면 전체)" />
          <Button type="submit" aria-label="검색"><i className="bi bi-search" /></Button>
        </InputGroup>
      </Form>
      <div className="d-flex flex-wrap gap-2 mb-4">
        {QUICK.map((q) => (
          <Button key={q} size="sm" variant="outline-secondary" onClick={() => { setKeyword(q); search(null, { keyword: q }) }}>{q}</Button>
        ))}
      </div>

      <ErrorAlert error={error} />
      {loading ? <Loading /> : places.length === 0 ? <Empty /> : (
        <Row xs={1} sm={2} lg={3} className="g-3">
          {places.map((p) => (
            <Col key={p.id}>
              <ItemCard title={p.title} subtitle={p.addr} image={p.image} badge={TYPES[p.type]}
                onSave={() => addFavorite({ source: 'tour', id: p.id, title: p.title })} />
            </Col>
          ))}
        </Row>
      )}
    </>
  )
}
