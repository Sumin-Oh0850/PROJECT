// 개발용 /api 서버 (Vercel 로그인 없이 `npm run dev` 만으로 api/*.js 를 실행)
//
// - /api/<이름> 요청이 오면 api/<이름>.js 의 `export default function handler(req, res)` 를 그대로 실행합니다.
// - 비밀 키(.env, .env.local)는 서버 쪽 process.env 로만 읽고, VITE_ 가 없는 값은 브라우저로 나가지 않습니다.
// - 배포(Vercel)에서는 이 파일을 쓰지 않습니다. (apply: 'serve' = 개발 서버 전용)
import { existsSync } from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

export default function devApi() {
  return {
    name: 'dev-api',
    apply: 'serve',

    configResolved(config) {
      // 서버 함수가 process.env 로 읽는 키를 .env / .env.local 에서 채움 (이미 설정된 값은 유지)
      const env = loadEnv(config.mode, config.envDir, '')
      for (const [key, value] of Object.entries(env)) {
        if (!(key in process.env)) process.env[key] = value
      }
    },

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        const match = url.pathname.match(/^\/api\/([A-Za-z0-9_-]+)$/)
        if (!match) return next()

        // Vercel 의 req/res 와 같은 모양으로 맞춤: req.query, req.body, res.status(), res.json()
        req.query = Object.fromEntries(url.searchParams)
        res.status = (code) => {
          res.statusCode = code
          return res
        }
        res.json = (data) => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(data))
          return res
        }

        // 없는 서버 함수는 Vercel 처럼 404 (화면 HTML 이 아니라 JSON 오류)
        const file = path.resolve(server.config.root, 'api', `${match[1]}.js`)
        if (!existsSync(file)) return res.status(404).json({ error: `/api/${match[1]} 서버 함수가 없어요` })

        req.body = req.method === 'GET' ? undefined : await readBody(req)

        try {
          const mod = await server.ssrLoadModule(file) // 파일을 고치면 다음 요청부터 바로 반영
          await mod.default(req, res)
        } catch (e) {
          console.error(`[api/${match[1]}]`, e.message)
          if (!res.headersSent) res.status(500).json({ error: e.message })
        }
      })
    },
  }
}
