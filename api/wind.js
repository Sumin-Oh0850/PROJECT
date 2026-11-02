import { getWindGusts } from '../server/leisure.js';

// GET /api/wind?site=jungmun   → 풍속·돌풍·풍향·파고·수온
export default async function handler(req, res) {
  try {
    res.status(200).json(await getWindGusts({ site: req.query.site }));
  } catch (e) {
    res.status(e.status ?? 500).json({ error: e.message });
  }
}
