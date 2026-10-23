import * as THREE from "three";
import type { ColliderBox } from "./world3d";

const R = 0.38; // capsule radius for collisions
const H = 1.68; // total height
const EYE = 1.58;

export interface Player {
  group: THREE.Group;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  pitch: number;
}

export function createPlayer(): Player {
  const group = new THREE.Group(); group.name = "player";
  const mesh = new THREE.Group();
  // --- realistic player — “Алекс” 22y, parka, bag ---
  const coatCol = new THREE.Color(0x4a5a44), pantsCol = new THREE.Color(0x333a2e), skinCol = new THREE.Color(0xd7ad8f), hairCol = new THREE.Color(0x2e2018), accent = new THREE.Color(0xb78a3e);
  const coatMat = new THREE.MeshStandardMaterial({ color: coatCol, roughness: 0.84 });
  const coatDark = new THREE.MeshStandardMaterial({ color: coatCol.clone().multiplyScalar(0.78), roughness: 0.88 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsCol, roughness: 0.88 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skinCol, roughness: 0.52 });
  const skinDark = new THREE.MeshStandardMaterial({ color: skinCol.clone().multiplyScalar(0.92), roughness: 0.55 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairCol, roughness: 0.96 });

  const scale = 1;
  // shadow
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(R, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.20, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.02, 0); mesh.add(shadow);
  // torso — parka
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.70, 0.32), coatMat); torso.position.set(0, 1.07, 0); torso.castShadow = true; mesh.add(torso);
  // hood (down)
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.08), coatDark); hood.position.set(0, 1.42, -0.14); hood.rotation.x = 0.28; mesh.add(hood);
  // zip + buttons
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.008, 8), new THREE.MeshStandardMaterial({ color: accent, metalness: 0.45, roughness: 0.32 }));
    btn.rotation.x = Math.PI / 2; btn.position.set(0, 1.24 - i * 0.15, 0.165); mesh.add(btn);
  }
  // pockets with flaps
  [-0.16, 0.16].forEach(x => {
    const pkt = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.015), coatMat); pkt.position.set(x, 1.02, 0.165); mesh.add(pkt);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.04, 0.018), coatDark); flap.position.set(x, 1.09, 0.172); flap.rotation.x = 0.12; mesh.add(flap);
  });
  // neck + head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.14, 8), skinDark); neck.position.set(0, 1.46, 0); mesh.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.215, 14, 11), skinMat); head.position.set(0, 1.65, 0); head.castShadow = true; mesh.add(head);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), skinDark); jaw.position.set(0, 1.54, 0.06); jaw.scale.set(1, 0.6, 0.82); mesh.add(jaw);
  // eyes
  [-0.07, 0.07].forEach(off => {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), new THREE.MeshStandardMaterial({ color: 0xf5f0e0 })); w.position.set(off, 1.68, 0.16); w.scale.set(1, 0.82, 0.62); mesh.add(w);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 5), new THREE.MeshStandardMaterial({ color: 0x4a6a8a })); iris.position.set(off, 1.68, 0.185); mesh.add(iris);
  });
  const nose = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.045, 4, 6), skinDark); nose.position.set(0, 1.64, 0.20); nose.rotation.x = Math.PI / 2; mesh.add(nose);
  // hair — short dark, textured
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.225, 12, 9), hairMat); hairCap.position.set(0, 1.80, -0.02); hairCap.scale.set(1, 0.62, 1); mesh.add(hairCap);
  const hairSideL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.18), hairMat); hairSideL.position.set(-0.18, 1.72, 0); mesh.add(hairSideL);
  const hairSideR = hairSideL.clone(); hairSideR.position.set(0.18, 1.72, 0); mesh.add(hairSideR);
  // arms
  function arm(side: number) {
    const g = new THREE.Group(); g.position.set(side * 0.32, 1.28, 0);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.28, 4, 8), coatMat); up.position.set(0, -0.16, 0); up.castShadow = true; g.add(up);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.26, 4, 8), coatMat); fore.position.set(0, -0.44, 0.04); g.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.062, 6, 5), skinMat); hand.position.set(0, -0.62, 0.04); hand.scale.set(1, 0.72, 1); g.add(hand);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.068, 0.04, 8), coatDark); cuff.position.set(0, -0.32, 0); g.add(cuff);
    // glove? bare hand
    return g;
  }
  const aL = arm(-1), aR = arm(1); aL.rotation.z = 0.10; aR.rotation.z = -0.10; mesh.add(aL); mesh.add(aR);
  // legs
  function leg(side: number) {
    const g = new THREE.Group(); g.position.set(side * 0.13, 0.72, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.42, 4, 8), pantsMat); thigh.position.set(0, -0.22, 0); thigh.castShadow = true; g.add(thigh);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.38, 4, 8), pantsMat); shin.position.set(0, -0.62, 0.02); g.add(shin);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.26), new THREE.MeshStandardMaterial({ color: 0x1e1a16, roughness: 0.38 })); shoe.position.set(0, -0.84, 0.04); shoe.castShadow = true; g.add(shoe);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.022, 0.27), new THREE.MeshStandardMaterial({ color: 0x3a352f })); sole.position.set(0, -0.89, 0.04); g.add(sole);
    return g;
  }
  mesh.add(leg(-1)); mesh.add(leg(1));
  // bag — messenger
  const bag = new THREE.Group(); bag.position.set(0.30, 0.98, -0.12); bag.rotation.y = -0.18;
  const bagBody = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.34, 0.11), new THREE.MeshStandardMaterial({ color: 0x3d2a16, roughness: 0.68 })); bagBody.castShadow = true; bag.add(bagBody);
  const bagFlap = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: 0x5a3a1a })); bagFlap.position.set(0, 0.06, 0.06); bagFlap.rotation.x = 0.12; bag.add(bagFlap);
  const bagStrap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.72, 6), new THREE.MeshStandardMaterial({ color: 0x2a1a0a })); bagStrap.position.set(-0.08, 0.34, 0.04); bagStrap.rotation.z = 0.42; bagStrap.rotation.x = 0.18; bag.add(bagStrap);
  mesh.add(bag);
  // scarf accent
  const scarf = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.42), new THREE.MeshStandardMaterial({ color: accent, side: THREE.DoubleSide, roughness: 0.92 })); scarf.position.set(0, 1.18, 0.17); scarf.rotation.x = 0.08; mesh.add(scarf);

  group.add(mesh);
  return { group, mesh, position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3(), yaw: 0, pitch: 0 };
}

