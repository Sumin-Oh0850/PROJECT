// Three.js 바람·비 효과 (ocean.js 의 같은 장면에 얹어 한 번에 렌더링합니다)
//   createWindFx() / createRainFx() → { object, set(조건), step(dt, a, time), dispose() }
//   - 바람: 풍속이 클수록 줄기가 많고·빠르고·길게 흐르고, 가능/주의/위험에 따라 세기와 색이 은은하게 달라집니다.
//   - 비: 강수량(mm)·날씨 코드에 따라 빗줄기 수가 달라지고, 바람이 세면 비스듬히 내립니다. 비가 없으면 그리지 않습니다.
import * as THREE from 'three';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const lerp = (a, b, t) => a + (b - a) * t;

// 같은 입력이면 늘 같은 배치가 되도록 시드 난수를 씁니다 (새로고침해도 모양이 같음)
function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

// 줄기 하나 = 얇은 띠(꼭짓점 4개, 삼각형 2개). 선(1px)은 멀리서 거의 안 보여서 폭이 있는 띠로 그립니다.
// position 은 0~1 시드값, aEnd 는 0(머리) / 1(꼬리), aSide 는 띠의 양쪽(-1 / +1)
function streakGeometry(count, seed) {
  const rnd = seeded(seed);
  const pos = new Float32Array(count * 12);
  const end = new Float32Array(count * 4);
  const side = new Float32Array(count * 4);
  const index = new Uint32Array(count * 6);
  for (let i = 0; i < count; i++) {
    const x = rnd(), y = rnd(), z = rnd();
    for (let v = 0; v < 4; v++) pos.set([x, y, z], (i * 4 + v) * 3);
    end.set([0, 0, 1, 1], i * 4);
    side.set([-1, 1, -1, 1], i * 4);
    const b = i * 4;
    index.set([b, b + 1, b + 2, b + 2, b + 1, b + 3], i * 6);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  return g;
}

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vA;
  void main() { gl_FragColor = vec4(uColor, vA); }
`;

const WIND_VERT = /* glsl */ `
  uniform float uTime;
  uniform vec2 uDir;     // 바람이 흐르는 방향 (x, z)
  uniform float uSpeed;
  uniform float uLen;
  uniform float uWob;    // 위아래로 흔들리는 정도
  uniform vec3 uBox;     // 줄기가 퍼져 있는 공간 크기
  uniform float uAlpha;
  uniform float uW;      // 띠 굵기
  attribute float aEnd;
  attribute float aSide;
  varying float vA;

  void main() {
    vec3 s = position;
    float travel = uTime * uSpeed * (0.7 + s.y * 0.6);
    vec2 p = vec2(s.x * uBox.x, s.z * uBox.z) + uDir * travel;
    p.x = mod(p.x + uBox.x * 0.5, uBox.x) - uBox.x * 0.5;
    p.y = mod(p.y, uBox.z) - uBox.z - 6.0; // 카메라에서 멀리(z -6 ~ -6-깊이)만 써서 눈앞으로 쏟아지지 않게
    float y = 0.7 + s.y * uBox.y + sin(uTime * 1.6 + s.x * 40.0) * uWob;
    float len = uLen * (0.6 + 0.8 * fract(s.x * 7.3 + s.z * 3.1));
    vec2 q = p - uDir * len * aEnd;
    // 공간 가장자리에서 서서히 사라져, 반대편에서 다시 나타날 때 튀지 않게
    float fade = smoothstep(0.0, 8.0, uBox.x * 0.5 - abs(q.x))
               * smoothstep(0.0, 6.0, -6.0 - q.y)
               * smoothstep(0.0, 6.0, q.y - (-6.0 - uBox.z));
    vA = uAlpha * (1.0 - 0.85 * aEnd) * fade;
    y += aSide * uW * (1.0 - 0.8 * aEnd); // 꼬리로 갈수록 가늘어짐
    gl_Position = projectionMatrix * viewMatrix * vec4(q.x, y, q.y, 1.0);
  }
`;

const RAIN_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uFall;
  uniform float uLen;
  uniform vec2 uSlant;   // 비스듬히 내리는 정도 (x, z)
  uniform vec3 uBox;
  uniform float uAlpha;
  uniform float uW;
  attribute float aEnd;
  attribute float aSide;
  varying float vA;

  void main() {
    vec3 s = position;
    float fallT = uTime * uFall * (0.8 + 0.4 * fract(s.x * 13.7));
    float y = mod(s.y * uBox.y - fallT, uBox.y);
    vec3 head = vec3(s.x * uBox.x - uBox.x * 0.5, y, 10.0 - s.z * uBox.z);
    // 머리는 아래, 꼬리는 위·바람 쪽
    vec3 pos = head + vec3(-uSlant.x, 1.0, -uSlant.y) * uLen * aEnd;
    pos.x += aSide * uW * (1.0 - 0.6 * aEnd);
    vA = uAlpha * (1.0 - 0.7 * aEnd) * smoothstep(0.0, 1.5, y);
    gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
  }
`;

function lineMaterial(vertexShader, uniforms) {
  return new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader: FRAG, transparent: true, depthWrite: false });
}

