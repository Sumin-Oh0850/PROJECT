// 아주 작은 메모리 캐시: 같은 요청을 짧은 시간 안에 여러 번 받아도 외부 API 는 한 번만 부릅니다.
// - 같은 키로 동시에 들어온 요청은 하나의 호출을 함께 기다립니다.
// - 실패한 결과도 failTtlMs 동안 기억해, 응답이 느린 외부 서버를 계속 두드리지 않습니다.
const store = new Map() // key → { value, error, expires, promise }

// ttlFor(value): 결과에 따라 저장 시간을 바꾼다 (예: 샘플 값으로 대신한 결과는 짧게 저장해 곧바로 다시 시도)
export async function cached(key, ttlMs, fn, { failTtlMs = 60_000, ttlFor } = {}) {
  const hit = store.get(key)
  if (hit && hit.expires > Date.now()) {
    if (hit.promise) return hit.promise
    if (hit.error) throw hit.error
    return hit.value
  }

  const promise = (async () => fn())()
  store.set(key, { promise, expires: Date.now() + ttlMs })
  try {
    const value = await promise
    store.set(key, { value, expires: Date.now() + (ttlFor?.(value) ?? ttlMs) })
    return value
  } catch (error) {
    store.set(key, { error, expires: Date.now() + failTtlMs })
    throw error
  }
}

export function clearCache() {
  store.clear()
}