export function setPlayerPos(player: Player, v: THREE.Vector3, yaw?: number) {
  player.position.copy(v);
  player.group.position.copy(v);
  if (yaw !== undefined) player.yaw = yaw;
  player.mesh.rotation.y = player.yaw;
}

/* ---------- collision: swept capsule vs AABB (conservative) ---------- */
const TMP = new THREE.Vector3();

function capsuleAabbOverlap(pos: THREE.Vector3, box: ColliderBox): boolean {
  const cx = THREE.MathUtils.clamp(pos.x, box.min.x, box.max.x);
  const cz = THREE.MathUtils.clamp(pos.z, box.min.z, box.max.z);
  const dx = pos.x - cx;
  const dz = pos.z - cz;
  if (dx * dx + dz * dz > R * R) return false;
  const by0 = box.min.y, by1 = box.max.y;
  if (H < by0 || 0 > by1) return false;
  return true;
}

function resolvePenetration(pos: THREE.Vector3, box: ColliderBox): THREE.Vector3 | null {
  if (!capsuleAabbOverlap(pos, box)) return null;
  const cx = THREE.MathUtils.clamp(pos.x, box.min.x, box.max.x);
  const cz = THREE.MathUtils.clamp(pos.z, box.min.z, box.max.z);
  let dx = pos.x - cx, dz = pos.z - cz;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.001) {
    const toMinX = pos.x - box.min.x;
    const toMaxX = box.max.x - pos.x;
    const toMinZ = pos.z - box.min.z;
    const toMaxZ = box.max.z - pos.z;
    let min = toMinX, ax = -1, az = 0;
    if (toMaxX < min) { min = toMaxX; ax = 1; az = 0; }
    if (toMinZ < min) { min = toMinZ; ax = 0; az = -1; }
    if (toMaxZ < min) { min = toMaxZ; ax = 0; az = 1; }
    dx = ax; dz = az;
    return new THREE.Vector3(ax * (R + min + 0.01), 0, az * (R + min + 0.01));
  }
  const push = R - dist + 0.01;
  return new THREE.Vector3((dx / dist) * push, 0, (dz / dist) * push);
}

export function movePlayer(player: Player, delta: THREE.Vector3, colliders: ColliderBox[]): void {
  const tryPos = (off: THREE.Vector3): boolean => {
    TMP.copy(player.position).add(off);
    for (const b of colliders) if (capsuleAabbOverlap(TMP, b)) return false;
    return true;
  };

  const step = delta.clone();
  const offX = new THREE.Vector3(step.x, 0, 0);
  if (offX.lengthSq() > 1e-6) {
    if (tryPos(offX)) {
      player.position.add(offX);
    }
  }
  const offZ = new THREE.Vector3(0, 0, step.z);
  if (offZ.lengthSq() > 1e-6) {
    const trial = TMP.copy(player.position).add(offZ);
    let blocked = false;
    for (const b of colliders) if (capsuleAabbOverlap(trial, b)) { blocked = true; break; }
    if (!blocked) {
      player.position.add(offZ);
    }
  }
  for (let iter = 0; iter < 3; iter++) {
    let pushed = false;
    for (const b of colliders) {
      const res = resolvePenetration(player.position, b);
      if (res) {
        player.position.add(res);
        pushed = true;
      }
    }
    if (!pushed) break;
  }
  player.group.position.copy(player.position);
}

export function playerEye(player: Player): THREE.Vector3 {
  return new THREE.Vector3(player.position.x, player.position.y + EYE, player.position.z);
}

export const PLAYER_METRICS = { R, H, EYE };
