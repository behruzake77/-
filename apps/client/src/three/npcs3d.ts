import * as THREE from "three";
import type { NpcDefinition } from "@mir/shared";

function hexColor(s: string): number {
  try { return new THREE.Color(s).getHex(); } catch { return 0x888888; }
}

export interface Npc3D {
  id: string;
  group: THREE.Group;
  label: THREE.Sprite;
  def: NpcDefinition;
  pos: THREE.Vector3;
  yaw: number;
  wander?: THREE.Vector3[];
  nextThink: number;
  target: THREE.Vector3 | null;
}

function labelSprite(name: string, role: string): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 170;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0,0,512,170);
  // pill
  ctx.fillStyle = "rgba(21,18,15,0.88)";
  round(ctx, 12, 12, 488, 132, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(241,228,203,0.10)";
  ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "#f1e4cb";
  ctx.font = "600 30px Cormorant Garamond, serif";
  ctx.fillText(name, 22, 62);
  ctx.fillStyle = "rgba(241,228,203,0.66)";
  ctx.font = "500 18px Inter, sans-serif";
  ctx.fillText(role, 22, 96);
  // star
  ctx.fillStyle = "#d9a441";
  ctx.beginPath(); ctx.arc(472, 32, 8, 0, Math.PI*2); ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  (tex as any).colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true });
  const s = new THREE.Sprite(mat);
  s.scale.set(3.2, 1.06, 1);
  s.position.set(0, 2.15, 0);
  return s;
}

function round(ctx: CanvasRenderingContext2D, x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

export function createNpc3D(def: NpcDefinition, at: THREE.Vector3, facing?: string): Npc3D {
  const g = new THREE.Group();
  g.name = `npc-${def.id}`;
  g.position.copy(at);

  const skin = hexColor(def.look.skin);
  const coat = hexColor(def.look.coat);
  const hairC = hexColor(def.look.hair);
  const accent = hexColor(def.look.accent ?? "#c9a26a");

  // shadow
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.42, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent:true, opacity:0.18, depthWrite:false}));
  sh.rotation.x = -Math.PI/2; sh.position.y = 0.02; g.add(sh);

  // figure — capsule group similar to player but smaller variations
  const fig = new THREE.Group();

  if (def.id === "musya") {
    // cat — small 4-legged
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.23, 0.52, 4, 10), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness:0.9 }));
    body.rotation.z = Math.PI/2;
    body.position.set(0, 0.42, 0);
    body.castShadow = true; fig.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), new THREE.MeshStandardMaterial({ color: 0x8f96a0 }));
    head.position.set(0.44, 0.58, 0); fig.add(head);
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.42, 3, 8), new THREE.MeshStandardMaterial({ color: 0x7f868f }));
    tail.position.set(-0.42, 0.48, 0); tail.rotation.z = 0.65; fig.add(tail);
  } else {
    const height = def.look.height ?? 1.7;
    const scale = height / 1.7;
    const torsoH = 0.62 * scale;
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.30*scale, torsoH, 4, 10), new THREE.MeshStandardMaterial({ color: coat, roughness: 0.82 }));
    torso.position.set(0, 1.02*scale, 0);
    torso.castShadow = true; fig.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22*scale, 11, 9), new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 }));
    head.position.set(0, 1.56*scale, 0); fig.add(head);
    // hair cap
    const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.245*scale, 10, 8), new THREE.MeshStandardMaterial({ color: hairC, roughness: 0.95 }));
    if (def.look.hairStyle === "bun") {
      hairMesh.position.set(0, 1.69*scale, -0.06*scale); hairMesh.scale.set(1,0.72,1);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.12*scale, 8, 6), new THREE.MeshStandardMaterial({ color: hairC }));
      bun.position.set(0, 1.68*scale, -0.18*scale); fig.add(bun);
    } else if (def.look.hairStyle === "beanie") {
      hairMesh.position.set(0, 1.71*scale, 0); hairMesh.scale.set(1,0.58,1);
      const beanie = new THREE.Mesh(new THREE.CylinderGeometry(0.24*scale,0.24*scale,0.14*scale,10), new THREE.MeshStandardMaterial({ color: accent }));
      beanie.position.set(0,1.76*scale,0); fig.add(beanie);
    } else {
      hairMesh.position.set(0, 1.72*scale, -0.02*scale); hairMesh.scale.set(1,0.62,1);
    }
    fig.add(hairMesh);
    // accessory tint
    if (def.look.accessory === "scarf") {
      const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.36,0.05), new THREE.MeshStandardMaterial({ color: accent }));
      scarf.position.set(0, 1.1*scale, 0.20*scale); fig.add(scarf);
    } else if (def.look.accessory === "glasses") {
      const g1 = new THREE.Mesh(new THREE.TorusGeometry(0.075,0.01,6,10), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      g1.position.set(-0.09, 1.56*scale, 0.18); g1.rotation.y=Math.PI/2; fig.add(g1);
      const g2 = g1.clone(); g2.position.set(0.09, 1.56*scale, 0.18); fig.add(g2);
    }
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2f3330, roughness:0.9 });
    const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.105*scale, 0.62*scale, 4, 8), legMat);
    legL.position.set(-0.12*scale, 0.41*scale, 0); fig.add(legL);
    const legR = legL.clone(); legR.position.set(0.12*scale, 0.41*scale, 0); fig.add(legR);
    if (def.look.accessory === "bag") {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.28,0.34,0.08), new THREE.MeshStandardMaterial({ color: 0x3d2a16 }));
      bag.position.set(0.28, 0.96*scale, -0.12); fig.add(bag);
    }
  }
  g.add(fig);

  const lbl = labelSprite(def.shortNameRu ?? def.nameRu, def.roleRu);
  g.add(lbl);

  // marker star above label
  const starGeo = new THREE.CircleGeometry(0.16, 5);
  const star = new THREE.Mesh(starGeo, new THREE.MeshBasicMaterial({ color: 0xd9a441, transparent:true, opacity:0.0 }));
  star.position.set(0, 2.55, 0);
  star.lookAt(0, 2.55, 1);
  g.add(star);

  const yawInit = facing === "left" ? -Math.PI/2 : facing === "right" ? Math.PI/2 : facing === "up" ? Math.PI : 0;
  g.rotation.y = yawInit;

  return { id: def.id, group: g, label: lbl, def, pos: at.clone(), yaw: yawInit, nextThink: 0, target: null };
}

