import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import devApi from './dev/api-plugin.js'

// https://vite.dev/config/
// devApi: `npm run dev` 에서도 /api (서버 함수)를 쓸 수 있게 해 주는 개발용 플러그인
export default defineConfig({
  plugins: [react(), devApi()],
})
