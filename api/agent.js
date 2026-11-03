import { askAgent } from '../server/ai/index.js';

// POST /api/agent  { message, history }  → { answer, steps, provider }
// Gemini · Claude 중 키가 있는 쪽으로 답합니다 (server/ai/index.js). 키 값은 어디에도 내보내지 않습니다.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { message, history = [] } = req.body ?? {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: '질문(message)이 비어 있어요' });
  try {
    res.status(200).json(await askAgent({ message, history }));
  } catch (e) {
    // 모델 서버의 원문 오류(JSON)는 화면에 그대로 보이지 않게, askAgent 가 만든 쉬운 안내만 내려보냄
    res.status(e.status ?? 500).json({ error: e.message });
  }
}
