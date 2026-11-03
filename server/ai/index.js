// AI 공급자 고르기: Gemini · Claude 중 .env.local 에 키가 있는 쪽을 쓰고, 둘 다 있으면 AI_PROVIDER 로 고릅니다.
//   AI_PROVIDER=gemini | anthropic | auto(기본: 키가 있는 쪽, 둘 다 있으면 Gemini 먼저)
//   고른 쪽이 실패하면(키 오류·사용량 초과 …) 다른 쪽 키가 있을 때 그쪽으로 대신 답합니다.
import { classifyError } from './common.js'
import { runAnthropic } from './anthropic.js'
import { runGemini } from './gemini.js'

const PROVIDERS = {
  gemini: { label: 'Gemini', keyName: 'GEMINI_API_KEY', run: runGemini },
  anthropic: { label: 'Claude', keyName: 'ANTHROPIC_API_KEY', run: runAnthropic },
}

// 쓸 공급자 이름을 순서대로 (env 를 인자로 받아 시험하기 쉽게)
export function pickProviders(env = process.env) {
  const has = (name) => Boolean(env[PROVIDERS[name].keyName])
  const want = String(env.AI_PROVIDER ?? 'auto').toLowerCase()
  const order = want === 'anthropic' ? ['anthropic', 'gemini'] : ['gemini', 'anthropic'] // gemini · auto 는 Gemini 먼저
  return order.filter(has)
}

export const keyStatus = (env = process.env) => ({ gemini: Boolean(env.GEMINI_API_KEY), anthropic: Boolean(env.ANTHROPIC_API_KEY) })

const NO_KEY = '사용할 수 있는 AI 키가 없어요. .env.local 에 GEMINI_API_KEY (또는 ANTHROPIC_API_KEY)를 넣고 개발 서버를 다시 시작하세요.'

// 질문 → { answer, steps, provider }. 실패하면 사람이 읽을 수 있는 안내가 담긴 오류(status 포함)를 던진다.
export async function askAgent({ message, history = [] }, { env = process.env, providers = PROVIDERS } = {}) {
  const order = pickProviders(env)
  if (!order.length) throw Object.assign(new Error(NO_KEY), { status: 503 })

  let last = null
  for (const name of order) {
    try {
      const out = await providers[name].run({ message, history })
      return { ...out, provider: name }
    } catch (e) {
      last = { name, kind: classifyError(e) }
    }
  }
  const name = last.name
  const p = PROVIDERS[name]
  const text = {
    auth: `${p.label} 키(${p.keyName})가 올바르지 않거나 만료됐어요. .env.local 의 키를 확인하고 개발 서버를 다시 시작하세요.`,
    rate: '사용량이 많아요. 1분 뒤 다시 시도하세요.',
    busy: 'AI 서버가 잠깐 몰려 있어요. 잠시 뒤 다시 시도해 주세요.',
    model: `${p.label} 모델 이름이 맞지 않아요. .env.local 에 ${name === 'gemini' ? 'GEMINI_MODEL' : 'ANTHROPIC_MODEL'}=모델이름 을 넣어 주세요 (Google AI Studio 의 모델 목록에서 확인).`,
    other: `${p.label} 답변을 가져오지 못했어요. 잠시 뒤 다시 시도해 주세요.`,
  }[last.kind]
  throw Object.assign(new Error(text), { status: last.kind === 'rate' ? 429 : last.kind === 'busy' ? 503 : 502 })
}
