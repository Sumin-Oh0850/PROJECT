import Scene from './Scene.jsx'

export default function App() {
  return (
    <>
      <Scene />
      <div className="overlay">
        <h1>Vite + React + three.js</h1>
        <p>드래그: 회전 · 휠: 확대/축소</p>
      </div>
    </>
  )
}
