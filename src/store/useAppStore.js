import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { friendlyAuthError } from '../lib/auth'
import { askAgent } from '../api/client'

// ── 앱 전체가 함께 쓰는 상태(store) ──────────────────────
// 여러 페이지에서 같이 쓰는 데이터는 여기에 둡니다. (한 페이지에서만 쓰면 useState)
// 사용법:  const user = useAppStore((s) => s.user)
//
// 회원 기능(signUp·signIn·signOut·changePassword·deleteAccount)은 { error } 또는 { ok } 를 돌려줍니다.
// 오류 문구는 한국어로 바꿔 두었으니 화면에 그대로 보여 주면 됩니다.
const NEED_SUPABASE = 'Supabase 설정(.env.local)이 필요해요'

let authSubscription = null // 로그인 상태 구독 (한 번만 만들기)

export const useAppStore = create((set, get) => ({
  // ① 사용자 — Supabase Auth 가 세션을 브라우저에 저장하므로 새로고침해도 로그인이 유지됩니다
  user: null,          // 로그인한 사용자 (null = 로그아웃)
  authReady: false,    // 처음 로그인 상태 확인이 끝났는지

  initAuth: async () => {
    if (!supabase) return set({ authReady: true })
    if (authSubscription) return
    // 구독을 먼저 만들어 두면 "확인 중에 일어난 로그인"도 놓치지 않습니다
    authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      set(user ? { user } : { user: null, favorites: [] })
    }).data.subscription
    const { data } = await supabase.auth.getSession()
    set({ user: data.session?.user ?? null, authReady: true })
  },

  signUp: async ({ email, password, nickname }) => {
    if (!supabase) return { error: NEED_SUPABASE }
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { nickname } } })
    if (error) return { error: friendlyAuthError(error) }
    // 이미 가입된 이메일이면 Supabase 는 오류 대신 identities 가 빈 사용자를 돌려줍니다
    if (data.user && data.user.identities?.length === 0) return { error: '이미 가입된 이메일이에요' }
    // "이메일 확인"이 켜져 있으면 세션이 없습니다 → 메일의 링크를 눌러야 로그인할 수 있어요
    return { ok: true, needsConfirm: !data.session }
  },

  signIn: async ({ email, password }) => {
    if (!supabase) return { error: NEED_SUPABASE }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? { error: friendlyAuthError(error) } : { ok: true }
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    set({ user: null, favorites: [] })
    get().toast('로그아웃했어요')
  },

  // 비밀번호 변경: 지금 비밀번호를 먼저 확인한 뒤 바꿉니다 (남이 켜 둔 화면에서 바꾸는 것을 막기 위해)
  changePassword: async ({ current, next }) => {
    const user = get().user
    if (!supabase || !user) return { error: '로그인이 필요해요' }
    const check = await supabase.auth.signInWithPassword({ email: user.email, password: current })
    if (check.error) return { error: '현재 비밀번호가 올바르지 않아요' }
    const { error } = await supabase.auth.updateUser({ password: next })
    return error ? { error: friendlyAuthError(error) } : { ok: true }
  },

  // 회원 삭제: 서버 함수(delete_my_account)가 계정과 즐겨찾기를 지웁니다 (supabase/account.sql)
  deleteAccount: async () => {
    if (!supabase || !get().user) return { error: '로그인이 필요해요' }
    const { error } = await supabase.rpc('delete_my_account')
    if (error) return { error: friendlyAuthError(error) }
    await supabase.auth.signOut({ scope: 'local' }) // 계정이 이미 지워졌으니 이 브라우저의 세션만 정리
    set({ user: null, favorites: [] })
    return { ok: true }
  },

  // ② 알림(토스트) — 어느 페이지에서든 get().toast('메시지')
  toasts: [],
  toast: (message, variant = 'success') => {
    const id = Date.now() + Math.random()
    set({ toasts: [...get().toasts, { id, message, variant }] })
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2500)
  },

  // ③ 즐겨찾기 — Supabase favorites 테이블과 동기화. 로그인한 사용자 본인 것만 다룹니다 (RLS)
  favorites: [],
  favLoading: false,
  loadFavorites: async () => {
    if (!supabase) return get().toast(NEED_SUPABASE, 'warning')
    if (!get().user) return set({ favorites: [] })
    set({ favLoading: true })
    const { data, error } = await supabase
      .from('favorites').select('*')
      .order('created_at', { ascending: false })
    set({ favLoading: false })
    if (error) return get().toast(error.message, 'danger')
    set({ favorites: data })
  },
  addFavorite: async ({ source, id, title }) => {
    if (!supabase) return get().toast(NEED_SUPABASE, 'warning')
    if (!get().user) return get().toast('로그인하면 즐겨찾기에 저장할 수 있어요', 'warning')
    // user_id 는 DB 가 로그인한 사용자(auth.uid())로 채웁니다
    const row = { source, item_id: String(id), title }
    const { data, error } = await supabase.from('favorites').insert(row).select().single()
    if (error) {
      // 23505 = unique 위반: 이미 저장한 항목 → DB 문구 대신 알아보기 쉬운 안내
      if (error.code === '23505') return get().toast('이미 즐겨찾기에 있어요', 'warning')
      return get().toast(error.message, 'danger')
    }
    set({ favorites: [data, ...get().favorites] })
    get().toast('즐겨찾기에 저장했어요')
  },
  removeFavorite: async (id) => {
    if (!supabase) return get().toast(NEED_SUPABASE, 'warning')
    // .select() 를 붙이면 실제로 지워진 행이 돌아와서, 이미 없는 항목인지 구분할 수 있어요
    const { data, error } = await supabase.from('favorites').delete().eq('id', id).select()
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
}))
