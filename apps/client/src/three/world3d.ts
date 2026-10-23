import * as THREE from "three";
import type { ZoneId } from "@mir/shared";
import { ZONES } from "@mir/shared";

/** Real-world scale: 1 unit = 1 meter. Courtyard ~ 36×28 m fits 1440×980 2D. Scale 40 px ≈ 1 m. */
const SCALE = 36; // 1440px / 40m ≈ 36 px/m. We invert for 3D.
function px(n: number): number {
  return n / SCALE;
}

export interface ColliderBox {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export interface ZoneWorld {
  group: THREE.Group;
  colliders: ColliderBox[];
  triggers: { id: string; pos: THREE.Vector3; radius: number; to?: ZoneId; via?: string }[];
  spawns: Record<string, THREE.Vector3>;
  groundY: number;
}

/* ---------- materials (shared) ---------- */
function makeMaterials(texLoader: THREE.TextureLoader) {
  const asphalt = texLoader.load("/photo-asphalt-top.jpg");
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
  asphalt.repeat.set(3, 3);
  (asphalt as any).colorSpace = THREE.SRGBColorSpace;

  const concrete = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.92, metalness: 0.02 });
  const asphaltMat = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.94, metalness: 0.02 });
  const brick = new THREE.MeshStandardMaterial({ color: 0x6f5044, roughness: 0.88, metalness: 0.0 });
  const brickLight = new THREE.MeshStandardMaterial({ color: 0x8b6a5a, roughness: 0.9, metalness: 0.0 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.7, metalness: 0.04 });
  const signMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.6, metalness: 0.0 });
  const benchWood = new THREE.MeshStandardMaterial({ color: 0x7b5a3e, roughness: 0.72, metalness: 0.0 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x4a5256, roughness: 0.45, metalness: 0.35 });
  const foliage = new THREE.MeshStandardMaterial({ color: 0x5a7248, roughness: 0.85, metalness: 0.0 });
  const foliageDark = new THREE.MeshStandardMaterial({ color: 0x3d4e31, roughness: 0.9, metalness: 0.0 });
  const sand = new THREE.MeshStandardMaterial({ color: 0xd8c39a, roughness: 0.98, metalness: 0.0 });
  const sky = new THREE.Color(0xcfd8e6);

  return { asphalt, asphaltMat, concrete, brick, brickLight, doorMat, signMat, benchWood, metal, foliage, foliageDark, sand, sky };
}

/* ---------- helpers ---------- */
function addBox(
  group: THREE.Group,
  colliders: ColliderBox[],
  geom: THREE.BufferGeometry,
  mat: THREE.Material,
  pos: THREE.Vector3,
  rotY = 0,
  opts?: { collider?: boolean; receiveShadow?: boolean; castShadow?: boolean },
): THREE.Mesh {
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.copy(pos);
  mesh.rotation.y = rotY;
  mesh.castShadow = opts?.castShadow !== false;
  mesh.receiveShadow = opts?.receiveShadow !== false;
  group.add(mesh);
  if (opts?.collider !== false) {
    geom.computeBoundingBox();
    const bb = new THREE.Box3().setFromObject(mesh);
    colliders.push({ min: bb.min.clone(), max: bb.max.clone() });
  }
  return mesh;
}

function textSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = "rgba(18,14,10,0.92)";
  ctx.beginPath();
  ctx.roundRect(6, 18, 500, 92, 14);
  ctx.fill();
  ctx.fillStyle = "#f1e4cb";
  ctx.font = "600 28px Inter, system-ui, sans-serif";
  ctx.fillText(text, 24, 62);
  ctx.fillStyle = "rgba(241,228,203,0.7)";
  ctx.font = "400 18px Inter, system-ui, sans-serif";
  ctx.fillText("ул. Мира — двор", 24, 90);
  const tex = new THREE.CanvasTexture(canvas);
  (tex as any).colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(6, 1.5, 1);
  return s;
}

