import Anthropic from '@anthropic-ai/sdk';
import { countResult, runTool, tools } from '../server/agent-tools.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-5-5';

// 도구 설명서(tools)와 실행 함수(runTool)는 server/agent-tools.js 에 있습니다.

const SYSTEM = `너는 "바당타기"(제주 서핑·레저 가이드) 에이전트다. (서핑·윈드서핑·패러글라이딩)
- 장소, 바람·파도, 판정, 주변 정보는 반드시 도구로 확인한 뒤 답한다. 기억이나 추측으로 수치를 말하지 않는다.
- "탈 수 있어?" 같은 질문에는 judge_activity 결과(가능/주의/위험)와 이유를 그대로 전한다. 사용자에게 보이는 말에는 "판정"이라는 단어를 쓰지 않는다("가능 상태", "위험 수준"처럼 쓴다).
- 도구 결과에 없는 장소·가게는 지어내지 않는다. 결과가 비어 있거나 source 가 unavailable 이면 그 사실을 말한다.
- 위험·주의면 다른 장소(list_sites 와 judge_activity)나 실내 대안(주변 카페·관광지)을 함께 제안한다.
- 답의 마지막에는 "입수 전에는 기상특보와 현장 강사·업체의 안내를 꼭 따르세요." 라고 덧붙인다.
- 답은 한국어로 아주 짧게, 마지막 문장을 빼고 2~3문장 이내로 쓴다. 인사·서론·반복 설명·수치 나열은 빼고, 결론(어디가 좋은지/가능한지) → 핵심 이유 한 가지(풍속·돌풍·파도 중 중요한 것만) → 필요하면 대안 한 가지 순서로 말한다.
- 마크다운을 쓰지 않는다. *, **, #, - 로 시작하는 목록 기호 없이 평범한 문장으로 쓴다.
- 시간 표현은 "현재"로 쓰고, "지금(14:15 기준)" 같은 시각은 적지 않는다.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  // 키가 없을 때 SDK 의 영어 오류 대신 원인을 바로 알려줌
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'Claude 키(ANTHROPIC_API_KEY)가 없어요. .env.local 에 넣고 개발 서버를 다시 시작하세요.' });
  }
  const { message, history = [] } = req.body ?? {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: '질문(message)이 비어 있어요' });
  const messages = [...history.slice(-10), { role: 'user', content: message }]; // 최근 10개만 보내 비용 절약
  const steps = []; // 화면에 "에이전트가 무엇을 했는지" 보여주기용

  try {
    // ③ 에이전트 루프: 생각 → 도구 호출 → 결과 확인 → (반복) → 최종 답
    for (let turn = 0; turn < 6; turn++) {
      const r = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        tools,
        messages,
      });

      if (r.stop_reason !== 'tool_use') {
        const answer = r.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
        return res.status(200).json({ answer, steps });
      }

      messages.push({ role: 'assistant', content: r.content }); // Claude의 도구 호출 요청을 대화에 기록
      const results = [];
      for (const block of r.content) {
        if (block.type !== 'tool_use') continue;
        let result;
        try {
          if (!runTool[block.name]) throw new Error(`알 수 없는 도구: ${block.name}`);
          result = await runTool[block.name](block.input ?? {});
        } catch (e) { result = { error: e.message }; }
        steps.push({ tool: block.name, args: block.input, count: countResult(result) });
        results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
      }
      messages.push({ role: 'user', content: results }); // 도구 결과를 Claude에게 돌려줌
    }
    res.status(200).json({ answer: '도구 호출이 너무 많아 중단했어요. 질문을 좁혀 주세요.', steps });
  } catch (e) {
    // 429 = 호출 한도 초과, 401 = 키 오류
    res.status(e.status ?? 500).json({ error: e.status === 429 ? '사용량이 많아요. 1분 뒤 다시 시도하세요.' : e.message });
  }
}
