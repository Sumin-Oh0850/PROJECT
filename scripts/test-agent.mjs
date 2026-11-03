// AI 가이드(Gemini · Claude 전환) 시험:  npm run test:agent
// 가짜 클라이언트로 도구 호출 반복·변환·공급자 선택·오류 안내를 확인하므로 키·인터넷이 없어도 됩니다.
import { askAgent, pickProviders } from '../server/ai/index.js'
import { runGemini, toGeminiContents, toGeminiTools } from '../server/ai/gemini.js'
import { runAnthropic } from '../server/ai/anthropic.js'
import { classifyError } from '../server/ai/common.js'
import { tools } from '../server/agent-tools.js'

let failed = 0
const ok = (cond, text) => { if (!cond) failed++; console.log(`${cond ? '✅' : '❌'} ${text}`) }

console.log('── 변환 ──')
const decl = toGeminiTools()[0].functionDeclarations
ok(decl.length === tools.length && decl.every((d, i) => d.name === tools[i].name && d.parametersJsonSchema?.type === 'object'), `도구 ${decl.length}개를 Gemini 함수 선언으로 변환`)
const contents = toGeminiContents([{ role: 'assistant', content: '안녕' }, { role: 'user', content: '질문1' }, { role: 'assistant', content: '답1' }], '질문2')
ok(contents[0].role === 'user' && contents.at(-1).parts[0].text === '질문2', '대화는 사용자 말로 시작하고 새 질문이 끝에 붙음')
ok(contents.map((c) => c.role).join() === 'user,model,user', '역할 이름 변환 (assistant → model)')

console.log('── Gemini 도구 호출 반복(가짜 클라이언트) ──')
const seen = []
const fakeGemini = { models: { async generateContent(req) {
  seen.push(req.contents.length)
  if (seen.length === 1) {
    const functionCall = { id: 'c1', name: 'list_sites', args: { activity: 'surfing' } }
    return { functionCalls: [functionCall], candidates: [{ content: { role: 'model', parts: [{ functionCall }] } }] }
  }
  const last = req.contents.at(-1).parts[0].functionResponse
  return { functionCalls: undefined, text: last?.name === 'list_sites' && last.response.output.length > 0 ? '서핑 장소를 확인했어요.' : '도구 결과를 못 받았어요.' }
} } }
const g = await runGemini({ message: '서핑 장소 알려줘', client: fakeGemini })
ok(g.answer === '서핑 장소를 확인했어요.', '도구 결과를 받아 최종 답을 만듦')
ok(g.steps.length === 1 && g.steps[0].tool === 'list_sites' && g.steps[0].count > 0, `도구 호출 기록: ${g.steps[0]?.tool} → ${g.steps[0]?.count}건`)

console.log('── Claude 도구 호출 반복(가짜 클라이언트) ──')
let n = 0
const fakeClaude = { messages: { async create() {
  n++
  return n === 1
    ? { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'list_sites', input: {} }] }
    : { stop_reason: 'end_turn', content: [{ type: 'text', text: '확인했어요.' }] }
} } }
const c = await runAnthropic({ message: '장소?', client: fakeClaude })
ok(c.answer === '확인했어요.' && c.steps.length === 1, 'Claude 도 같은 도구 반복이 동작')

console.log('── 공급자 선택 ──')
ok(pickProviders({}).length === 0, '키가 없으면 빈 목록')
ok(pickProviders({ GEMINI_API_KEY: 'x' }).join() === 'gemini', 'Gemini 키만 있으면 gemini')
ok(pickProviders({ ANTHROPIC_API_KEY: 'x' }).join() === 'anthropic', 'Claude 키만 있으면 anthropic')
ok(pickProviders({ GEMINI_API_KEY: 'x', ANTHROPIC_API_KEY: 'y' }).join() === 'gemini,anthropic', '둘 다 있으면 기본은 Gemini 먼저')
ok(pickProviders({ GEMINI_API_KEY: 'x', ANTHROPIC_API_KEY: 'y', AI_PROVIDER: 'anthropic' }).join() === 'anthropic,gemini', 'AI_PROVIDER=anthropic 이면 Claude 먼저')

console.log('── 대체·오류 안내 ──')
const failing = (status, message) => ({ run: async () => { throw Object.assign(new Error(message), { status }) } })
const works = { run: async () => ({ answer: '대신 답했어요.', steps: [] }) }
const r1 = await askAgent({ message: 'q' }, { env: { GEMINI_API_KEY: 'x', ANTHROPIC_API_KEY: 'y' }, providers: { gemini: failing(400, 'API key not valid'), anthropic: works } })
ok(r1.answer === '대신 답했어요.' && r1.provider === 'anthropic', 'Gemini 가 실패하면 Claude 로 대신 답함')
const rejects = async (env, providers) => { try { await askAgent({ message: 'q' }, { env, providers }); return null } catch (e) { return e } }
const e1 = await rejects({ GEMINI_API_KEY: 'x' }, { gemini: failing(401, '{"type":"error","error":{"message":"invalid x-api-key"}}') })
ok(e1 && /키\(GEMINI_API_KEY\)가 올바르지 않거나 만료/.test(e1.message) && !/\{/.test(e1.message), '키 오류는 원문 JSON 없이 쉬운 안내로')
const e2 = await rejects({ GEMINI_API_KEY: 'x' }, { gemini: failing(429, 'RESOURCE_EXHAUSTED') })
ok(e2?.status === 429 && /사용량/.test(e2.message), '사용량 초과 안내(429)')
const e3 = await rejects({}, {})
ok(e3?.status === 503 && /GEMINI_API_KEY/.test(e3.message), '키가 하나도 없으면 설정 방법 안내(503)')
ok(classifyError({ status: 400, message: 'API key not valid. Please pass a valid API key.' }) === 'auth', 'Gemini 의 "API key not valid"(400)도 키 오류로 분류')
ok(classifyError({ status: 404, message: 'This model models/x is no longer available' }) === 'model' && classifyError({ status: 503, message: 'high demand' }) === 'busy', '모델 이름 오류(404)·서버 몰림(503) 분류')
const e4 = await rejects({ GEMINI_API_KEY: 'x' }, { gemini: failing(404, 'This model models/x is no longer available') })
ok(/GEMINI_MODEL/.test(e4?.message), '모델 이름 오류는 GEMINI_MODEL 안내')
const { withRetry } = await import('../server/ai/gemini.js')
let tries = 0
const out = await withRetry(async () => { tries++; if (tries < 3) throw Object.assign(new Error('high demand'), { status: 503 }); return 'ok' }, { waitMs: 1 })
ok(out === 'ok' && tries === 3, '503 은 두 번까지 다시 시도해 성공')
tries = 0
const auth401 = await withRetry(async () => { tries++; throw Object.assign(new Error('x'), { status: 401 }) }, { waitMs: 1 }).catch(() => 'failed')
ok(auth401 === 'failed' && tries === 1, '키 오류(401)는 다시 시도하지 않음')

console.log(failed ? `\n❌ ${failed}개 실패` : '\n✅ 모두 통과')
process.exit(failed ? 1 : 0)