/* ---------- courtyard world ---------- */
export function buildCourtyard(texLoader: THREE.TextureLoader): ZoneWorld {
  const mats = makeMaterials(texLoader);
  const group = new THREE.Group();
  group.name = "courtyard";
  const colliders: ColliderBox[] = [];
  const triggers: ZoneWorld["triggers"] = [];
  const spawns: Record<string, THREE.Vector3> = {};

  const CW = px(1440); // 40m
  const CH = px(980); // 27.2m
  const HW = CW / 2;
  const HH = CH / 2;

  // ground
  const groundGeo = new THREE.PlaneGeometry(CW, CH);
  const ground = new THREE.Mesh(groundGeo, mats.asphaltMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0.01, 0);
  ground.receiveShadow = true;
  group.add(ground);

  // subtle vignette ground tint ring
  const edgeGeo = new THREE.PlaneGeometry(CW, CH);
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x11100e, transparent: true, opacity: 0.06, depthWrite: false });
  const edge = new THREE.Mesh(edgeGeo, edgeMat);
  edge.rotation.x = -Math.PI / 2;
  edge.position.set(0, 0.02, 0);
  group.add(edge);

  // north facade — full-width soviet 5-storey
  const wallH = 11;
  const wallTh = 1.2;
  // we split into segments with doors gaps
  addBox(group, colliders, new THREE.BoxGeometry(9, wallH, wallTh), mats.brick, new THREE.Vector3(-HW + 9 / 2, wallH / 2, -HH + wallTh / 2));
  addBox(group, colliders, new THREE.BoxGeometry(6.2, wallH, wallTh), mats.brick, new THREE.Vector3(-HW + 9 + 6.2 / 2, wallH / 2, -HH + wallTh / 2));
  // entrance 1 gap: 100px ≈ 2.78m
  const doorW = px(100);
  const doorH = 3.2;
  // door recess
  addBox(group, colliders, new THREE.BoxGeometry(doorW, wallH - doorH, wallTh), mats.brick, new THREE.Vector3(-HW + px(330) + doorW / 2 + 1.2, wallH - (wallH - doorH) / 2, -HH + wallTh / 2), 0, { collider: false });
  // entrance 2
  addBox(group, colliders, new THREE.BoxGeometry(px(1050) - (px(330) + doorW) - px(6), wallH, wallTh), mats.brick, new THREE.Vector3(-HW + px(330) + doorW + (px(1050) - px(330) - doorW) / 2, wallH / 2, -HH + wallTh / 2));
  addBox(group, colliders, new THREE.BoxGeometry(doorW, wallH - doorH, wallTh), mats.brick, new THREE.Vector3(-HW + px(1050) + doorW / 2 - 0.2, wallH - (wallH - doorH) / 2, -HH + wallTh / 2), 0, { collider: false });
  addBox(group, colliders, new THREE.BoxGeometry(CW - (px(1050) + doorW), wallH, wallTh), mats.brick, new THREE.Vector3(-HW + px(1050) + doorW + (CW - px(1050) - doorW) / 2, wallH / 2, -HH + wallTh / 2));

  // doors
  const d1 = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.9, doorH, 0.18), mats.doorMat);
  d1.position.set(-HW + px(330 + 50), doorH / 2, -HH + wallTh + 0.02);
  d1.castShadow = true;
  group.add(d1);
  const d2 = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.9, doorH, 0.18), mats.doorMat);
  d2.position.set(-HW + px(1050 + 50), doorH / 2, -HH + wallTh + 0.02);
  d2.castShadow = true;
  group.add(d2);

  // sign УЛ. МИРА
  const sign = addBox(group, colliders, new THREE.BoxGeometry(6.6, 0.9, 0.08), mats.signMat, new THREE.Vector3(-HW + px(500 + 120), wallH * 0.68, -HH + wallTh + 0.1), 0, { collider: false });
  sign.castShadow = false;
  // we skip text geometry; sprite above sign
  const spr = textSprite("УЛ. МИРА, 14");
  spr.position.set(-HW + px(500 + 120), wallH * 0.68 + 1.55, -HH + wallTh + 0.5);
  group.add(spr);

  // east / west side walls (low, courtyard enclosed)
  addBox(group, colliders, new THREE.BoxGeometry(wallTh, 2.4, CH - wallTh * 2), mats.brickLight, new THREE.Vector3(-HW + wallTh / 2, 1.2, 0), 0);
  addBox(group, colliders, new THREE.BoxGeometry(wallTh, 2.4, CH - wallTh * 2), mats.brickLight, new THREE.Vector3(HW - wallTh / 2, 1.2, 0), 0);

  // south arch to street (gap)
  const archW = px(184);
  const archWallH = 2.6;
  // left part
  addBox(group, colliders, new THREE.BoxGeometry((CW - archW) / 2 - 0.3, archWallH, wallTh), mats.brickLight, new THREE.Vector3(-HW + (CW - archW) / 4, archWallH / 2, HH - wallTh / 2));
  addBox(group, colliders, new THREE.BoxGeometry((CW - archW) / 2 - 0.3, archWallH, wallTh), mats.brickLight, new THREE.Vector3(HW - (CW - archW) / 4, archWallH / 2, HH - wallTh / 2));
  // arch top lintel
  addBox(group, colliders, new THREE.BoxGeometry(archW + 0.6, 0.9, wallTh), mats.brickLight, new THREE.Vector3(0, 3.15, HH - wallTh / 2));

  // foliage / props as colliders
  const bushGeo = new THREE.SphereGeometry(1.05, 12, 9);
  function bush(pxX: number, pxZ: number, s = 1) {
    // 2D origin top-left; 3D center 0,0 ; Z = -(pxY - CH/2)? we map y→z
    const x = -HW + px(pxX);
    const z = -HH + px(pxZ);
    const m = new THREE.Mesh(bushGeo, mats.foliageDark);
    m.position.set(x, 0.65, z);
    m.scale.set(1.3 * s, 0.95 * s, 1.1 * s);
    m.castShadow = true;
    group.add(m);
    colliders.push({ min: new THREE.Vector3(x - 1.15 * s, 0, z - 0.95 * s), max: new THREE.Vector3(x + 1.15 * s, 1.35 * s, z + 0.95 * s) });
  }
  bush(74 + 45, 300 + 35, 1.0);
  bush(1318 + 40, 330 + 30, 0.92);
  bush(86 + 55, 800 + 40, 1.08);

  // benches — oriented along north-south? use Box
  function bench(pxX: number, pxZ: number) {
    const x = -HW + px(pxX + 64);
    const z = -HH + px(pxZ + 22);
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.12, 0.62), mats.benchWood);
    seat.position.set(0, 0.44, 0);
    seat.castShadow = true;
    seat.receiveShadow = true;
    g.add(seat);
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.5), mats.metal);
    leg1.position.set(-1.5, 0.22, 0);
    g.add(leg1);
    const leg2 = leg1.clone();
    leg2.position.set(1.5, 0.22, 0);
    g.add(leg2);
    g.position.set(x, 0, z);
    group.add(g);
    colliders.push({ min: new THREE.Vector3(x - 1.85, 0, z - 0.45), max: new THREE.Vector3(x + 1.85, 0.72, z + 0.45) });
  }
  bench(200, 612);
  bench(824, 592);
  bench(1180, 620);

  // sandbox
  {
    const x = -HW + px(388 + 93);
    const z = -HH + px(660 + 46);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(5.15, 0.34, 2.55), new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.8 }));
    frame.position.set(x, 0.17, z);
    frame.castShadow = true;
    group.add(frame);
    const sandMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.75, 2.15), mats.sand);
    sandMesh.rotation.x = -Math.PI / 2;
    sandMesh.position.set(x, 0.35, z);
    sandMesh.receiveShadow = true;
    group.add(sandMesh);
    colliders.push({ min: new THREE.Vector3(x - 2.68, 0, z - 1.38), max: new THREE.Vector3(x + 2.68, 0.48, z + 1.38) });
  }

  // birch tree — trunk + canopy
  {
    const x = -HW + px(218 + 130);
    const z = -HH + px(574 + 150);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 5.8, 8), new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.9 }));
    trunk.position.set(x, 2.9, z);
    trunk.castShadow = true;
    group.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(2.2, 14, 10), mats.foliage);
    crown.position.set(x, 6.4, z);
    crown.castShadow = true;
    group.add(crown);
    const crown2 = new THREE.Mesh(new THREE.SphereGeometry(1.55, 12, 8), mats.foliageDark);
    crown2.position.set(x + 0.65, 5.7, z + 0.45);
    group.add(crown2);
    colliders.push({ min: new THREE.Vector3(x - 0.42, 0, z - 0.42), max: new THREE.Vector3(x + 0.42, 5.8, z + 0.42) });
    // canopy collider soft — larger but only lower part blocks?
  }

  // swing set
  {
    const x = -HW + px(598 + 58);
    const z = -HH + px(638 + 55);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.08), mats.metal);
    bar.position.set(x, 2.22, z);
    group.add(bar);
    // A-frames
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.75, 6);
    [-1.5, 1.5].forEach((off) => {
      const l1 = new THREE.Mesh(legGeo, mats.metal);
      l1.position.set(x + off, 1.28, z - 0.7);
      l1.rotation.x = 0.32;
      group.add(l1);
      const l2 = l2Clone(l1, x + off, z + 0.7, -0.32);
      group.add(l2);
    });
    function l2Clone(base: THREE.Mesh, nx: number, nz: number, rot: number): THREE.Mesh {
      const m = new THREE.Mesh(legGeo, mats.metal);
      m.position.set(nx, 1.28, nz);
      m.rotation.x = rot;
      return m;
    }
    colliders.push({ min: new THREE.Vector3(x - 1.7, 0, z - 0.95), max: new THREE.Vector3(x + 1.7, 2.35, z + 0.95) });
  }

  // lamp posts
  function lamp(pxX: number, pxZ: number) {
    const x = -HW + px(pxX + 22);
    const z = -HH + px(pxZ + 46);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 3.4, 8), mats.metal);
    pole.position.set(x, 1.7, z);
    pole.castShadow = true;
    group.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff6d6, roughness: 0.3, emissive: 0x332e1a, emissiveIntensity: 0.35 }));
    head.position.set(x, 3.42, z);
    group.add(head);
    const light = new THREE.PointLight(0xffe8b0, 5, 12, 1.8);
    light.position.set(x, 3.4, z);
    group.add(light);
  }
  lamp(760, 440);
  lamp(1160, 760);

  // bins / bike (decor collision)
  {
    const x = -HW + px(1250 + 46);
    const z = -HH + px(760 + 33);
    const bins = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.95, 0.84), new THREE.MeshStandardMaterial({ color: 0x2d3630, roughness: 0.85 }));
    bins.position.set(x, 0.48, z);
    bins.castShadow = true;
    group.add(bins);
    colliders.push({ min: new THREE.Vector3(x - 1.34, 0, z - 0.5), max: new THREE.Vector3(x + 1.34, 1.05, z + 0.5) });
  }

  // south puddle — decal
  {
    const x = -HW + px(430 + 105);
    const z = -HH + px(820 + 28);
    const p = new THREE.Mesh(new THREE.CircleGeometry(2.55, 18), new THREE.MeshStandardMaterial({ color: 0x6b86a6, roughness: 0.18, metalness: 0.12, transparent: true, opacity: 0.55 }));
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.025, z);
    group.add(p);
  }

  // stone paths — visual thin planes
  {
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xcbbda6, roughness: 0.96 });
    const p1 = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 18.9), pathMat);
    p1.rotation.x = -Math.PI / 2;
    p1.position.set(-HW + px(690 + 32), 0.015, -HH + px(250) + 18.9 / 2);
    p1.receiveShadow = true;
    group.add(p1);
    const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.83, 10.56), pathMat);
    p2.rotation.x = -Math.PI / 2;
    p2.position.set(-HW + px(356 + 15), 0.015, -HH + px(250) + 10.56 / 2);
    group.add(p2);
  }

  // triggers / spawns (map 2D px → 3D)
  const toVec = (pxX: number, pxZ: number): THREE.Vector3 => new THREE.Vector3(-HW + px(pxX), 0.95, -HH + px(pxZ));
  triggers.push({ id: "courtyard.entrance1", pos: toVec(380, 262), radius: 2.45, to: "apartment", via: "from_courtyard" });
  triggers.push({ id: "courtyard.entrance2", pos: toVec(1100, 262), radius: 2.1 });
  triggers.push({ id: "courtyard.mailboxes", pos: toVec(474, 268), radius: 1.45 });
  triggers.push({ id: "courtyard.board", pos: toVec(538, 370), radius: 1.55 });
  triggers.push({ id: "courtyard.tree", pos: toVec(214, 640), radius: 1.9 });
  triggers.push({ id: "courtyard.bench", pos: toVec(262, 674), radius: 1.5 });
  triggers.push({ id: "courtyard.playground", pos: toVec(560, 742), radius: 1.9 });
  triggers.push({ id: "courtyard.puddle", pos: toVec(470, 844), radius: 1.6 });
  triggers.push({ id: "courtyard.laundry", pos: toVec(470, 356), radius: 1.55 });
  triggers.push({ id: "courtyard.arch", pos: new THREE.Vector3(0, 0.9, HH - 0.6), radius: 2.4, to: "street" });

  spawns["player"] = new THREE.Vector3(0, 0.9, HH - 6.2);
  spawns["lidia"] = toVec(884, 612);
  spawns["sasha"] = toVec(620, 715);
  spawns["artyom"] = toVec(970, 858);
  spawns["musya"] = toVec(238, 548);

  // hemisphere + dir light for mood
  const hemi = new THREE.HemisphereLight(0xe6e4ef, 0x1a1510, 0.62);
  hemi.position.set(0, 20, 0);
  group.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1e2, 1.35);
  sun.position.set(-14, 18, -9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 55;
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.bias = -0.0006;
  group.add(sun);

  // fog — late August dusk
  // handled at renderer scene level per zone

  return { group, colliders, triggers, spawns, groundY: 0 };
}

