import { listSites } from '../server/leisure.js';

// GET /api/sites?activity=surfing|windsurfing|paragliding   (생략하면 전체)
export default function handler(req, res) {
  try {
    res.status(200).json(listSites({ activity: req.query.activity || undefined }));
  } catch (e) {
    res.status(e.status ?? 500).json({ error: e.message });
  }
}
