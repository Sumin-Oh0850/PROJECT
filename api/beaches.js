import { listBeaches } from '../server/nearby.js';

// GET /api/beaches   → 제주 해변 목록 (한국관광공사 TourAPI)
export default async function handler(req, res) {
  try {
    res.status(200).json(await listBeaches());
  } catch (e) {
    res.status(e.status ?? 500).json({ error: e.message });
  }
}