// 위험도별 바람 표현 (배율은 풍속으로 정한 값에 곱함)
const WIND_LEVEL = {
  go: { count: 0.8, speed: 0.8, len: 0.9, alpha: 0.5, color: '#ffffff', wob: 0.0 },
  caution: { count: 1.2, speed: 1.1, len: 1.15, alpha: 0.6, color: '#fff1c9', wob: 0.15 },
  danger: { count: 1.7, speed: 1.5, len: 1.5, alpha: 0.7, color: '#ffd0d0', wob: 0.35 },
};

export function createWindFx() {
  const MAX = 300;
  const geometry = streakGeometry(MAX, 11);
  const uniforms = {
    uTime: { value: 0 },
    uDir: { value: new THREE.Vector2(0.9, 0.3) },
    uSpeed: { value: 5 },
    uLen: { value: 1.5 },
    uWob: { value: 0 },
    uBox: { value: new THREE.Vector3(70, 6.5, 36) },
    uAlpha: { value: 0 },
    uW: { value: 0.16 },
    uColor: { value: new THREE.Color('#ffffff') },
  };
  const object = new THREE.Mesh(geometry, lineMaterial(WIND_VERT, uniforms));
  object.frustumCulled = false;

  const cur = { count: 0, speed: 5, len: 1.5, alpha: 0, wob: 0, dx: 0.9, dz: 0.3, color: new THREE.Color('#ffffff') };
  let tgt = { ...cur, color: cur.color.clone() };

  return {
    object,
    // boost: 바다가 없는 장면(패러글라이딩)에서는 바람이 유일한 표현이라 더 또렷하게 (1 = 기본)
    set({ windSpeed, windDir, level, boost = 1 }) {
      const w = clamp(num(windSpeed, 3), 0, 20);
      const l = WIND_LEVEL[level] ?? WIND_LEVEL.go;
      // 풍향: 바람이 불어오는 반대쪽으로 흐름. 화면이 가로로 넓어 오른쪽 성분을 조금 섞어 줄기가 시원하게 보이게 함
      let dx = 0.9, dz = 0.3;
      if (typeof windDir === 'number' && Number.isFinite(windDir)) {
        const to = ((windDir + 180) * Math.PI) / 180;
        dx = Math.sin(to) * 0.7 + 0.9; // 옆으로 흐르는 성분을 크게, 앞뒤(카메라 쪽) 성분은 작게
        dz = -Math.cos(to) * 0.3;
      }
      const n = Math.hypot(dx, dz) || 1;
      tgt = {
        count: clamp((14 + w * 11) * l.count * boost, 8, MAX),
        speed: (3 + w * 1.1) * l.speed,
        len: (3.2 + w * 0.4) * l.len,
        alpha: w < 0.3 ? 0 : Math.min(0.9, l.alpha * (boost > 1 ? 1.35 : 1)),
        wob: l.wob,
        dx: dx / n,
        dz: dz / n,
        color: new THREE.Color(l.color),
      };
    },
    step(dt, a, time) {
      cur.count = lerp(cur.count, tgt.count, a);
      cur.speed = lerp(cur.speed, tgt.speed, a);
      cur.len = lerp(cur.len, tgt.len, a);
      cur.alpha = lerp(cur.alpha, tgt.alpha, a);
      cur.wob = lerp(cur.wob, tgt.wob, a);
      cur.dx = lerp(cur.dx, tgt.dx, a);
      cur.dz = lerp(cur.dz, tgt.dz, a);
      cur.color.lerp(tgt.color, a);
      // 방향이 바뀌어도 줄기가 순간이동하지 않도록 시간은 속도로 누적하지 않고 uTime 만 씀 (위치 = 시간 × 속도)
      uniforms.uTime.value = time;
      uniforms.uSpeed.value = cur.speed;
      uniforms.uLen.value = cur.len;
      uniforms.uAlpha.value = cur.alpha;
      uniforms.uWob.value = cur.wob;
      uniforms.uDir.value.set(cur.dx, cur.dz);
      uniforms.uColor.value.copy(cur.color);
      geometry.setDrawRange(0, Math.round(cur.count) * 6);
      object.visible = cur.alpha > 0.01;
    },
    dispose() {
      geometry.dispose();
      object.material.dispose();
    },
  };
}