/* ---------- apartment interior (minimal) ---------- */
export function buildApartment(texLoader: THREE.TextureLoader): ZoneWorld {
  const mats = makeMaterials(texLoader);
  const group = new THREE.Group();
  group.name = "apartment";
  const colliders: ColliderBox[] = [];
  const triggers: ZoneWorld["triggers"] = [];
  const W = 12, D = 9, H = 2.75;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0xc8b08a, roughness: 0.82 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0.01, 0);
  ground.receiveShadow = true;
  group.add(ground);
  // walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.92 });
  addBox(group, colliders, new THREE.BoxGeometry(W, H, 0.18), wallMat, new THREE.Vector3(0, H / 2, -D / 2));
  addBox(group, colliders, new THREE.BoxGeometry(W, H, 0.18), wallMat, new THREE.Vector3(0, H / 2, D / 2));
  addBox(group, colliders, new THREE.BoxGeometry(0.18, H, D), wallMat, new THREE.Vector3(-W / 2, H / 2, 0));
  addBox(group, colliders, new THREE.BoxGeometry(0.18, H, D), wallMat, new THREE.Vector3(W / 2, H / 2, 0));
  // door out
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.05, 0.12), mats.doorMat);
  door.position.set(0, 1.02, -D / 2 + 0.12);
  group.add(door);
  // simple furniture blocks with collision
  addBox(group, colliders, new THREE.BoxGeometry(2.2, 0.95, 1.0), new THREE.MeshStandardMaterial({ color: 0x5a4a3a }), new THREE.Vector3(-3.6, 0.48, 1.6));
  addBox(group, colliders, new THREE.BoxGeometry(1.9, 0.52, 2.4), new THREE.MeshStandardMaterial({ color: 0x745e46 }), new THREE.Vector3(3.2, 0.26, -1.2));
  addBox(group, colliders, new THREE.BoxGeometry(1.2, 1.75, 0.55), new THREE.MeshStandardMaterial({ color: 0xcfc6b6 }), new THREE.Vector3(-4.2, 0.88, -2.8));

  // bed
  addBox(group, colliders, new THREE.BoxGeometry(2.0, 0.45, 3.2), new THREE.MeshStandardMaterial({ color: 0x9a7b5a }), new THREE.Vector3(3.4, 0.225, 2.2));

  triggers.push({ id: "apartment.exit", pos: new THREE.Vector3(0, 0.9, -D / 2 + 1.1), radius: 1.25, to: "courtyard" });
  triggers.push({ id: "apartment.bed", pos: new THREE.Vector3(3.4, 0.9, 2.2), radius: 1.45 });
  triggers.push({ id: "apartment.kettle", pos: new THREE.Vector3(-3.6, 0.9, 1.2), radius: 1.15 });
  triggers.push({ id: "apartment.mirror", pos: new THREE.Vector3(-4.2, 1.0, -1.9), radius: 1.0 });

  const hemi = new THREE.HemisphereLight(0xfffaf1, 0x3a3028, 0.82);
  group.add(hemi);
  const dir = new THREE.DirectionalLight(0xfff6e0, 0.9);
  dir.position.set(4, 6, 3);
  group.add(dir);
  return { group, colliders, triggers, spawns: { player: new THREE.Vector3(0, 0.9, -D / 2 + 2.4) }, groundY: 0 };
}

