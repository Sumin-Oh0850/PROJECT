import { getSeaIndex } from '../server/sea-index.js';

// GET /api/seaindex  → 제주 4개 해역의 바다 지수(종합지수·수온·파고·조석 …)
export default async function handler(req, res) {
  try {
    res.status(200).json(await getSeaIndex());
  } catch (e) {
    res.status(e.status ?? 500).json({ error: e.message });
  }
}
