import { findNearby } from '../server/nearby.js';

// GET /api/nearby?site=jungmun&kind=restaurant|cafe|attraction|shower[&radius=3000]
export default async function handler(req, res) {
  try {
    const { site, kind, radius } = req.query;
    res.status(200).json(await findNearby({ site, kind, radius }));
  } catch (e) {
    res.status(e.status ?? 500).json({ error: e.message });
  }
}