/* ---------- street (corridor) ---------- */
export function buildStreet(texLoader: THREE.TextureLoader): ZoneWorld {
  const mats = makeMaterials(texLoader);
  const group = new THREE.Group();
  group.name = "street";
  const colliders: ColliderBox[] = [];
  const triggers: ZoneWorld["triggers"] = [];
  const CW = 44, CH = 16;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), mats.asphaltMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  ground.receiveShadow = true;
  group.add(ground);
  // side facades
  addBox(group, colliders, new THREE.BoxGeometry(CW, 9.5, 1.0), mats.brick, new THREE.Vector3(0, 4.75, -CH / 2 - 0.4));
  addBox(group, colliders, new THREE.BoxGeometry(CW, 9.5, 1.0), mats.brick, new THREE.Vector3(0, 4.75, CH / 2 + 0.4));
  // shop / cafe fronts with gaps (doors)
  // shop door
  const shopX = -9;
  const shopDoor = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.4, 0.12), mats.doorMat);
  shopDoor.position.set(shopX, 1.2, -CH / 2 + 0.62);
  group.add(shopDoor);
  triggers.push({ id: "street.courtyard", pos: new THREE.Vector3(0, 0.9, CH / 2 - 0.6), radius: 2.2, to: "courtyard" });
  triggers.push({ id: "street.shop", pos: new THREE.Vector3(shopX, 0.9, -CH / 2 + 1.6), radius: 1.55, to: "shop" });
  triggers.push({ id: "street.cafe", pos: new THREE.Vector3(6, 0.9, -CH / 2 + 1.6), radius: 1.55, to: "cafe" });
  triggers.push({ id: "street.metro", pos: new THREE.Vector3(18.5, 0.9, 0), radius: 1.9, to: "metro" });
  triggers.push({ id: "street.dombyta", pos: new THREE.Vector3(-14, 0.9, CH / 2 - 1.0), radius: 1.55, to: "dombyta" });
  // bins / kiosk colliders
  addBox(group, colliders, new THREE.BoxGeometry(1.8, 1.8, 1.0), mats.metal, new THREE.Vector3(11, 0.9, -1.2));
  addBox(group, colliders, new THREE.BoxGeometry(2.2, 1.15, 0.9), mats.benchWood, new THREE.Vector3(-2, 0.58, 2.4));
  const hemi = new THREE.HemisphereLight(0xe6e4ef, 0x181410, 0.72);
  group.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1e2, 1.2);
  sun.position.set(-12, 14, -7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  group.add(sun);
  // lamps
  [-18, -6, 6, 18].forEach((x) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 3.4, 8), mats.metal);
    pole.position.set(x, 1.7, -2.2);
    group.add(pole);
  });
  return { group, colliders, triggers, spawns: { player: new THREE.Vector3(0, 0.9, CH / 2 - 3.2) }, groundY: 0 };
}

