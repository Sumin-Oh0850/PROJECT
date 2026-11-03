import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, ButtonGroup, Col, Form, InputGroup, Row, ToggleButton } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import ItemCard from '../components/ItemCard'
import MapView from '../components/MapView'
import { Empty, ErrorAlert, Loading } from '../components/Status'
import { fetchSpots } from '../api/client'
import { useAppStore } from '../store/useAppStore'

const PAGE = 24
const JEJU_BOUNDS = [[33.1, 126.15], [33.6, 126.98]] // 처음 보이는 범위: 제주 본섬 (추자도는 지도를 옮기면 보임)
const REGIONS = ['', '제주시', '서귀포시']

// 관광지: 한국관광공사 관광지 중 분류·위치가 고르게 퍼지도록 고른 약 100곳 + 해변 + 비짓제주 레저 시설 + 지도
export default function Places() {
  const addFavorite = useAppStore((s) => s.addFavorite)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [group, setGroup] = useState('')       // '' 전체 | 묶음 key | 'beach'(해수욕장·해변)
  const [region, setRegion] = useState('')
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [focus, setFocus] = useState(null)
  const mapBox = useRef(null)

  useEffect(() => {
    let alive = true
    fetchSpots()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const items = useMemo(() => data?.items ?? [], [data])
  const colorOf = useMemo(() => Object.fromEntries((data?.groups ?? []).map((g) => [g.key, g.color])), [data])

  const filtered = useMemo(() => {
    const word = q.trim().toLowerCase()
    return items.filter((i) =>
      (!group || (group === 'beach' ? i.is_beach : i.group === group)) &&
      (!region || i.region === region) &&
      (!word || `${i.name} ${i.address} ${i.category}`.toLowerCase().includes(word)))
  }, [items, group, region, q])

  // 지도 핀: "전체"(분류를 고르지 않고 검색도 안 한 상태)에서는 천 곳이 넘어 지도가 가려지므로 핀을 보여 주지 않는다.
  // 분류를 고르거나 검색하면 그 결과가 핀으로 나오고, 카드의 "지도에서 보기"를 누르면 그 곳 핀 하나만 나온다.
  const showPins = group !== '' || q.trim() !== ''
  const pinned = useMemo(() => (showPins ? filtered : items.filter((i) => i.id === focus?.id)), [showPins, filtered, items, focus])
  const markers = useMemo(() => pinned.map((i) => ({
    id: i.id,
    lat: i.lat,
    lng: i.lng,
    color: colorOf[i.group],
    tooltip: i.name,
    popup: {
      title: i.name,
      lines: [`${i.group_label} · ${i.category}`, `${i.region} · ${i.address}`, ...(i.near ? [`가까운 서핑 장소 ${i.near.name} ${i.near.km}km`] : [])],
      actions: [
        { label: '즐겨찾기', variant: 'btn-outline-primary', onClick: () => addFavorite({ source: i.is_beach ? 'beach' : 'tour', id: i.id, title: i.name }) },
        { label: '큰 지도', variant: 'btn-outline-secondary', href: i.map_url },
      ],
    },
  })), [pinned, colorOf, addFavorite])

  const locate = (id) => {
    mapBox.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setFocus({ id })
  }
  const resetPage = (fn) => (v) => { fn(v); setShown(PAGE) }

  return (
    <>
      <PageHeader icon="umbrella" title="관광지" subtitle="제주 곳곳의 관광지·해변·레저 시설을 지도와 목록으로 보여 줘요" />

      <ErrorAlert error={error} />
      {loading && <Loading text="관광지를 불러오는 중..." />}
      {data && data.source !== 'tourapi' && (
        <Alert variant="warning" className="small"><i className="bi bi-exclamation-triangle me-2" />{data.note}</Alert>
      )}

      {data?.source === 'tourapi' && (
        <>
          {/* 지도 */}
          <div ref={mapBox} className="mb-4">
            <MapView markers={markers} focus={focus} bounds={JEJU_BOUNDS} height={420} radius={8} label="제주 관광지 지도" />
            <div className="d-flex flex-wrap gap-3 mt-2 small text-muted" aria-label="범례">
              {data.groups.map((g) => (
                <span key={g.key}><i className="bi bi-circle-fill me-1" style={{ color: g.color }} />{g.label}</span>
              ))}
            </div>
            {!showPins && <div className="small text-muted mt-1"><i className="bi bi-info-circle me-1" />전체에서는 핀을 표시하지 않아요. 분류를 고르거나 검색하면 지도에 핀이 나와요.</div>}
          </div>

          {/* 분류 (지도 아래) */}
          <div className="d-flex flex-wrap gap-2 mb-2" role="group" aria-label="분류">
            <Chip active={group === ''} onClick={() => resetPage(setGroup)('')}>전체 {items.length}</Chip>
            {data.groups.map((g) => (
              <Chip key={g.key} active={group === g.key} color={g.color} onClick={() => resetPage(setGroup)(g.key)}>
                {g.label} {g.count}
              </Chip>
            ))}
            <Chip active={group === 'beach'} color="#0d6efd" onClick={() => resetPage(setGroup)('beach')}>
              <i className="bi bi-sun me-1" />해수욕장·해변 {items.filter((i) => i.is_beach).length}
            </Chip>
          </div>

          {/* 지역 + 검색 (지도 아래) */}
          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <ButtonGroup>
              {REGIONS.map((r) => (
                <ToggleButton key={r || 'all'} id={`reg-${r || 'all'}`} type="radio" size="sm" variant="outline-secondary"
                  name="region" value={r} checked={region === r} onChange={() => resetPage(setRegion)(r)}>
                  {r || '제주 전체'}
                </ToggleButton>
              ))}
            </ButtonGroup>
            <InputGroup size="sm" style={{ maxWidth: 280 }}>
              <Form.Control value={q} onChange={(e) => resetPage(setQ)(e.target.value)} placeholder="이름·주소 검색" aria-label="검색" />
              {q && <Button variant="outline-secondary" onClick={() => resetPage(setQ)('')} aria-label="검색어 지우기"><i className="bi bi-x" /></Button>}
            </InputGroup>
            <span className="small text-muted"><b>{filtered.length}</b>곳</span>
          </div>

          {/* 목록 */}
          {filtered.length === 0 ? <Empty text="조건에 맞는 곳이 없어요" /> : (
            <>
              <Row xs={1} sm={2} lg={4} className="g-3">
                {filtered.slice(0, shown).map((i) => (
                  <Col key={i.id}>
                    <ItemCard title={i.name} image={i.image} badge={i.group_label} badgeColor={colorOf[i.group]}
                      subtitle={<>{i.region} · {i.category}<br />{i.address}{i.near && <><br />가까운 서핑 장소 {i.near.name} {i.near.km}km</>}</>}
                      onLocate={() => locate(i.id)}
                      onSave={() => addFavorite({ source: i.is_beach ? 'beach' : 'tour', id: i.id, title: i.name })} />
                  </Col>
                ))}
              </Row>
              {shown < filtered.length && (
                <div className="text-center mt-4">
                  <Button variant="outline-primary" onClick={() => setShown((n) => n + PAGE)}>
                    더 보기 ({shown}/{filtered.length})
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}

// 분류 선택 칩: 선택되면 그 색으로 채우고, 아니면 테두리와 글자만 그 색
// (Badge 는 Bootstrap 의 bg-* 가 !important 라 배경색을 못 바꾸므로 일반 버튼을 씁니다)
function Chip({ active, color = '#6c757d', onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className="btn btn-sm rounded-pill px-3"
      style={{ backgroundColor: active ? color : '#fff', color: active ? '#fff' : color, border: `1.5px solid ${color}`, fontWeight: active ? 600 : 400 }}>
      {children}
    </button>
  )
}
