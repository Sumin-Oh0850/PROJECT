import { judgeActivity, judgeAll } from '../server/leisure.js';

// GET /api/judge?site=jungmun   → 한 장소의 가능/주의/불가 판정
// GET /api/judge                → 모든 장소 판정 (?activity=surfing 으로 거르기)
export default async function handler(req, res) {
  try {
    const { site, activity } = req.query;
    res.status(200).json(site ? await judgeActivity({ site }) : await judgeAll({ activity: activity || undefined }));
  } catch (e) {
    res.status(e.status ?? 500).json({ error: e.message });
  }
}
