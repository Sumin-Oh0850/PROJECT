import * as THREE from 'three';
import { createRainFx, createWindFx } from './weatherFx.js';

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform float uFreq;
  uniform float uSpeed;
  uniform float uChop;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vHeight;

  float heightAt(vec2 p) {
    float t = uTime * uSpeed;
    float h = sin(p.x * uFreq * 0.9 + p.y * uFreq * 0.35 - t) * 0.6;
    h += sin(p.x * uFreq * 0.5 - p.y * uFreq * 0.8 - t * 0.8 + 1.7) * 0.4;
    h *= uAmp;
    // 바람 잔물결
    h += (sin(p.x * 2.3 + p.y * 1.7 - uTime * 1.9) + sin(p.x * 3.1 - p.y * 2.6 + uTime * 2.3)) * 0.5 * uChop;
    return h;
  }

  void main() {
    vec2 p = position.xy;
    float e = 0.15;
    float h = heightAt(p);
    float hx = heightAt(p + vec2(e, 0.0));
    float hy = heightAt(p + vec2(0.0, e));
    vec3 nLocal = normalize(vec3(-(hx - h) / e, -(hy - h) / e, 1.0));
    // 메쉬를 x축으로 -90도 회전해 눕히므로 법선도 같은 방식으로 변환
    vNormal = normalize(vec3(nLocal.x, nLocal.z, -nLocal.y));
    vHeight = h;
    vec3 pos = vec3(p, h);
    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  uniform vec3 uSun;
  uniform float uAmp;
  uniform float uChop;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vHeight;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(cameraPosition - vWorld);
    vec3 l = normalize(vec3(-0.4, 0.55, -0.7));
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    float k = clamp(0.5 + vHeight / (uAmp * 1.6 + uChop * 2.0 + 0.2), 0.0, 1.0);
    vec3 col = mix(uDeep, uShallow, k * 0.8);
    col = mix(col, uSky, fres * 0.55);
    float diff = max(dot(n, l), 0.0);
    col += uShallow * diff * 0.12;
    vec3 r = reflect(-l, n);
    col += uSun * pow(max(dot(r, v), 0.0), 70.0) * 0.45;
    // 파도 마루의 옅은 거품 (파고·바람이 클수록 조금 더)
    float foam = smoothstep(0.78, 1.0, k) * clamp(0.15 + uAmp * 0.25 + uChop * 3.0, 0.0, 0.7);
    col = mix(col, vec3(0.86, 0.95, 0.96), foam * 0.5);
    float dist = length(vWorld - cameraPosition);
    float alpha = 1.0 - smoothstep(38.0, 78.0, dist);
    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
  }