export function updateNpcs(npcs: Npc3D[], dt: number, time: number, colliders: any[], playerPos: THREE.Vector3): void {
  for (const npc of npcs) {
    // idle bob
    npc.group.position.y = Math.sin(time * 0.9 + npc.pos.x) * 0.02;

    // simple wander for sasha etc
    if (npc.wander && npc.wander.length > 0) {
      if (!npc.target || time > npc.nextThink) {
        const w = npc.wander[Math.floor(Math.random()*npc.wander.length)];
        npc.target = w.clone();
        npc.nextThink = time + 5 + Math.random()*7;
      }
      if (npc.target) {
        const to = npc.target.clone().sub(npc.group.position);
        to.y = 0;
        const d = to.length();
        if (d > 0.15) {
          to.normalize().multiplyScalar(0.62 * dt);
          const next = npc.group.position.clone().add(to);
          // naive collider check: keep simple, just don't walk into big walls — skip if player very close?
          npc.group.position.copy(next);
          npc.pos.copy(next);
          npc.yaw = Math.atan2(to.x, to.z);
          npc.group.rotation.y = npc.yaw;
          // step animation: subtle lean
          const fig = npc.group.children[1] as THREE.Group | undefined;
          if (fig) fig.rotation.z = Math.sin(time*4)*0.06;
        } else {
          npc.target = null;
        }
      }
    } else {
      // fidget
      npc.group.rotation.y = npc.yaw + Math.sin(time*0.4 + npc.pos.z)*0.06;
    }

    // face player if nearby (<3m)
    const dist = npc.group.position.distanceTo(playerPos);
    if (dist < 2.6) {
      const toPlayer = new THREE.Vector3().subVectors(playerPos, npc.group.position);
      toPlayer.y=0;
      if (toPlayer.lengthSq()>1e-6) {
        const targetYaw = Math.atan2(toPlayer.x, toPlayer.z);
        npc.group.rotation.y = THREE.MathUtils.lerp(npc.group.rotation.y, targetYaw, 0.08);
      }
    }

    // label: billboard — already sprite, auto faces camera; marker visibility handled by caller
  }
}
