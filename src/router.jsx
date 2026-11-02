import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home'
import Sites from './pages/Sites'
import SiteDetail from './pages/SiteDetail'
import MapPage from './pages/MapPage'
import Places from './pages/Places'
import Agent from './pages/Agent'
import My from './pages/My'
import NotFound from './pages/NotFound'

// ── 메뉴 목록 ────────────────────────────────────────────
// 페이지를 추가할 때: ① pages/에 파일 만들기 ② 아래 NAV_ITEMS 에 한 줄 추가 ③ routes 에 한 줄 추가
// 아이콘 이름: https://icons.getbootstrap.com
export const NAV_ITEMS = [
  { to: '/', label: '홈', icon: 'house' },
  { to: '/sites', label: '장소·판정', icon: 'geo-alt' },
  { to: '/map', label: '지도', icon: 'map' },
  { to: '/places', label: '관광지·해변', icon: 'umbrella' },
  { to: '/agent', label: 'AI 가이드', icon: 'robot' },
  { to: '/my', label: '내 즐겨찾기', icon: 'star' },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,      // 모든 페이지에 공통으로 보이는 틀(메뉴·푸터)
    errorElement: <NotFound />,   // 없는 주소로 들어오면
    children: [
      { index: true, element: <Home /> },
      { path: 'sites', element: <Sites /> },
      { path: 'sites/:id', element: <SiteDetail /> },
      { path: 'map', element: <MapPage /> },
      { path: 'places', element: <Places /> },
      { path: 'agent', element: <Agent /> },
      { path: 'my', element: <My /> },
    ],
  },
])
