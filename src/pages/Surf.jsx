import { useState } from 'react'
import { Alert, Card, Col, ListGroup, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { SEASON, SOURCE, SPOTS } from '../data/surfGuide'

const REGIONS = ['', '제주시', '서귀포시']

// 서핑: 해변별 특징 + 서핑 업체(이름·링크). 이미지는 쓰지 않습니다.
export default function Surf() {
  const [region, setRegion] = useState('')
  const list = SPOTS.filter((s) => !region || s.region === region)

  return (
    <>
      <PageHeader icon="water" title="서핑" subtitle="제주 해변별 서핑 포인트와 서핑 업체를 모아 봤어요" />

      <Card className="mb-4">
        <Card.Body>
          <Card.Title className="fs-6 fw-bold"><i className="bi bi-calendar3 me-2" />서핑 시즌과 웻수트</Card.Title>
          <p className="mb-2">{SEASON.intro}</p>
          <p className="mb-2">{SEASON.water}</p>
          <ListGroup horizontal="md" className="mb-3 flex-wrap">
            {SEASON.wetsuits.map(([month, suit]) => (
              <ListGroup.Item key={month} className="flex-fill"><b>{month}</b><div className="small text-muted">{suit}</div></ListGroup.Item>
            ))}
          </ListGroup>
          <div className="small text-muted"><i className="bi bi-tree me-1" />{SEASON.camping}</div>
        </Card.Body>
      </Card>

      <div className="d-flex flex-wrap gap-2 mb-3" role="group" aria-label="지역">
        {REGIONS.map((r) => (
          <button key={r || 'all'} type="button" aria-pressed={region === r} onClick={() => setRegion(r)}
            className={`btn btn-sm rounded-pill px-3 ${region === r ? 'btn-primary' : 'btn-outline-primary'}`}>
            {r || '제주 전체'}
          </button>
        ))}
        <span className="small text-muted align-self-center"><b>{list.length}</b>곳</span>
      </div>

      <Row xs={1} lg={2} className="g-3 mb-4">
        {list.map((s) => (
          <Col key={s.no}>
            <Card className="h-100">
              <Card.Body>
                <Card.Title className="fw-bold">
                  <span className="text-muted me-2">{s.no}.</span>{s.name}
                  <small className="ms-2 text-muted fw-normal">{s.region}</small>
                </Card.Title>
                <p className="small">{s.text}</p>
                {s.shops.length > 0 ? (
                  <ul className="list-unstyled small mb-0">
                    {s.shops.map(([name, addr, url]) => (
                      <li key={name} className="py-1 border-top">
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="fw-bold">{name} <i className="bi bi-box-arrow-up-right small" /></a>
                        ) : (
                          <span className="fw-bold">{name}</span>
                        )}
                        <div className="text-muted">{addr}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="small text-muted border-top pt-2">등록된 서핑 업체가 없어요</div>
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Alert variant="light" className="small border">
        <i className="bi bi-info-circle me-1" />내용은 <a href={SOURCE.url} target="_blank" rel="noopener noreferrer">{SOURCE.label}</a>를 줄여서 옮겼어요. 업체 정보는 바뀔 수 있으니 방문 전에 링크에서 확인하세요.
      </Alert>
    </>
  )
}
