import * as THREE from "three";
import type { ColliderBox } from "./world3d";

const R = 0.38; // capsule radius
const H = 1.68; // total height
const EYE = 1.56;

export interface Player {
  group: THREE.Group;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number; // radians
  pitch: number;
}

export function createPlayer(): Player {
  const group = new THREE.Group();
  group.name = "player";
  const mesh = new THREE.Group();

  // body — capsule approximation with cylinder+spheres
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a5a44, roughness: 0.82 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd7ad8f, roughness: 0.62 });
  const pantMat = new THREE.MeshStandardMaterial({ color: 0x333a2e, roughness: 0.88 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xb78a3e, roughness: 0.6 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.62, 4, 12), bodyMat);
  torso.position.set(0, 1.08, 0);
  torso.castShadow = true;
  mesh.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), skinMat);
  head.position.set(0, 1.62, 0);
  head.castShadow = true;
  mesh.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshStandardMaterial({ color: 0x2e2018, roughness: 0.95 }));
  hair.position.set(0, 1.75, -0.04);
  hair.scale.set(1, 0.62, 1);
  mesh.add(hair);

  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.62, 4, 8), pantMat);
  legL.position.set(-0.13, 0.42, 0);
  mesh.add(legL);
  const legR = legL.clone();
  legR.position.set(0.13, 0.42, 0);
  mesh.add(legR);

  const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.06), accentMat);
  scarf.position.set(0, 1.18, 0.22);
  scarf.rotation.x = 0.12;
  mesh.add(scarf);

  // shadow proxy
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(R, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.02, 0);
  mesh.add(shadow);

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
  // capsule = vertical segment + radius
  const cx = THREE.MathUtils.clamp(pos.x, box.min.x, box.max.x);
  const cz = THREE.MathUtils.clamp(pos.z, box.min.z, box.max.z);
  const dx = pos.x - cx;
  const dz = pos.z - cz;
  if (dx * dx + dz * dz > R * R) return false;
  // y: capsule extends 0..H
  const by0 = box.min.y, by1 = box.max.y;
  // capsule y interval [0, H]
  if (H < by0 || 0 > by1) return false;
  return true;
}

function resolvePenetration(pos: THREE.Vector3, box: ColliderBox): THREE.Vector3 | null {
  if (!capsuleAabbOverlap(pos, box)) return null;
  const cx = THREE.MathUtils.clamp(pos.x, box.min.x, box.max.x);
  const cz = THREE.MathUtils.clamp(pos.z, box.min.z, box.max.z);
  let dx = pos.x - cx, dz = pos.z - cz;
  const dist = Math.hypot(dx, dz);
  // if inside box (dist≈0), push to nearest face
  if (dist < 0.001) {
    // distances to faces
    const toMinX = pos.x - box.min.x;
    const toMaxX = box.max.x - pos.x;
    const toMinZ = pos.z - box.min.z;
    const toMaxZ = box.max.z - pos.z;
    let min = toMinX, ax = -1, az = 0;
    if (toMaxX < min) { min = toMaxX; ax = 1; az = 0; }
    if (toMinZ < min) { min = toMinZ; ax = 0; az = -1; }
    if (toMaxZ < min) { min = toMaxZ; ax = 0; az = 1; }
    dx = ax; dz = az;
    // push out by radius + min
    return new THREE.Vector3(ax * (R + min + 0.01), 0, az * (R + min + 0.01));
  }
  const push = R - dist + 0.01;
  return new THREE.Vector3((dx / dist) * push, 0, (dz / dist) * push);
}

export function movePlayer(player: Player, delta: THREE.Vector3, colliders: ColliderBox[]): void {
  // try X then Z for sliding
  const tryPos = (off: THREE.Vector3): boolean => {
    TMP.copy(player.position).add(off);
    for (const b of colliders) if (capsuleAabbOverlap(TMP, b)) return false;
    return true;
  };

  const step = delta.clone();
  // X
  const offX = new THREE.Vector3(step.x, 0, 0);
  if (offX.lengthSq() > 1e-6) {
    if (tryPos(offX)) {
      player.position.add(offX);
    } else {
      // collect penetration resolution for collided boxes along X move
      for (const b of colliders) {
        const res = resolvePenetration(TMP.copy(player.position).add(offX), b);
        if (res) {
          // only apply along normal's dominant axis for sliding: zero out normal component from velocity
          // simplified: push out
          // but for sliding we just don't move X; keep Z
        }
      }
    }
  }
  // Z
  const offZ = new THREE.Vector3(0, 0, step.z);
  if (offZ.lengthSq() > 1e-6) {
    const trial = TMP.copy(player.position).add(offZ);
    let blocked = false;
    for (const b of colliders) if (capsuleAabbOverlap(trial, b)) { blocked = true; break; }
    if (!blocked) {
      player.position.add(offZ);
    }
  }
  // Y is locked to ground (0). If we ever re-enable jumps, add vertical.

  // broad push-out for any residual overlap (e.g. corner)
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