// 날씨 코드(WMO)로 본 비의 세기 (강수량이 없을 때의 보조)
function rainByCode(code) {
  if ([51, 53, 55, 56, 57].includes(code)) return 0.25;
  if ([61, 63, 66, 80].includes(code)) return 0.5;
  if ([65, 67, 81, 82].includes(code)) return 0.8;
  if ([95, 96, 99].includes(code)) return 0.9;
  return 0;
}

/** 비의 세기 0~1: 강수량(mm)이 있으면 그걸로, 없으면 날씨 코드로 */
export function rainIntensity({ precipMm, weatherCode }) {
  const mm = num(precipMm, 0);
  const byMm = mm > 0 ? clamp(Math.max(mm / 3, 0.15), 0, 1) : 0;
  return Math.max(byMm, rainByCode(weatherCode));
}

export function createRainFx() {
  const MAX = 1400;
  const geometry = streakGeometry(MAX, 29);
  const uniforms = {
    uTime: { value: 0 },
    uFall: { value: 18 },
    uLen: { value: 0.9 },
    uSlant: { value: new THREE.Vector2(0.1, 0) },
    uBox: { value: new THREE.Vector3(70, 14, 55) },
    uAlpha: { value: 0 },
    uW: { value: 0.03 },
    uColor: { value: new THREE.Color('#cfe6f5') },
  };
  const object = new THREE.Mesh(geometry, lineMaterial(RAIN_VERT, uniforms));
  object.frustumCulled = false;

  const cur = { count: 0, alpha: 0, sx: 0.1 };
  let tgt = { ...cur };

  return {
    object,
    set({ precipMm, weatherCode, windSpeed }) {
      const i = rainIntensity({ precipMm, weatherCode });
      tgt = {
        count: i === 0 ? 0 : 160 + i * 1100,
        alpha: i === 0 ? 0 : 0.4 + i * 0.3,
        sx: clamp(num(windSpeed, 0) * 0.03, 0, 0.5), // 바람이 셀수록 비스듬히
      };
    },
    step(dt, a, time) {
      cur.count = lerp(cur.count, tgt.count, a);
      cur.alpha = lerp(cur.alpha, tgt.alpha, a);
      cur.sx = lerp(cur.sx, tgt.sx, a);
      uniforms.uTime.value = time;
      uniforms.uAlpha.value = cur.alpha;
      uniforms.uSlant.value.set(cur.sx, 0);
      geometry.setDrawRange(0, Math.round(cur.count) * 6);
      object.visible = cur.alpha > 0.01;
    },
    dispose() {
      geometry.dispose();
      object.material.dispose();
    },
  };
}
