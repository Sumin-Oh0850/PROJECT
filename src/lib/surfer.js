// 서퍼 (Three.js): 면을 줄인 각진 저폴리 형태. 보드 위에 웅크려 선 자세로 파도에 맞춰 흔들립니다.
//   createSurfer() → { object, pose(t, effort), dispose() }
//   - pose: t 시간, effort 0~1 (파도가 클수록 더 웅크리고 팔을 더 벌림)
//   - 만든 geometry·material 은 dispose() 로 모두 해제합니다.
import * as THREE from 'three';

const PALETTE = { suit: '#7389b8', skin: '#e6b79d', hair: '#a8795e', board: '#f1ece0' };

export function createSurfer() {
  const geos = [];
  const mats = [];
  const mat = (color) => {
    const m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0 });
    mats.push(m);
    return m;
  };
  const part = (geo, m, parent) => {
    geos.push(geo);
    const o = new THREE.Mesh(geo, m);
    parent.add(o);
    return o;
  };
  const suit = mat(PALETTE.suit);
  const skin = mat(PALETTE.skin);
  const hair = mat(PALETTE.hair);
  // 팔다리: 관절(그룹)을 돌려 자세를 만들고, 캡슐은 관절에서 아래로 늘어뜨림 (면 수를 줄여 각지게)
  const limb = (parent, len, r, m) => {
    const j = new THREE.Group();
    parent.add(j);
    const c = part(new THREE.CapsuleGeometry(r, len, 2, 5), m, j);
    c.position.y = -len / 2 - r * 0.4;
    return j;
  };

  const rig = new THREE.Group(); // 서퍼 (보드 위)
  const board = part(new THREE.IcosahedronGeometry(1, 1), mat(PALETTE.board), rig);
  board.scale.set(0.62, 0.035, 0.17);
  board.position.y = 0.02;

  const rider = new THREE.Group();
  rider.position.set(0, 0.05, 0);
  rider.scale.setScalar(0.95);
  rig.add(rider);
  const hip = new THREE.Group();
  hip.position.y = 0.5;
  rider.add(hip);

  // 다리 (앞발 +x, 뒷발 -x, 무릎을 앞으로 굽힌 웅크린 자세)
  const thighF = limb(hip, 0.26, 0.065, suit);
  thighF.position.set(0.16, 0, 0.07);
  const shinF = limb(thighF, 0.24, 0.055, suit);
  shinF.position.y = -0.3;
  const footF = part(new THREE.IcosahedronGeometry(0.06, 0), skin, shinF);
  footF.position.set(0.04, -0.34, 0);
  footF.scale.set(1.5, 0.6, 1);
  const thighB = limb(hip, 0.26, 0.065, suit);
  thighB.position.set(-0.16, 0, -0.07);
  const shinB = limb(thighB, 0.24, 0.055, suit);
  shinB.position.y = -0.3;
  const footB = part(new THREE.IcosahedronGeometry(0.06, 0), skin, shinB);
  footB.position.set(0.04, -0.34, 0);
  footB.scale.set(1.5, 0.6, 1);

  // 상체 (앞으로 숙임) · 머리(단발)
  const chest = new THREE.Group();
  hip.add(chest);
  part(new THREE.CapsuleGeometry(0.105, 0.22, 2, 6), suit, chest).position.y = 0.17;
  const neck = new THREE.Group();
  neck.position.y = 0.46;
  chest.add(neck);
  part(new THREE.IcosahedronGeometry(0.095, 1), skin, neck).position.y = 0.06;
  const bob = part(new THREE.IcosahedronGeometry(0.105, 0), hair, neck);
  bob.position.set(-0.015, 0.1, 0);
  bob.scale.set(1, 0.85, 1.05);

  // 팔 (앞팔은 앞·아래로, 뒷팔은 뒤·위로 균형)
  const armF = limb(chest, 0.22, 0.045, suit);
  armF.position.set(0.02, 0.36, 0.13);
  part(new THREE.IcosahedronGeometry(0.045, 0), skin, armF).position.y = -0.3;
  const armB = limb(chest, 0.22, 0.045, suit);
  armB.position.set(0.02, 0.36, -0.13);
  part(new THREE.IcosahedronGeometry(0.045, 0), skin, armB).position.y = -0.3;

  rig.rotation.y = -0.55; // 3/4 로 보이게

  return {
    object: rig,
    pose(t, effort) {
      const crouch = 0.9 + effort * 0.35;
      thighF.rotation.z = -crouch * 0.85;
      shinF.rotation.z = crouch * 1.0;
      thighB.rotation.z = -crouch * 0.7;
      shinB.rotation.z = crouch * 0.95;
      hip.position.y = 0.5 - effort * 0.06 + Math.sin(t * 2.1) * 0.012;
      chest.rotation.z = -(0.55 + effort * 0.2) + Math.sin(t * 1.4) * 0.04;
      armF.rotation.z = -(0.9 + effort * 0.3) + Math.sin(t * 2.0) * 0.1;
      armF.rotation.x = -0.5 - effort * 0.3;
      armB.rotation.z = 0.7 + effort * 0.3 - Math.sin(t * 2.0 + 1) * 0.1;
      armB.rotation.x = 0.5 + effort * 0.3;
      neck.rotation.z = 0.35 + Math.sin(t * 1.4) * 0.03;
    },
    dispose() {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}
