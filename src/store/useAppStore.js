import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { askAgent } from '../api/client'

// ── 앱 전체가 함께 쓰는 상태(store) ──────────────────────
// 여러 페이지에서 같이 쓰는 데이터는 여기에 둡니다. (한 페이지에서만 쓰면 useState)
// 사용법:  const nickname = useAppStore((s) => s.nickname)
export const useAppStore = create(
  persist(
    (set, get) => ({
      // ① 사용자 — localStorage 에 저장되어 새로고침해도 유지
      nickname: '',
      setNickname: (nickname) => set({ nickname: nickname.trim() }),

      // ② 알림(토스트) — 어느 페이지에서든 get().toast('메시지')
      toasts: [],
      toast: (message, variant = 'success') => {
        const id = Date.now() + Math.random()
        set({ toasts: [...get().toasts, { id, message, variant }] })
        setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2500)
      },

      // ③ 즐겨찾기 — Supabase favorites 테이블과 동기화 (STEP 5)
      favorites: [],
      favLoading: false,
      loadFavorites: async () => {
        if (!supabase) return get().toast('Supabase 설정(.env.local)이 필요해요', 'warning')
        set({ favLoading: true })
        const { data, error } = await supabase
          .from('favorites').select('*')
          .eq('nickname', get().nickname || '익명')
          .order('created_at', { ascending: false })
        set({ favLoading: false })
        if (error) return get().toast(error.message, 'danger')
        set({ favorites: data })
      },
      addFavorite: async ({ source, id, title }) => {
        if (!supabase) return get().toast('Supabase 설정(.env.local)이 필요해요', 'warning')
        const row = { nickname: get().nickname || '익명', source, item_id: String(id), title }
        const { data, error } = await supabase.from('favorites').insert(row).select().single()
        if (error) {
          // 23505 = unique 위반: 같은 닉네임이 같은 항목을 이미 저장함 → DB 문구 대신 알아보기 쉬운 안내
          if (error.code === '23505') return get().toast('이미 즐겨찾기에 있어요', 'warning')
          return get().toast(error.message, 'danger')
        }
        set({ favorites: [data, ...get().favorites] })
        get().toast('즐겨찾기에 저장했어요')
      },
      removeFavorite: async (id) => {
        if (!supabase) return get().toast('Supabase 설정(.env.local)이 필요해요', 'warning')
        // .select() 를 붙이면 실제로 지워진 행이 돌아와서, 이미 없는 항목인지 구분할 수 있어요
        const { data, error } = await supabase
          .from('favorites').delete()
          .eq('id', id).eq('nickname', get().nickname || '익명')
          .select()
        if (error) return get().toast(error.message, 'danger')
        set({ favorites: get().favorites.filter((f) => f.id !== id) })
        if (data.length === 0) return get().toast('이미 삭제된 항목이에요', 'warning')
        get().toast('즐겨찾기에서 삭제했어요')
      },

      // ④ STEP 6: 에이전트 대화 — 페이지를 옮겨도 대화가 남도록 store 에 둡니다
      messages: [],          // { role: 'user' | 'assistant', text, steps }
      chatLoading: false,
      sendMessage: async (text) => {
        const history = get().messages.map((m) => ({ role: m.role, content: m.text }))  // Claude 형식
        set({ messages: [...get().messages, { role: 'user', text }], chatLoading: true })
        try {
          const { answer, steps } = await askAgent(text, history)
          set({ messages: [...get().messages, { role: 'assistant', text: answer, steps }] })
        } catch (e) {
          get().toast(e.message, 'danger')
        } finally {
          set({ chatLoading: false })
        }
      },
    }),
    {
      name: 'jeju-ip-store',                          // localStorage 키 이름
      partialize: (s) => ({ nickname: s.nickname }),  // 저장할 항목만 고르기
    },
  ),
)
