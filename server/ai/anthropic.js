// Claude (Anthropic) 로 답하는 에이전트 루프
import Anthropic from '@anthropic-ai/sdk'
import { countResult, runTool, tools } from '../agent-tools.js'
import { MAX_HISTORY, MAX_TURNS, SYSTEM } from './common.js'

export const ANTHROPIC_MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'

// client 를 넘기면 그걸 쓴다 (시험용 가짜 클라이언트). 안 넘기면 키로 만든다.
export async function runAnthropic({ message, history = [], client } = {}) {
  const api = client ?? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const messages = [...history.slice(-MAX_HISTORY), { role: 'user', content: message }]
  const steps = [] // 에이전트가 무엇을 했는지 (화면에는 보이지 않지만 기록)

  // 생각 → 도구 호출 → 결과 확인 → (반복) → 최종 답
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const r = await api.messages.create({ model: ANTHROPIC_MODEL(), max_tokens: 1024, system: SYSTEM, tools, messages })
    if (r.stop_reason !== 'tool_use') {
      return { answer: r.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n'), steps }
    }
    messages.push({ role: 'assistant', content: r.content }) // 모델의 도구 호출 요청을 대화에 기록
    const results = []
    for (const block of r.content) {
      if (block.type !== 'tool_use') continue
      let result
      try {
        if (!runTool[block.name]) throw new Error(`알 수 없는 도구: ${block.name}`)
        result = await runTool[block.name](block.input ?? {})
      } catch (e) { result = { error: e.message } }
      steps.push({ tool: block.name, args: block.input, count: countResult(result) })
      results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
    }
    messages.push({ role: 'user', content: results }) // 도구 결과를 모델에게 돌려줌
  }
  return { answer: '도구 호출이 너무 많아 중단했어요. 질문을 좁혀 주세요.', steps }
}
