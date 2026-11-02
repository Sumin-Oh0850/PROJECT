import { listSpots } from '../server/spots.js';

// GET /api/spots[?n=100]  → 제주 관광지(한국관광공사) 중 분류·위치가 고르게 퍼지도록 고른 n곳
export default async function handler(req, res) {
  try {
    res.status(200).json(await listSpots({ n: req.query.n }));
  } catch (e) {
    res.status(e.status ?? 500).json({ error: e.message });
  }
}