`;

const LEVEL_TINT = {
  go: new THREE.Color('#12a38a'),
  caution: new THREE.Color('#b58a3a'),
  danger: new THREE.Color('#a84a52'),
};
// 위험도별 물결 낙폭: scale 파고 반영 배율, min~max 낙폭 범위, speed 움직임 속도, chop 잔물결 배율
const LEVEL_WAVE = {
  go: { scale: 0.8, min: 0.1, max: 0.5, speed: 0.85, chop: 0.8 },
  caution: { scale: 1.1, min: 0.4, max: 1.1, speed: 1.0, chop: 1.2 },
  danger: { scale: 1.5, min: 0.9, max: 2.1, speed: 1.25, chop: 1.7 },
};
const BASE_DEEP =new THREE.Color('#06284a');
const BASE_SHALLOW = new THREE.Color('#0e7c86');
const SKY = new THREE.Color('#5aa7c4');
const SUN = new THREE.Color('#ffe9c2');

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** 조건 → 셰이더 파라미터 */
function targetFrom({ waveHeight, wavePeriod, windSpeed, level }) {
  const h = clamp(num(waveHeight, 0.8), 0, 4.5);
  const period = clamp(num(wavePeriod, 7), 3, 16);
  const wind = clamp(num(windSpeed, 4), 0, 16);
  const tint = LEVEL_TINT[level] ?? LEVEL_TINT.go;
  // 파고(h)로 물결 높이를 정하되, 가능/주의/위험에 따라 낙폭(오르내림)의 범위를 다르게 한다.
  //   가능: 잔잔하게(낙폭 작음) / 주의: 보통 / 위험: 크고 거칠게
  const shape = LEVEL_WAVE[level] ?? LEVEL_WAVE.go;
  const amp = clamp((0.12 + h * 0.42) * shape.scale, shape.min, shape.max);
  return {
    amp,
    freq: 0.9 - clamp(period, 3, 16) * 0.035, // 주기가 길수록 파장이 길다
    speed: (0.55 + h * 0.18) * shape.speed,
    chop: (0.01 + (wind / 16) * 0.07) * shape.chop,
    deep: BASE_DEEP.clone().lerp(tint, 0.1),
    shallow: BASE_SHALLOW.clone().lerp(tint, 0.18),
  };
}

/**
 * Three.js 장면(바다 + 바람 + 비). 컨테이너에 canvas를 붙이고 { update, dispose, supported }를 돌려줍니다.
 *  - options.sea=false 이면 바다 없이 바람·비만 (패러글라이딩 장소)
 *  - update({ waveHeight, wavePeriod, windSpeed, windDir, level, precipMm, weatherCode })
 * WebGL을 쓸 수 없으면 supported=false (CSS 그라디언트 배경으로 대체).
 */
export function createOcean(container, { sea = true } = {}) {
  const noop = { supported: false, update() {}, dispose() {} };
  let renderer;
  try {
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return noop;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return noop;
  }

  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = reduceQuery.matches;

  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.className = 'sea-canvas';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
  camera.position.set(0, 4.2, 12);
  camera.lookAt(0, sea ? 0.2 : 4.0, -14); // 바다가 없으면 수평으로 봐서 바람이 화면 가운데에 오게

  const initial = targetFrom({ level: 'go' });
  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: initial.amp },
    uFreq: { value: initial.freq },
    uSpeed: { value: initial.speed },
    uChop: { value: initial.chop },
    uDeep: { value: initial.deep.clone() },
    uShallow: { value: initial.shallow.clone() },
    uSky: { value: SKY.clone() },
    uSun: { value: SUN.clone() },
  };

  const small = window.innerWidth < 640;
  const seg = small ? 110 : 170;
  const geometry = new THREE.PlaneGeometry(120, 120, seg, seg);
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.z = -30;
  mesh.frustumCulled = false;
  mesh.visible = sea;
  scene.add(mesh);

  const windFx = createWindFx();
  const rainFx = createRainFx();
  scene.add(windFx.object, rainFx.object);
  let clock = 0; // 바람·비 애니메이션 시간

  let target = initial;
  let rafId = 0;
  let last = 0;
  let disposed = false;

  function resize() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // 세로로 좁은 화면에서는 시야각을 넓혀 바다가 잘리지 않게
    camera.fov = camera.aspect < 1 ? 62 : 48;
    camera.updateProjectionMatrix();
    if (reduced) renderer.render(scene, camera);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);

  function ease(dt) {
    const a = 1 - Math.exp(-dt * 2.5);
    windFx.step(dt, a, clock);
    rainFx.step(dt, a, clock);
    uniforms.uAmp.value += (target.amp - uniforms.uAmp.value) * a;
    uniforms.uFreq.value += (target.freq - uniforms.uFreq.value) * a;
    uniforms.uSpeed.value += (target.speed - uniforms.uSpeed.value) * a;
    uniforms.uChop.value += (target.chop - uniforms.uChop.value) * a;
    uniforms.uDeep.value.lerp(target.deep, a);
    uniforms.uShallow.value.lerp(target.shallow, a);
  }

  function frame(ts) {
    if (disposed) return;
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (ts - (last || ts)) / 1000);
    last = ts;
    uniforms.uTime.value += dt;
    clock += dt;
    ease(dt);
    renderer.render(scene, camera);
  }

  function start() {
    cancelAnimationFrame(rafId);
    last = 0;
    if (reduced) {
      // 움직임 줄이기: 정지 화면 한 장만 그린다
      uniforms.uTime.value = 2.0;
      clock = 2.0;
      ease(10);
      renderer.render(scene, camera);
    } else {
      rafId = requestAnimationFrame(frame);
    }
  }

  const onMotionChange = (e) => {
    reduced = e.matches;
    start();
  };
  reduceQuery.addEventListener('change', onMotionChange);

  resize();
  start();

  return {
    supported: true,
    update(cond) {
      target = targetFrom(cond);
      windFx.set({ ...cond, boost: sea ? 1 : 2 });
      rainFx.set(cond);
      if (reduced) {
        ease(10);
        renderer.render(scene, camera);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      reduceQuery.removeEventListener('change', onMotionChange);
      geometry.dispose();
      material.dispose();
      windFx.dispose();
      rainFx.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
