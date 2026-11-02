import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export default function Scene() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x0b1020, 10, 30)

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
    camera.position.set(4, 3, 6)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const light = new THREE.DirectionalLight(0xffffff, 2)
    light.position.set(5, 8, 5)
    light.castShadow = true
    scene.add(light)

    const knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1, 0.35, 160, 24),
      new THREE.MeshStandardMaterial({ color: 0x4f9dff, metalness: 0.4, roughness: 0.3 }),
    )
    knot.position.y = 1.5
    knot.castShadow = true
    scene.add(knot)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x1a2238 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)
    scene.add(new THREE.GridHelper(40, 40, 0x3355aa, 0x223355))

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    window.addEventListener('resize', resize)

    const clock = new THREE.Clock()
    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime()
      knot.rotation.x = t * 0.4
      knot.rotation.y = t * 0.6
      controls.update()
      renderer.render(scene, camera)
    })

    return () => {
      window.removeEventListener('resize', resize)
      renderer.setAnimationLoop(null)
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}
