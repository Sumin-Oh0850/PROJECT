// AI 가이드 공통: 지시문(SYSTEM), 반복 횟수, 오류 분류. Claude 와 Gemini 가 같이 씁니다.
export const MAX_TURNS = 6 // 도구를 부르고 결과를 받는 반복 상한
export const MAX_HISTORY = 10 // 최근 대화 10개만 보내 비용 절약

export const SYSTEM = `너는 "바당타기"(제주 서핑·레저 가이드) 에이전트다. (서핑·윈드서핑·패러글라이딩)
- 장소, 바람·파도, 판정, 주변 정보는 반드시 도구로 확인한 뒤 답한다. 기억이나 추측으로 수치를 말하지 않는다.
- "탈 수 있어?" 같은 질문에는 judge_activity 결과(가능/주의/위험)와 이유를 그대로 전한다. 사용자에게 보이는 말에는 "판정"이라는 단어를 쓰지 않는다("가능 상태", "위험 수준"처럼 쓴다).
- 도구 결과에 없는 장소·가게는 지어내지 않는다. 결과가 비어 있거나 source 가 unavailable 이면 그 사실을 말한다.
- 위험·주의면 다른 장소(list_sites 와 judge_activity)나 실내 대안(주변 카페·관광지)을 함께 제안한다.
- 답의 마지막에는 "입수 전에는 기상특보와 현장 강사·업체의 안내를 꼭 따르세요." 라고 덧붙인다.
- 답은 한국어로 아주 짧게, 마지막 문장을 빼고 2~3문장 이내로 쓴다. 인사·서론·반복 설명·수치 나열은 빼고, 결론(어디가 좋은지/가능한지) → 핵심 이유 한 가지(풍속·돌풍·파도 중 중요한 것만) → 필요하면 대안 한 가지 순서로 말한다.
- 마크다운을 쓰지 않는다. *, **, #, - 로 시작하는 목록 기호 없이 평범한 문장으로 쓴다.
- 시간 표현은 "현재"로 쓰고, "지금(14:15 기준)" 같은 시각은 적지 않는다.`

// 모델 서버가 돌려준 오류를 세 가지로 나눈다: 키 문제 / 사용량 초과 / 그 밖
//  (SDK 마다 오류 모양이 달라 상태 번호와 메시지 글자를 함께 본다)
export function classifyError(e) {
  const status = Number(e?.status ?? e?.code ?? 0)
  const text = String(e?.message ?? '')
  if (status === 401 || status === 403 || /API key not valid|API_KEY_INVALID|invalid x-api-key|authentication_error|PERMISSION_DENIED/i.test(text)) return 'auth'
  if (status === 429 || /RESOURCE_EXHAUSTED|rate.?limit|quota/i.test(text)) return 'rate'
  if (status === 404 && /model/i.test(text)) return 'model' // 모델 이름이 맞지 않거나 더 이상 제공되지 않음
  if (status === 503 || status === 504 || /UNAVAILABLE|high demand|overloaded|DEADLINE_EXCEEDED/i.test(text)) return 'busy' // 서버가 잠깐 몰려 있음
  return 'other'
}
