// Gemini (Google) 로 답하는 에이전트 루프 — 같은 도구(server/agent-tools.js)를 함수 호출(function calling)로 씁니다.
import { GoogleGenAI } from '@google/genai'
import { countResult, runTool, tools } from '../agent-tools.js'
import { MAX_HISTORY, MAX_TURNS, SYSTEM } from './common.js'

// 모델 이름은 자주 바뀌므로 .env.local 의 GEMINI_MODEL 로 바꿀 수 있다 (Google AI Studio 의 모델 목록에서 확인)
export const GEMINI_MODEL = () => process.env.GEMINI_MODEL || 'gemini-3.5-flash'

// 도구 설명서(Claude 형식 input_schema) → Gemini 함수 선언. 스키마는 JSON 스키마 그대로 넘긴다.
export function toGeminiTools(toolList = tools) {
  return [{ functionDeclarations: toolList.map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.input_schema })) }]
}

// 화면이 보내는 대화 [{role:'user'|'assistant', content}] → Gemini 형식 [{role:'user'|'model', parts:[{text}]}]
export function toGeminiContents(history = [], message) {
  const past = history.slice(-MAX_HISTORY)
    .filter((m) => typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
  while (past.length && past[0].role === 'model') past.shift() // 대화는 사용자 말로 시작해야 함
  return [...past, { role: 'user', parts: [{ text: message }] }]
}

// 서버가 잠깐 몰려 있을 때(503 UNAVAILABLE) 오류는 몇 초 뒤 다시 물으면 대부분 풀린다. 두 번까지 다시 시도.
export async function withRetry(call, { tries = 3, waitMs = 1500 } = {}) {
  for (let i = 1; ; i++) {
    try {
      return await call()
    } catch (e) {
      const busy = Number(e?.status) === 503 || /UNAVAILABLE|high demand/i.test(String(e?.message))
      if (!busy || i >= tries) throw e
      await new Promise((r) => setTimeout(r, waitMs * i))
    }
  }
}

// client 를 넘기면 그걸 쓴다 (시험용 가짜 클라이언트). 안 넘기면 키로 만든다.
export async function runGemini({ message, history = [], client } = {}) {
  const api = client ?? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 30_000 } }) // 30초 안에 답이 없으면 포기(화면이 오래 멈추지 않게)
  const contents = toGeminiContents(history, message)
  const steps = []
  const config = { systemInstruction: SYSTEM, tools: toGeminiTools(), maxOutputTokens: 1024, temperature: 0.4 }

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const r = await withRetry(() => api.models.generateContent({ model: GEMINI_MODEL(), contents, config }))
    const calls = r.functionCalls ?? []
    if (!calls.length) return { answer: String(r.text ?? '').trim(), steps }

    // 모델의 도구 호출 요청을 대화에 기록
    contents.push(r.candidates?.[0]?.content ?? { role: 'model', parts: calls.map((functionCall) => ({ functionCall })) })
    const parts = []
    for (const call of calls) {
      let result
      try {
        if (!runTool[call.name]) throw new Error(`알 수 없는 도구: ${call.name}`)
        result = await runTool[call.name](call.args ?? {})
      } catch (e) { result = { error: e.message } }
      steps.push({ tool: call.name, args: call.args, count: countResult(result) })
      // 결과는 객체여야 한다 (배열이어도 output 안에 담는다)
      parts.push({ functionResponse: { ...(call.id ? { id: call.id } : {}), name: call.name, response: { output: result } } })
    }
    contents.push({ role: 'user', parts }) // 도구 결과를 모델에게 돌려줌
  }
  return { answer: '도구 호출이 너무 많아 중단했어요. 질문을 좁혀 주세요.', steps }
}