/* ---------- shop interior ---------- */
export function buildShop(texLoader: THREE.TextureLoader): ZoneWorld {
  const group = new THREE.Group();
  group.name = "shop";
  const mats = makeMaterials(texLoader);
  const colliders: ColliderBox[] = [];
  const triggers: ZoneWorld["triggers"] = [];
  const W = 11, D = 8, H = 2.85;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0xd8d0bc, roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0.01, 0);
  ground.receiveShadow = true;
  group.add(ground);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1e4cb, roughness: 0.92 });
  addBox(group, colliders, new THREE.BoxGeometry(W, H, 0.15), wallMat, new THREE.Vector3(0, H / 2, -D / 2));
  addBox(group, colliders, new THREE.BoxGeometry(W, H, 0.15), wallMat, new THREE.Vector3(0, H / 2, D / 2));
  addBox(group, colliders, new THREE.BoxGeometry(0.15, H, D), wallMat, new THREE.Vector3(-W / 2, H / 2, 0));
  addBox(group, colliders, new THREE.BoxGeometry(0.15, H, D), wallMat, new THREE.Vector3(W / 2, H / 2, 0));
  // counter
  addBox(group, colliders, new THREE.BoxGeometry(4.2, 1.02, 0.85), new THREE.MeshStandardMaterial({ color: 0x6b5a44 }), new THREE.Vector3(0, 0.51, -D / 2 + 1.9));
  // door
  triggers.push({ id: "shop.exit", pos: new THREE.Vector3(0, 0.9, D / 2 - 1.05), radius: 1.25, to: "street" });
  triggers.push({ id: "shop.counter", pos: new THREE.Vector3(0, 0.9, -D / 2 + 3.1), radius: 1.35 });
  const hemi = new THREE.HemisphereLight(0xfffaf1, 0x3a3028, 0.92);
  group.add(hemi);
  const p = new THREE.PointLight(0xffe6b0, 18, 12);
  p.position.set(0, 2.55, 0);
  group.add(p);
  return { group, colliders, triggers, spawns: { player: new THREE.Vector3(0, 0.9, D / 2 - 2.2) }, groundY: 0 };
}

export function buildGenericZone(zone: ZoneId, loader: THREE.TextureLoader): ZoneWorld {
  if (zone === "courtyard") return buildCourtyard(loader);
  if (zone === "apartment") return buildApartment(loader);
  if (zone === "street") return buildStreet(loader);
  if (zone === "shop") return buildShop(loader);
  // fallback for cafe/metro/dombyta — reuse shop with tint
  const base = buildShop(loader);
  base.group.name = zone;
  // retint floor
  const tint: Record<string, number> = { cafe: 0xd9c9a6, metro: 0xaab2b8, dombyta: 0xc8bbb0 };
  (base.group.children[0] as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color: tint[zone] ?? 0xd0c8b8, roughness: 0.9 });
  const found = (ZONES as unknown as { id: string; nameRu: string }[]).find((z) => z.id === zone);
  const name = found?.nameRu ?? zone;
  const spr = textSprite(name.toUpperCase());
  spr.position.set(0, 2.8, -2.2);
  base.group.add(spr);
  // keep street exit via trigger
  const w = (base.triggers[0] = { id: `${zone}.exit`, pos: new THREE.Vector3(0, 0.9, 4 - 1.05), radius: 1.25, to: "street" as ZoneId });
  void w;
  return base;
}
