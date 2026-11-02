import { getForecast } from '../server/leisure.js';

// GET /api/forecast?site=jungmun  → 앞으로 24시간 시간별 바람·파도와 가능/주의/위험
export default async function handler(req, res) {
  try {
    res.status(200).json(await getForecast({ site: req.query.site }));
  } catch (e) {
    res.status(e.status ?? 500).json({ error: e.message });
  }
}
