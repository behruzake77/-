import * as THREE from "three";
import type { ZoneId } from "@mir/shared";
import { ZONES } from "@mir/shared";

/** 1 unit = 1 meter. Courtyard 1440px /36 ≈40m. */
const SCALE = 36;
function px(n: number): number { return n / SCALE; }

export interface ColliderBox { min: THREE.Vector3; max: THREE.Vector3; }
export interface ZoneWorld {
  group: THREE.Group;
  colliders: ColliderBox[];
  triggers: { id: string; pos: THREE.Vector3; radius: number; to?: ZoneId; via?: string }[];
  spawns: Record<string, THREE.Vector3>;
  groundY: number;
}

/* ---------- procedural textures (Blender-like, no external assets) ---------- */
function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!; draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  (t as any).colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function makeBrickTexture(): THREE.CanvasTexture {
  return canvasTexture(512, 512, (ctx, W, H) => {
    // mortar
    ctx.fillStyle = "#c9b8a8"; ctx.fillRect(0, 0, W, H);
    const brickH = 32, brickW = 72;
    const rows = H / brickH, cols = W / brickW;
    for (let y = 0; y < rows; y++) {
      const offset = (y % 2) * (brickW / 2);
      for (let x = -1; x < cols + 1; x++) {
        const rx = x * brickW + offset + 1, ry = y * brickH + 1;
        const rw = brickW - 2, rh = brickH - 2;
        // base brick color with variation
        const v = 112 + (Math.random() * 28 - 14) + (y % 3) * 4;
        const r = Math.min(255, Math.max(0, v + 18));
        const g = Math.min(255, Math.max(0, v - 8));
        const b = Math.min(255, Math.max(0, v - 22));
        ctx.fillStyle = `rgb(${r|0},${g|0},${b|0})`;
        // rounded brick via fillRect with slight inset + shadow
        ctx.fillRect(rx, ry, rw, rh);
        // top highlight
        ctx.fillStyle = "rgba(255,255,255,0.09)"; ctx.fillRect(rx, ry, rw, 3);
        // bottom AO
        ctx.fillStyle = "rgba(0,0,0,0.14)"; ctx.fillRect(rx, ry + rh - 4, rw, 4);
        // chip
        if (Math.random() < 0.07) {
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          const cx = rx + Math.random() * rw * 0.6 + 6;
          const cy = ry + Math.random() * rh * 0.5 + 4;
          ctx.fillRect(cx, cy, 5 + Math.random() * 7, 2);
        }
      }
    }
    // overall weathering vignette + streaks
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(50,35,25,0.18)"); g.addColorStop(0.12, "rgba(0,0,0,0)");
    g.addColorStop(0.88, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(25,18,12,0.36)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // vertical rain streaks
    ctx.strokeStyle = "rgba(30,22,16,0.07)"; ctx.lineWidth = 1;
    for (let i = 0; i < 22; i++) {
      const x = Math.random() * W;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + Math.random()*6-3, H); ctx.stroke();
    }
  });
}

function makeAsphaltTexture(): THREE.CanvasTexture {
  return canvasTexture(512, 512, (ctx, W, H) => {
    ctx.fillStyle = "#2e2f31"; ctx.fillRect(0,0,W,H);
    // large patches
    for (let i=0;i<90;i++){
      const x=Math.random()*W, y=Math.random()*H, r= 18+Math.random()*44;
      const v = 44+ Math.random()*18;
      ctx.fillStyle=`rgba(${v|0},${v|0},${v+2|0},0.11)`; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }
    // small gravel noise
    for(let i=0;i<4200;i++){
      const x=Math.random()*W, y=Math.random()*H;
      const v = 60+ Math.random()*80;
      ctx.fillStyle=`rgba(${v|0},${v|0},${v|0},${0.08+Math.random()*0.09})`;
      ctx.fillRect(x,y,1.2,1.2);
    }
    // cracks — thin polyline
    ctx.strokeStyle="rgba(8,8,9,0.52)"; ctx.lineWidth=1.1; ctx.lineCap="round";
    for(let c=0;c<4;c++){
      let x=Math.random()*W, y=Math.random()*H;
      ctx.beginPath(); ctx.moveTo(x,y);
      for(let s=0;s<7;s++){ x+= (Math.random()-0.5)*90; y+= (Math.random()-0.5)*42; ctx.lineTo(x,y); }
      ctx.stroke();
      // crack highlight
      ctx.strokeStyle="rgba(255,255,255,0.05)"; ctx.lineWidth=0.7; ctx.stroke();
      ctx.strokeStyle="rgba(8,8,9,0.52)"; ctx.lineWidth=1.1;
    }
    // oil spots
    for(let i=0;i<5;i++){
      const x=Math.random()*W, y=Math.random()*H;
      const grd=ctx.createRadialGradient(x,y,0,x,y,28);
      grd.addColorStop(0,"rgba(12,14,16,0.34)"); grd.addColorStop(1,"rgba(12,14,16,0)");
      ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(x,y,28,0,Math.PI*2); ctx.fill();
    }
  });
}

function makeMetalRustTexture(): THREE.CanvasTexture {
  return canvasTexture(256,256,(ctx,W,H)=>{
    ctx.fillStyle="#4a5256"; ctx.fillRect(0,0,W,H);
    for(let i=0;i<1800;i++){
      const x=Math.random()*W, y=Math.random()*H;
      ctx.fillStyle=`rgba(${80+Math.random()*20|0},${55+Math.random()*18|0},${38+Math.random()*12|0},${0.08+Math.random()*0.12})`;
      ctx.fillRect(x,y,1,1);
    }
    // edge rust
    ctx.strokeStyle="rgba(90,42,22,0.18)"; ctx.lineWidth=3; ctx.strokeRect(2,2,W-4,H-4);
  });
}

/* ---------- materials ---------- */
function makeMaterials(texLoader: THREE.TextureLoader) {
  const brickTex = makeBrickTexture(); brickTex.repeat.set(2.2, 0.9);
  const asphaltTex = makeAsphaltTexture(); asphaltTex.repeat.set(3.2, 3.2);
  const metalRust = makeMetalRustTexture();
  // photo-asphalt for ground base + procedural detail blended via second layer? we keep photo for realism where available
  let photo: THREE.Texture | null = null;
  try { photo = texLoader.load("/photo-asphalt-top.jpg"); photo.wrapS=photo.wrapT=THREE.RepeatWrapping; photo.repeat.set(3,3); (photo as any).colorSpace=THREE.SRGBColorSpace; } catch {}

  const brickMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.88, metalness: 0.02, bumpScale: 0.02 });
  const brickDarkMat = new THREE.MeshStandardMaterial({ map: brickTex, color: 0x5a3f34, roughness: 0.92, metalness: 0.01 });
  // weathered bottom strip — darker, more rough
  const brickSplash = new THREE.MeshStandardMaterial({ map: brickTex, color: 0x3d2b22, roughness: 0.96, metalness: 0.0 });

  const asphaltPhotoMat = photo ? new THREE.MeshStandardMaterial({ map: photo, roughness: 0.94, metalness: 0.02 }) : new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.95, metalness: 0.02 });
  const asphaltProcMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.96, metalness: 0.02 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0xaeb4b8, roughness: 0.92, metalness: 0.02 });
  const concreteDark = new THREE.MeshStandardMaterial({ color: 0x8f9599, roughness: 0.88, metalness: 0.02 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x2f2118, roughness: 0.62, metalness: 0.06 });
  const doorMetalMat = new THREE.MeshStandardMaterial({ map: metalRust, roughness: 0.55, metalness: 0.42 });
  const signMat = new THREE.MeshStandardMaterial({ color: 0xeee6d6, roughness: 0.62, metalness: 0.0 });
  const benchWood = new THREE.MeshStandardMaterial({ color: 0x7d5b3b, roughness: 0.68, metalness: 0.0 });
  const benchWoodDark = new THREE.MeshStandardMaterial({ color: 0x5a3f26, roughness: 0.72, metalness: 0.0 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x4a5256, roughness: 0.45, metalness: 0.38 });
  const metalDark = new THREE.MeshStandardMaterial({ color: 0x2f3538, roughness: 0.58, metalness: 0.45 });
  const foliage = new THREE.MeshStandardMaterial({ color: 0x5c7248, roughness: 0.84, metalness: 0.0 });
  const foliageDark = new THREE.MeshStandardMaterial({ color: 0x3e4e31, roughness: 0.90, metalness: 0.0 });
  const foliageLight = new THREE.MeshStandardMaterial({ color: 0x7a9a62, roughness: 0.82, metalness: 0.0 });
  const sand = new THREE.MeshStandardMaterial({ color: 0xdac49a, roughness: 0.98, metalness: 0.0 });
  const sandDark = new THREE.MeshStandardMaterial({ color: 0xc2a87a, roughness: 0.99, metalness: 0.0 });
  const bark = new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.94, metalness: 0.0 });
  const barkDark = new THREE.MeshStandardMaterial({ color: 0xc9b8a0, roughness: 0.96, metalness: 0.0 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xd8e6f2, roughness: 0.08, metalness: 0.0, transmission: 0.22, thickness: 0.04, transparent: true, opacity: 0.72, envMapIntensity: 0.7 });
  const glassLit = new THREE.MeshPhysicalMaterial({ color: 0xfff2c8, roughness: 0.18, metalness: 0.0, emissive: 0x332a12, emissiveIntensity: 0.42, transparent: true, opacity: 0.86 });
  const curtain = new THREE.MeshStandardMaterial({ color: 0xf7efe0, roughness: 0.92, transparent: true, opacity: 0.92, side: THREE.DoubleSide });

  return { brickTex, asphaltTex, metalRust, asphaltPhotoMat, asphaltProcMat, concrete, concreteDark, brickMat, brickDarkMat, brickSplash, doorMat, doorMetalMat, signMat, benchWood, benchWoodDark, metal, metalDark, foliage, foliageDark, foliageLight, sand, sandDark, bark, barkDark, glass, glassLit, curtain };
}

/* ---------- helpers ---------- */
function addBox(
  group: THREE.Group, colliders: ColliderBox[], geom: THREE.BufferGeometry, mat: THREE.Material,
  pos: THREE.Vector3, rotY = 0, opts?: { collider?: boolean; receiveShadow?: boolean; castShadow?: boolean },
): THREE.Mesh {
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.copy(pos); mesh.rotation.y = rotY;
  mesh.castShadow = opts?.castShadow !== false; mesh.receiveShadow = opts?.receiveShadow !== false;
  group.add(mesh);
  if (opts?.collider !== false) {
    geom.computeBoundingBox();
    const bb = new THREE.Box3().setFromObject(mesh);
    colliders.push({ min: bb.min.clone(), max: bb.max.clone() });
  }
  return mesh;
}
function boxCollider(pos: THREE.Vector3, size: THREE.Vector3, colliders: ColliderBox[]) {
  const h = size.clone().multiplyScalar(0.5);
  colliders.push({ min: pos.clone().sub(h), max: pos.clone().add(h) });
}

function textSprite(text: string): THREE.Sprite {
  const c = document.createElement("canvas"); c.width = 512; c.height = 128;
  const ctx = c.getContext("2d")!; ctx.clearRect(0,0,512,128);
  ctx.fillStyle = "rgba(18,14,10,0.92)"; ctx.beginPath(); (ctx as any).roundRect(6,18,500,92,14); ctx.fill();
  ctx.strokeStyle = "rgba(217,164,65,0.22)"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "#f1e4cb"; ctx.font = "600 28px Inter, system-ui, sans-serif"; ctx.fillText(text, 24, 62);
  ctx.fillStyle = "rgba(241,228,203,0.7)"; ctx.font = "400 18px Inter, system-ui, sans-serif"; ctx.fillText("ул. Мира — двор", 24, 90);
  const tex = new THREE.CanvasTexture(c); (tex as any).colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.scale.set(6,1.5,1); return s;
}
function bannerSprite(): THREE.Sprite {
  const c = document.createElement("canvas"); c.width = 700; c.height = 120;
  const ctx = c.getContext("2d")!; ctx.fillStyle="#1a160f"; ctx.fillRect(0,0,700,120);
  ctx.fillStyle="#d9a441"; ctx.fillRect(0,0,700,4);
  ctx.fillStyle="#f1e4cb"; ctx.font="700 26px Inter"; ctx.fillText("ДОМ БЫТА  ·  РЕМОНТ ОБУВИ  ·  КЛЮЧИ", 18, 58);
  ctx.fillStyle="rgba(241,228,203,0.65)"; ctx.font="400 16px Inter"; ctx.fillText("ул. Мира 14 · 9:00—20:00", 18, 86);
  const t = new THREE.CanvasTexture(c); (t as any).colorSpace=THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:t, transparent:true })); s.scale.set(7,1.2,1); return s;
}

/* ---------- Soviet facade builder (Blender logic: panels, windows, balconies) ---------- */
interface FacadeOpts { x0: number; width: number; z: number; wallTh: number; wallH: number; doorW?: number; doorCenterX?: number; sign?: string; mats: ReturnType<typeof makeMaterials>; group: THREE.Group; colliders: ColliderBox[]; }

function buildSovietFacade(opts: FacadeOpts) {
  const { x0, width, z, wallTh, wallH, doorW, doorCenterX, mats, group, colliders } = opts;
  const floors = 5; const floorH = wallH / floors;
  const bays = Math.max(2, Math.round(width / 3.35));
  const bayW = width / bays;
  // main slab (back)
  const slab = new THREE.Mesh(new THREE.BoxGeometry(width, wallH, wallTh), mats.brickMat);
  slab.position.set(x0 + width/2, wallH/2, z); slab.receiveShadow=true; slab.castShadow=true; group.add(slab);
  // panel joints — horizontal lines every floor + vertical every bay
  for(let f=1; f<floors; f++){
    const y = f* floorH;
    const line = new THREE.Mesh(new THREE.BoxGeometry(width+0.02, 0.04, wallTh+0.04), mats.brickDarkMat);
    line.position.set(x0+width/2, y, z+0.02); group.add(line);
  }
  for(let b=1;b<bays;b++){
    const x = x0 + b*bayW;
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.04, wallH, wallTh+0.02), mats.brickDarkMat);
    line.position.set(x, wallH/2, z+0.015); group.add(line);
  }
  // bottom splash zone 0.95m dark
  const splash = new THREE.Mesh(new THREE.BoxGeometry(width, 0.95, wallTh+0.06), mats.brickSplash);
  splash.position.set(x0+width/2, 0.475, z+0.03); group.add(splash);
  // cornice on top
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(width+0.22, 0.36, wallTh+0.28), mats.concreteDark);
  cornice.position.set(x0+width/2, wallH+0.18, z+0.06); cornice.castShadow=true; group.add(cornice);
  // windows per bay per floor — skip door bay at ground floor
  const doorBay = doorCenterX !== undefined ? Math.floor((doorCenterX - x0)/bayW) : -1;
  for(let f=0; f<floors; f++){
    for(let b=0; b<bays; b++){
      if(f===0 && b===doorBay) continue;
      const cx = x0 + bayW*(b+0.5);
      const cy = f*floorH + floorH*0.52 + 0.06;
      // skip some top floor windows for AC variety? keep all
      buildWindow(group, mats, new THREE.Vector3(cx, cy, z+wallTh/2+0.01), f, b, floors);
      // balconies: floors 1..3 on every second bay, staggered
      if(f>=1 && f<=3 && (b%2===1) && !(f===1 && b===doorBay+1)){
        // 68% chance balcony exists
        const has = (b+f)%3 !== 0;
        if(has) buildBalcony(group, mats, new THREE.Vector3(cx, cy-0.02, z+wallTh/2), f, b);
      }
    }
  }
  // entrance porch if door exists
  if(doorW && doorCenterX!==undefined){
    buildEntrance(group, colliders, mats, doorCenterX, z, wallTh, wallH);
  }
  // vertical drain pipes
  for(let b=0;b<=bays;b+=2){
    const x = x0 + b*bayW + bayW*0.38;
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055, wallH*0.98, 8), mats.metalDark);
    pipe.position.set(x, wallH/2+0.12, z+wallTh/2+0.18); group.add(pipe);
    // brackets
    for(let f=0;f<floors;f++){
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.03,0.14), mats.metalDark);
      br.position.set(x, f*floorH+floorH*0.7, z+wallTh/2+0.12); group.add(br);
    }
  }
  // collider for whole facade slab
  colliders.push({ min: new THREE.Vector3(x0,0,z-wallTh/2), max: new THREE.Vector3(x0+width, wallH, z+wallTh/2) });
}

function buildWindow(group: THREE.Group, mats: ReturnType<typeof makeMaterials>, pos: THREE.Vector3, floor: number, bay: number, totalFloors: number){
  const winW = 1.38, winH = 1.52;
  if(floor===4) { // top floor smaller
    // slightly inset
  }
  const frameTh = 0.09, frameDepth = 0.12;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xf2f0e8, roughness: 0.72 });
  const sillMat = new THREE.MeshStandardMaterial({ color: 0xe8e0cc, roughness: 0.64 });
  // reveal box (recess)
  const reveal = new THREE.Mesh(new THREE.BoxGeometry(winW+0.18, winH+0.18, 0.14), new THREE.MeshStandardMaterial({ color: 0xd9cfbf, roughness: 0.92 }));
  reveal.position.set(pos.x, pos.y, pos.z-0.02); group.add(reveal);
  // frame - top/bottom/left/right
  const top = new THREE.Mesh(new THREE.BoxGeometry(winW+0.14, 0.07, frameDepth), frameMat);
  top.position.set(pos.x, pos.y+winH/2+0.02, pos.z+0.04); group.add(top);
  const bot = new THREE.Mesh(new THREE.BoxGeometry(winW+0.14, 0.07, frameDepth), frameMat);
  bot.position.set(pos.x, pos.y-winH/2-0.02, pos.z+0.04); group.add(bot);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.07, winH, frameDepth), frameMat);
  left.position.set(pos.x-winW/2-0.02, pos.y, pos.z+0.04); group.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.07, winH, frameDepth), frameMat);
  right.position.set(pos.x+winW/2+0.02, pos.y, pos.z+0.04); group.add(right);
  const midV = new THREE.Mesh(new THREE.BoxGeometry(0.05, winH-0.08, 0.04), frameMat);
  midV.position.set(pos.x, pos.y, pos.z+0.06); group.add(midV);
  const midH = new THREE.Mesh(new THREE.BoxGeometry(winW-0.06, 0.05, 0.04), frameMat);
  midH.position.set(pos.x, pos.y+0.12, pos.z+0.06); group.add(midH);
  // glass panes (4 panes)
  const isLit = (floor+bay)%3===0 && floor!==0; // some lights on at dusk
  const gMat = isLit ? mats.glassLit : mats.glass;
  const paneGeo = new THREE.PlaneGeometry((winW-0.14)/2-0.02, (winH-0.14)/2-0.04);
  const panes = [
    new THREE.Vector3(pos.x-0.33, pos.y+0.38, pos.z+0.07),
    new THREE.Vector3(pos.x+0.33, pos.y+0.38, pos.z+0.07),
    new THREE.Vector3(pos.x-0.33, pos.y-0.32, pos.z+0.07),
    new THREE.Vector3(pos.x+0.33, pos.y-0.32, pos.z+0.07),
  ];
  panes.forEach(p=>{ const m=new THREE.Mesh(paneGeo, gMat); m.position.copy(p); group.add(m); 
    if(isLit){ const pt=new THREE.PointLight(0xfff0b8, 2.2, 6, 1.5); pt.position.set(p.x,p.y,p.z+0.45); group.add(pt); }
  });
  // sill outside
  const sill = new THREE.Mesh(new THREE.BoxGeometry(winW+0.22, 0.08, 0.18), sillMat);
  sill.position.set(pos.x, pos.y-winH/2-0.08, pos.z+0.10); sill.receiveShadow=true; group.add(sill);
  // curtain inside (subtle)
  if(!isLit && Math.random()<0.55){
    const cur = new THREE.Mesh(new THREE.PlaneGeometry(winW-0.18, winH-0.12), mats.curtain);
    cur.position.set(pos.x + (Math.random()-0.5)*0.12, pos.y+0.04, pos.z-0.04); group.add(cur);
  }
  // AC unit on some windows
  if((floor===1 || floor===2) && bay%3===0 && Math.random()<0.42){
    const ac = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.28,0.22), new THREE.MeshStandardMaterial({ color:0xe8e8e8, roughness:0.55 }));
    ac.position.set(pos.x+winW/2+0.32, pos.y-winH/2+0.22, pos.z+0.08); ac.castShadow=true; group.add(ac);
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.09,10), new THREE.MeshStandardMaterial({ color:0x3a3a3a }));
    fan.position.set(pos.x+winW/2+0.32, pos.y-winH/2+0.22, pos.z+0.19); fan.rotation.y=0; group.add(fan);
  }
}

function buildBalcony(group: THREE.Group, mats: ReturnType<typeof makeMaterials>, pos: THREE.Vector3, floor: number, bay: number){
  const w=1.68, d=0.78, h=0.08;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.concrete);
  slab.position.set(pos.x, pos.y-0.92, pos.z+0.42); slab.receiveShadow=true; slab.castShadow=true; group.add(slab);
  // underside
  const under = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), mats.concreteDark);
  under.position.set(pos.x, pos.y-0.98, pos.z+0.38); group.add(under);
  // railing — thin metal bars + top handrail
  const railH=0.92;
  const hand = new THREE.Mesh(new THREE.BoxGeometry(w+0.06, 0.06, 0.06), mats.metal);
  hand.position.set(pos.x, pos.y-0.92+railH, pos.z+ d-0.05); group.add(hand);
  const botRail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, 0.02), mats.metal);
  botRail.position.set(pos.x, pos.y-0.92+0.18, pos.z+ d-0.05); group.add(botRail);
  // vertical balusters
  for(let i=0;i<6;i++){
    const x = pos.x - w/2 + 0.12 + i*(w-0.24)/5;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.02, railH-0.08, 0.02), mats.metal);
    bar.position.set(x, pos.y-0.92+railH/2+0.04, pos.z+d-0.05); group.add(bar);
  }
  // side panels (glass or concrete? Soviet has metal + small storage)
  const sideMat = new THREE.MeshStandardMaterial({ color: 0xd8d0bc, roughness: 0.78 });
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.04, railH, d), sideMat);
  left.position.set(pos.x-w/2+0.02, pos.y-0.92+railH/2, pos.z+ d/2); group.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.04, railH, d), sideMat);
  right.position.set(pos.x+w/2-0.02, pos.y-0.92+railH/2, pos.z+ d/2); group.add(right);
  // clutter on balcony — storage boxes, laundry
  if(Math.random()<0.62){
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.38,0.32), mats.benchWoodDark);
    box.position.set(pos.x-0.42, pos.y-0.92+0.22, pos.z+0.22); group.add(box);
  }
  if(Math.random()<0.42){
    // laundry hanging
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.55,0.38), new THREE.MeshStandardMaterial({ color: Math.random()<0.5?0xe8dcc4:0xa8c6b8, side:THREE.DoubleSide }));
    cloth.position.set(pos.x+0.22, pos.y-0.92+0.62, pos.z+d-0.08); cloth.rotation.y=0.05; cloth.rotation.x=0.12; group.add(cloth);
  }
}

function buildEntrance(group: THREE.Group, colliders: ColliderBox[], mats: ReturnType<typeof makeMaterials>, cx: number, z: number, wallTh: number, wallH: number){
  const doorW = px(100); const doorH = 2.22;
  // recess depth
  const recessW = doorW+0.9, recessH = doorH+0.38;
  // canopy slab
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(recessW+0.6, 0.18, 0.95), mats.concrete);
  canopy.position.set(cx, 2.78, z+wallTh/2+0.62); canopy.castShadow=true; group.add(canopy);
  const canopyUnd = new THREE.Mesh(new THREE.BoxGeometry(recessW+0.6, 0.04, 0.95), mats.concreteDark);
  canopyUnd.position.set(cx, 2.68, z+wallTh/2+0.62); group.add(canopyUnd);
  // columns under canopy
  [-recessW/2+0.18, recessW/2-0.18].forEach(off=>{
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.58, 0.16), mats.concrete);
    col.position.set(cx+off, 1.29, z+wallTh/2+0.95); group.add(col);
  });
  // steps — 3 steps
  for(let i=0;i<3;i++){
    const stepW = recessW+0.34 - i*0.08, stepD = 0.42 - i*0.02, stepH=0.16;
    const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), mats.concreteDark);
    step.position.set(cx, 0.08 + i*0.16, z+wallTh/2+0.52 + i*0.30); step.receiveShadow=true; group.add(step);
  }
  // door frame + double door
  const frame = new THREE.Mesh(new THREE.BoxGeometry(recessW, recessH, 0.14), mats.doorMetalMat);
  frame.position.set(cx, recessH/2, z+wallTh/2+0.02); group.add(frame);
  const doorL = new THREE.Mesh(new THREE.BoxGeometry(doorW*0.46, doorH, 0.06), mats.doorMat);
  doorL.position.set(cx-0.26, doorH/2+0.10, z+wallTh/2+0.10); group.add(doorL);
  const doorR = doorL.clone(); doorR.position.set(cx+0.26, doorH/2+0.10, z+wallTh/2+0.10); group.add(doorR);
  // door panels + window small
  [doorL, doorR].forEach(d=>{
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.32,0.42), new THREE.MeshStandardMaterial({ color:0x8aa0b0, roughness:0.12, metalness:0.12, transparent:true, opacity:0.62 }));
    win.position.set(d.position.x, 1.42, d.position.z+0.04); group.add(win);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 0.02), mats.metalDark);
    bar.position.set(d.position.x, 1.42, d.position.z+0.05); group.add(bar);
  });
  // handle
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.18,8), mats.metal);
  handle.rotation.z=Math.PI/2; handle.position.set(cx+0.18, 1.02, z+wallTh/2+0.14); group.add(handle);
  // intercom + code panel
  const inter = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.24,0.04), mats.metalDark);
  inter.position.set(cx+doorW/2+0.42, 1.22, z+wallTh/2+0.12); group.add(inter);
  // number plate above door
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.62,0.16,0.02), new THREE.MeshStandardMaterial({ color:0x1a5a8a, roughness:0.45 }));
  plate.position.set(cx, recessH+0.12, z+wallTh/2+0.10); group.add(plate);
  // collider for porch (steps + canopy legs)
  colliders.push({ min: new THREE.Vector3(cx-recessW/2-0.18,0,z+wallTh/2), max: new THREE.Vector3(cx+recessW/2+0.18, 2.9, z+wallTh/2+1.15) });
}

/* ---------- courtyard world — high realism ---------- */
export function buildCourtyard(texLoader: THREE.TextureLoader): ZoneWorld {
  const mats = makeMaterials(texLoader);
  const group = new THREE.Group(); group.name="courtyard";
  const colliders: ColliderBox[]=[]; const triggers: ZoneWorld["triggers"]=[]; const spawns: Record<string, THREE.Vector3>={};

  const CW = px(1440); const CH = px(980); const HW=CW/2, HH=CH/2;
  const wallH=13.8, wallTh=0.85; // 5 floors ×2.76

  // ground — photo asphalt where we have it, plus procedural detail overlay via second plane with opacity
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), mats.asphaltPhotoMat);
  ground.rotation.x=-Math.PI/2; ground.position.set(0,0.01,0); ground.receiveShadow=true; group.add(ground);
  // procedural crack decal slightly above
  const detail = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new THREE.MeshStandardMaterial({ map: mats.asphaltTex, transparent:true, opacity:0.22, roughness:0.98 }));
  detail.rotation.x=-Math.PI/2; detail.position.set(0,0.015,0); group.add(detail);
  // curbs around courtyard — concrete border 0.18 high
  const curbMat = mats.concreteDark;
  const curbH=0.18, curbTh=0.22;
  // north curb in front of facade (with gaps at doors + paths)
  // we add thin curbs along side walls and south arch only for visual logic
  addBox(group, colliders, new THREE.BoxGeometry(curbTh, curbH, CH-1.2), curbMat, new THREE.Vector3(-HW+curbTh/2, curbH/2, 0),0,{collider:false});
  addBox(group, colliders, new THREE.BoxGeometry(curbTh, curbH, CH-1.2), curbMat, new THREE.Vector3(HW-curbTh/2, curbH/2, 0),0,{collider:false});
  // manholes
  [{x:-HW+px(420),z:-HH+px(520)},{x:HW-px(280),z:-HH+px(620)}].forEach(p=>{
    const mh = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.04,16), new THREE.MeshStandardMaterial({ color:0x3a3f44, roughness:0.72, metalness:0.6 }));
    mh.position.set(p.x,0.022,p.z); group.add(mh);
    // handle
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.02,0.02), mats.metalDark); h.position.set(p.x,0.045,p.z); group.add(h);
  });

  // north facade — split into wings + doors (Blender-accurate Soviet panel)
  // wings: left 8.9m, middle 16.6m, right 8.9m with two doors
  const leftW = 8.9, midW = CW - 2*8.9 - 2*px(100)-0.9;
  const doorW = px(100);
  // left wing
  buildSovietFacade({ x0: -HW, width: leftW, z: -HH+wallTh/2, wallTh, wallH, mats, group, colliders });
  // door 1 segment (wall above door only — facade handles door itself)
  // we create facade for middle wing split around door
  const door1X = -HW + 9 + 6.2/2 + doorW/2 + 0.6; // approx px 330 center
  const door1CX = -HW + px(330)+doorW/2;
  // Instead of analytic split, we build three facades: left, middle-left, middle-right, right with doors
  // Simpler: reuse previous approach but call buildSovietFacade for each solid wing
  // Clear previous left already; we need to add remaining wings reusing same function but with door centers
  // For accurate placement we recreate north wall as 3 facades
  // Remove the earlier left? Actually we already added leftW, now add door1 + middle + door2 + right
  // To avoid double, we didn't add full wall earlier — we did leftW only. So continue:
  const midLeftW = ( -HW + px(1050) ) - ( -HW + leftW + doorW + 0.45);
  const midRightW = ( -HW + CW - 8.9) - (-HW + px(1050)+doorW+0.22);
  buildSovietFacade({ x0: -HW+leftW, width: doorW+0.9, z: -HH+wallTh/2, wallTh, wallH, mats, group, colliders, doorW, doorCenterX: door1CX, sign: "УЛ. МИРА, 14" });
  buildSovietFacade({ x0: -HW+leftW+doorW+0.9, width: midLeftW, z: -HH+wallTh/2, wallTh, wallH, mats, group, colliders });
  const door2CX = -HW + px(1050)+doorW/2;
  buildSovietFacade({ x0: -HW+leftW+doorW+0.9+midLeftW, width: doorW+0.9, z: -HH+wallTh/2, wallTh, wallH, mats, group, colliders, doorW, doorCenterX: door2CX });
  buildSovietFacade({ x0: -HW+CW-8.9, width: 8.9, z: -HH+wallTh/2, wallTh, wallH, mats, group, colliders });

  // sign above middle — replace text sprite with more realistic sign board + letters
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(3.2,0.42,0.06), new THREE.MeshStandardMaterial({ color:0x1a5a8a, roughness:0.42 }));
  signBoard.position.set(0, wallH*0.72, -HH+wallTh+0.18); group.add(signBoard);
  const signText = new THREE.Mesh(new THREE.PlaneGeometry(2.9,0.32), new THREE.MeshStandardMaterial({
    map: canvasTexture(512,64,(ctx,W,H)=>{ ctx.fillStyle="#1a5a8a"; ctx.fillRect(0,0,W,H); ctx.fillStyle="#f1e4cb"; ctx.font="700 28px Inter"; ctx.fillText("ул. МИРА  14", 18, 42); ctx.fillStyle="rgba(241,228,203,0.7)"; ctx.font="400 16px Inter"; ctx.fillText("корпус 1 · 1968", 18, 58); })
  }));
  signText.position.set(0, wallH*0.72, -HH+wallTh+0.22); group.add(signText);

  // east / west side walls — low brick with graffiti, coping stones
  function sideWall(x: number, variant: "left"|"right"){
    const gSide = new THREE.Group();
    const h=2.45;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(wallTh, h, CH-wallTh*2), mats.brickMat);
    wall.position.set(x, h/2, 0); wall.castShadow=true; wall.receiveShadow=true; gSide.add(wall);
    // coping
    const coping = new THREE.Mesh(new THREE.BoxGeometry(wallTh+0.16,0.14, CH-wallTh*2+0.14), mats.concrete);
    coping.position.set(x, h+0.07, 0); gSide.add(coping);
    // pilasters every 6m
    for(let z=-HH+3; z<HH-3; z+=6){
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.28, h+0.12, 0.42), mats.brickDarkMat);
      pil.position.set(x, h/2+0.06, z); gSide.add(pil);
    }
    // graffiti on left side
    if(variant==="left"){
      const graff = new THREE.Mesh(new THREE.PlaneGeometry(3.2,1.2), new THREE.MeshStandardMaterial({
        map: canvasTexture(512,192,(ctx,W,H)=>{ ctx.clearRect(0,0,W,H); ctx.fillStyle="rgba(18,14,10,0)"; ctx.fillRect(0,0,W,H); ctx.fillStyle="#e94e4e"; ctx.font="700 64px Inter"; ctx.fillText("МИР", 18, 112); ctx.fillStyle="rgba(241,228,203,0.85)"; ctx.font="400 22px Inter"; ctx.fillText("1998", 168, 132); }),
        transparent:true
      }));
      graff.position.set(x+wallTh/2+0.02, 1.2, 2.2); graff.rotation.y=Math.PI/2; gSide.add(graff);
    }
    group.add(gSide);
    colliders.push({ min: new THREE.Vector3(x-wallTh/2,0,-HH+wallTh/2), max: new THREE.Vector3(x+wallTh/2, h, HH-wallTh/2) });
  }
  sideWall(-HW+wallTh/2,"left"); sideWall(HW-wallTh/2,"right");

  // south arch to street — brick arch with keystone, realistic arch shape
  const archW = px(184), archH=2.95;
  const southZ = HH-wallTh/2;
  const leftWallW = (CW - archW)/2 -0.18;
  addBox(group,colliders,new THREE.BoxGeometry(leftWallW, archH, wallTh), mats.brickMat, new THREE.Vector3(-HW+leftWallW/2, archH/2, southZ));
  addBox(group,colliders,new THREE.BoxGeometry(leftWallW, archH, wallTh), mats.brickMat, new THREE.Vector3(HW-leftWallW/2, archH/2, southZ));
  // arch lintel — brick arch with voussoirs
  const lintel = new THREE.Group(); lintel.position.set(0, archH, southZ);
  const archRadius = archW/2+0.12;
  const archMesh = new THREE.Mesh(new THREE.CylinderGeometry(archRadius, archRadius, wallTh, 24,1, false, 0, Math.PI), mats.brickMat);
  archMesh.rotation.z=Math.PI; archMesh.rotation.x=Math.PI/2; archMesh.position.set(0,0,0); lintel.add(archMesh);
  // fill above arch up to 3.6m
  const fill = new THREE.Mesh(new THREE.BoxGeometry(archW+0.6, 0.62, wallTh), mats.brickMat);
  fill.position.set(0, 0.31, 0); lintel.add(fill);
  // voussoir lines
  for(let a=-72;a<=72;a+=18){
    const rad= THREE.MathUtils.degToRad(a);
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.26, wallTh+0.02), mats.brickDarkMat);
    line.position.set(Math.sin(rad)*archRadius*0.92, Math.cos(rad)*archRadius*0.5, 0.02); line.rotation.z=-rad; lintel.add(line);
  }
  // keystone
  const key = new THREE.Mesh(new THREE.BoxGeometry(0.34,0.42, wallTh+0.18), mats.concreteDark);
  key.position.set(0, archRadius-0.12, 0.04); lintel.add(key);
  group.add(lintel);
  // arch interior light
  const archLight = new THREE.PointLight(0xffe8b0, 4, 10, 1.6); archLight.position.set(0, 2.1, southZ-0.6); group.add(archLight);

  // ---------- props: replace spheres with realistic clusters ----------
  // bushes — cluster of spheres + twigs
  function bushReal(pxX:number, pxZ:number, scale=1){
    const x=-HW+px(pxX), z=-HH+px(pxZ);
    const g=new THREE.Group(); g.position.set(x,0,z);
    const clusters = [
      { s:0.72, y:0.42, x:0, z:0, m:mats.foliageDark },
      { s:0.62, y:0.58, x:0.22, z:0.18, m:mats.foliage },
      { s:0.55, y:0.52, x:-0.28, z:-0.12, m:mats.foliageLight },
      { s:0.48, y:0.38, x:0.18, z:-0.24, m:mats.foliageDark },
    ];
    clusters.forEach(c=>{
      const mh=new THREE.Mesh(new THREE.IcosahedronGeometry(c.s*scale, 1), c.m);
      mh.position.set(c.x*scale, c.y*scale, c.z*scale); mh.castShadow=true; mh.rotation.set(Math.random(),Math.random(),Math.random()); g.add(mh);
    });
    // twigs
    for(let i=0;i<3;i++){
      const tw=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.03,0.55,5), mats.barkDark);
      tw.position.set((Math.random()-0.5)*0.45,0.28, (Math.random()-0.5)*0.32); tw.rotation.z=Math.PI/8+Math.random()*0.4; g.add(tw);
    }
    group.add(g);
    colliders.push({ min:new THREE.Vector3(x-0.82*scale,0,z-0.72*scale), max:new THREE.Vector3(x+0.82*scale,0.95*scale,z+0.72*scale) });
  }
  bushReal(74+45,300+35,1.0); bushReal(1318+40,330+30,0.9); bushReal(86+55,800+40,1.08);

  // benches — Soviet yard bench: 5 slats + cast iron legs
  function benchReal(pxX:number, pxZ:number, rotY=0){
    const x=-HW+px(pxX+64), z=-HH+px(pxZ+22);
    const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=rotY;
    // legs — cast iron ornate (simplified as boxes with hole)
    const legMat = mats.metalDark;
    [-1.58,1.58].forEach(off=>{
      const leg = new THREE.Group(); leg.position.set(off,0,0);
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.42,0.52), legMat); side.position.set(0,0.21,0); leg.add(side);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.32,0.04,0.62), legMat); foot.position.set(0,0.02,0); leg.add(foot);
      // decorative circle
      const circ = new THREE.Mesh(new THREE.RingGeometry(0.08,0.11,12), new THREE.MeshStandardMaterial({ color:0x2f3538, side:THREE.DoubleSide }));
      circ.rotation.y=Math.PI/2; circ.position.set(0.065,0.22,0); leg.add(circ);
      g.add(leg);
    });
    // seat slats — 3 seat + 2 back
    for(let i=0;i<3;i++){
      const slat = new THREE.Mesh(new THREE.BoxGeometry(3.42,0.032,0.11), i%2?mats.benchWood:mats.benchWoodDark);
      slat.position.set(0,0.42+ i*0.015, -0.08 + i*0.12); slat.castShadow=true; slat.receiveShadow=true; g.add(slat);
      // gap shadow line
      const gap = new THREE.Mesh(new THREE.BoxGeometry(3.43,0.008,0.02), new THREE.MeshStandardMaterial({ color:0x3d2b16 }));
      gap.position.set(0,0.42+i*0.015+0.018, -0.08+i*0.12+0.055); g.add(gap);
    }
    // backrest — slightly inclined 12deg
    const backGroup=new THREE.Group(); backGroup.position.set(0,0.62, -0.34); backGroup.rotation.x= -12*Math.PI/180;
    for(let i=0;i<2;i++){
      const slat = new THREE.Mesh(new THREE.BoxGeometry(3.42,0.032,0.11), mats.benchWoodDark);
      slat.position.set(0,i*0.13,0); slat.castShadow=true; backGroup.add(slat);
    }
    // back legs brackets
    const brL=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.38,0.04), legMat); brL.position.set(-1.42,0.42,-0.24); brL.rotation.x=-12*Math.PI/180; g.add(brL);
    const brR=brL.clone(); brR.position.set(1.42,0.42,-0.24); g.add(brR);
    g.add(backGroup);
    group.add(g);
    colliders.push({ min:new THREE.Vector3(x-1.85,0,z-0.42), max:new THREE.Vector3(x+1.85,0.72,z+0.48) });
  }
  benchReal(200,612); benchReal(824,592, 0.06); benchReal(1180,620, -0.08);

  // sandbox — realistic: timber frame 0.22 thick, beveled, sand with footprints, toys
  {
    const x=-HW+px(388+93), z=-HH+px(660+46);
    const frameMat = mats.benchWoodDark;
    const outerW=5.15, outerD=2.55, wallThF=0.18, h=0.34;
    // four sides as separate boxes with miter
    const sides=[
      { s: new THREE.Vector3(outerW, h, wallThF), p: new THREE.Vector3(x, h/2, z-outerD/2+wallThF/2)},
      { s: new THREE.Vector3(outerW, h, wallThF), p: new THREE.Vector3(x, h/2, z+outerD/2-wallThF/2)},
      { s: new THREE.Vector3(wallThF, h, outerD-2*wallThF), p: new THREE.Vector3(x-outerW/2+wallThF/2, h/2, z)},
      { s: new THREE.Vector3(wallThF, h, outerD-2*wallThF), p: new THREE.Vector3(x+outerW/2-wallThF/2, h/2, z)},
    ];
    sides.forEach(sd=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(sd.s.x,sd.s.y,sd.s.z), frameMat); m.position.copy(sd.p); m.castShadow=true; m.receiveShadow=true; group.add(m); });
    // sand plane slightly below frame top with displacement via vertices wobble
    const sandGeo=new THREE.PlaneGeometry(4.75,2.15, 8,4);
    const posAttr=sandGeo.attributes.position as THREE.BufferAttribute;
    for(let i=0;i<posAttr.count;i++){ posAttr.setZ(i, (Math.random()-0.5)*0.03); }
    posAttr.needsUpdate=true; sandGeo.computeVertexNormals();
    const sandM=new THREE.Mesh(sandGeo, mats.sand); sandM.rotation.x=-Math.PI/2; sandM.position.set(x,0.22,z); sandM.receiveShadow=true; group.add(sandM);
    // footprints decals small depressions
    for(let i=0;i<3;i++){
      const fp=new THREE.Mesh(new THREE.CircleGeometry(0.11,7), mats.sandDark);
      fp.rotation.x=-Math.PI/2; fp.position.set(x-0.6+Math.random()*1.2,0.225, z-0.4+Math.random()*0.8); group.add(fp);
    }
    // toy bucket
    const bucket=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.15,0.18,12), new THREE.MeshStandardMaterial({ color:0xe94e4e, roughness:0.42 }));
    bucket.position.set(x+0.9,0.31,z+0.38); bucket.castShadow=true; group.add(bucket);
    const shovel=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.42,0.02), new THREE.MeshStandardMaterial({ color:0x3a8a3a }));
    shovel.position.set(x+0.62,0.38,z+0.42); shovel.rotation.z= -0.35; group.add(shovel);
    colliders.push({ min:new THREE.Vector3(x-outerW/2,0,z-outerD/2), max:new THREE.Vector3(x+outerW/2, h, z+outerD/2) });
  }

  // birch — realistic trunk with bark texture (canvas), branches, leaf clusters as planes
  {
    const x=-HW+px(218+130), z=-HH+px(574+150);
    const trunkH=5.9;
    // trunk with taper and slight bend + bark streaks texture
    const barkTex=canvasTexture(256,512,(ctx,W,H)=>{
      ctx.fillStyle="#efe7d8"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(28,28,28,0.92)"; ctx.lineWidth=2; ctx.lineCap="round";
      for(let i=0;i<28;i++){ const y= i* (H/28) + Math.random()*6; ctx.beginPath(); ctx.moveTo(18+Math.random()*12, y); ctx.lineTo(W-18- Math.random()*12, y+ Math.random()*4-2); ctx.stroke();}
      ctx.fillStyle="rgba(0,0,0,0.08)"; for(let i=0;i<120;i++){ ctx.fillRect(Math.random()*W, Math.random()*H, 1, 18+Math.random()*22); }
    }); barkTex.wrapS=barkTex.wrapT=THREE.RepeatWrapping; barkTex.repeat.set(1,1);
    const trunkMat=new THREE.MeshStandardMaterial({ map:barkTex, roughness:0.92 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.32, trunkH, 9), trunkMat);
    trunk.position.set(x, trunkH/2+0.05, z); trunk.castShadow=true; trunk.rotation.z=0.03; trunk.rotation.x=0.015; group.add(trunk);
    // main branches
    function branch(h:number, ang:number, len:number, r0:number, r1:number){
      const g=new THREE.Group(); g.position.set(x, h, z);
      const cyl=new THREE.Mesh(new THREE.CylinderGeometry(r1,r0,len,7), trunkMat);
      cyl.position.set(0,len/2,0); cyl.rotation.z=ang; g.add(cyl);
      return g;
    }
    const b1=branch(4.2, -0.42, 1.55,0.11,0.06); group.add(b1);
    const b2=branch(4.85, 0.52, 1.25,0.09,0.05); group.add(b2);
    const b3=branch(3.6, 0.12, 0.92,0.08,0.04); group.add(b3);
    // leaf clusters — multiple Icosa + planes with alpha
    const leafMats=[mats.foliage, mats.foliageLight, mats.foliageDark];
    const crownCenters=[
      { y:6.55, x:0.05, z:0.02, s:2.15 },
      { y:5.95, x:0.62, z:0.42, s:1.55 },
      { y:5.45, x:-0.48, z:-0.32, s:1.35 },
      { y:6.95, x:-0.22, z:0.28, s:1.15 },
    ];
    crownCenters.forEach((c,i)=>{
      const cl=new THREE.Mesh(new THREE.IcosahedronGeometry(c.s, 1), leafMats[i%3]);
      cl.position.set(x+c.x, c.y, z+c.z); cl.castShadow=true; cl.rotation.set(Math.random(),Math.random(),Math.random()); group.add(cl);
      // leaf planes around
      for(let k=0;k<3;k++){
        const pl=new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.42), new THREE.MeshStandardMaterial({ color:0x7aa062, side:THREE.DoubleSide, transparent:true, opacity:0.92 }));
        pl.position.set(x+c.x+ (Math.random()-0.5)*0.9, c.y+ (Math.random()-0.5)*0.55, z+c.z+ (Math.random()-0.5)*0.9);
        pl.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI); group.add(pl);
      }
    });
    // birdhouse on branch
    const house=new THREE.Group(); house.position.set(x+0.42, 4.42, z+0.18);
    const hBox=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.24,0.22), new THREE.MeshStandardMaterial({ color:0x7a5a3e })); hBox.castShadow=true; house.add(hBox);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.18,4), new THREE.MeshStandardMaterial({ color:0x9a3a2a })); roof.position.set(0,0.21,0); roof.rotation.y=Math.PI/4; house.add(roof);
    const hole=new THREE.Mesh(new THREE.CircleGeometry(0.05,10), new THREE.MeshStandardMaterial({ color:0x0d0d0d })); hole.position.set(0,0.02,0.112); house.add(hole);
    // pole to branch
    const pole=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.38,0.03), mats.barkDark); pole.position.set(0,-0.24,0); house.add(pole);
    group.add(house);
    colliders.push({ min:new THREE.Vector3(x-0.38,0,z-0.38), max:new THREE.Vector3(x+0.38, trunkH, z+0.38) });
  }

  // swing set — realistic A-frames with bolts, chains, seats
  {
    const x=-HW+px(598+58), z=-HH+px(638+55);
    const metalMat=mats.metal;
    const topBar=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,3.45,10), metalMat);
    topBar.rotation.z=Math.PI/2; topBar.position.set(x,2.42,z); group.add(topBar);
    const legGeo=new THREE.CylinderGeometry(0.045,0.052,2.95,8);
    const positions=[{o:-1.58,d:-0.78},{o:1.58,d:-0.78},{o:-1.58,d:0.78},{o:1.58,d:0.78}];
    positions.forEach(p=>{
      const leg=new THREE.Mesh(legGeo, metalMat); leg.position.set(x+p.o,1.38,z+p.d);
      leg.rotation.x= p.d<0?0.32:-0.32; leg.castShadow=true; group.add(leg);
      const foot=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.04,0.18), metalMat); foot.position.set(x+p.o,0.02,z+p.d); group.add(foot);
    });
    // cross braces
    [-1.58,1.58].forEach(off=>{
      const brace=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.72,6), metalMat);
      brace.position.set(x+off,1.35, z); brace.rotation.x=Math.PI/2; group.add(brace);
    });
    // swings — chains + rubber seats
    for(let s=0;s<2;s++){
      const sx = x-0.62 + s*1.24;
      const chainL=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,1.32,4), mats.metalDark);
      chainL.position.set(sx-0.14,1.78,z); group.add(chainL);
      const chainR=chainL.clone(); chainR.position.set(sx+0.14,1.78,z); group.add(chainR);
      const seat=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.04,0.18), new THREE.MeshStandardMaterial({ color:0x1e2326, roughness:0.82 }));
      seat.position.set(sx,1.12,z); seat.castShadow=true; group.add(seat);
      // chain links visual as small tori stack? keep cylinders for performance
    }
    // ground rubber mat under swings
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(3.6,2.0), new THREE.MeshStandardMaterial({ color:0x6b5a44, roughness:0.92 }));
    mat.rotation.x=-Math.PI/2; mat.position.set(x,0.016,z); mat.receiveShadow=true; group.add(mat);
    colliders.push({ min:new THREE.Vector3(x-1.85,0,z-1.02), max:new THREE.Vector3(x+1.85,2.55,z+1.02) });
  }

  // lamp posts — detailed (base, pole with brackets, lantern glass)
  function lampReal(pxX:number, pxZ:number){
    const x=-HW+px(pxX+22), z=-HH+px(pxZ+46);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.22,0.22,8), mats.metalDark);
    base.position.set(x,0.11,z); base.castShadow=true; group.add(base);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.065,3.45,8), mats.metal);
    pole.position.set(x,1.94,z); pole.castShadow=true; group.add(pole);
    // brackets
    for(let y=1.2;y<3.0;y+=0.95){
      const br=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.02,0.02), mats.metalDark);
      br.position.set(x+0.08,y,z); group.add(br);
    }
    // lantern housing
    const housing=new THREE.Mesh(new THREE.BoxGeometry(0.32,0.36,0.32), mats.metalDark);
    housing.position.set(x,3.42,z); housing.castShadow=true; group.add(housing);
    const glassBox=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.26,0.26), new THREE.MeshPhysicalMaterial({ color:0xfff6d6, roughness:0.22, transparent:true, opacity:0.62, emissive:0x332e12, emissiveIntensity:0.32 }));
    glassBox.position.set(x,3.42,z); group.add(glassBox);
    const topCap=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.18,4), mats.metalDark);
    topCap.position.set(x,3.68,z); topCap.rotation.y=Math.PI/4; group.add(topCap);
    const light=new THREE.PointLight(0xffe8b0, 6.2,14,1.7); light.position.set(x,3.42,z); group.add(light);
    // light pool on ground
    const pool=new THREE.Mesh(new THREE.CircleGeometry(1.55,16), new THREE.MeshBasicMaterial({ color:0xffe8b0, transparent:true, opacity:0.08, depthWrite:false }));
    pool.rotation.x=-Math.PI/2; pool.position.set(x,0.02,z); group.add(pool);
  }
  lampReal(760,440); lampReal(1160,760);

  // bins — 3 containers green metal, wheels, lids
  {
    const x=-HW+px(1250+46), z=-HH+px(760+33);
    const binColors=[0x2d5a3a,0x2d5a3a,0x3a4550];
    for(let i=0;i<3;i++){
      const bx=x+(i-1)*0.92;
      const bin=new THREE.Group(); bin.position.set(bx,0,z);
      const body=new THREE.Mesh(new THREE.BoxGeometry(0.78,0.92,0.62), new THREE.MeshStandardMaterial({ color: binColors[i], roughness:0.82, metalness:0.12 }));
      body.position.set(0,0.46,0); body.castShadow=true; bin.add(body);
      const lid=new THREE.Mesh(new THREE.BoxGeometry(0.84,0.06,0.68), new THREE.MeshStandardMaterial({ color:0x1f2a24, roughness:0.65 }));
      lid.position.set(0,0.95,0); bin.add(lid);
      const lidHandle=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.04,0.04), mats.metal); lidHandle.position.set(0,0.99,0.18); bin.add(lidHandle);
      // wheels
      [-0.26,0.26].forEach(off=>{ const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.04,10), new THREE.MeshStandardMaterial({ color:0x1a1a1a })); wh.rotation.z=Math.PI/2; wh.position.set(off,0.08,0.28); bin.add(wh); });
      // corrugation lines
      for(let y=0.32;y<0.88;y+=0.18){ const line=new THREE.Mesh(new THREE.BoxGeometry(0.80,0.012,0.64), new THREE.MeshStandardMaterial({ color:0x000000, transparent:true, opacity:0.09 })); line.position.set(0,y,0); bin.add(line); }
      group.add(bin);
    }
    colliders.push({ min:new THREE.Vector3(x-1.45,0,z-0.42), max:new THREE.Vector3(x+1.45,1.02,z+0.42) });
  }

  // bike — detailed but low-poly
  {
    const x=-HW+px(1010+39), z=-HH+px(862+23);
    const bike=new THREE.Group(); bike.position.set(x,0,z); bike.rotation.y=0.32;
    const frameMat=new THREE.MeshStandardMaterial({ color:0x2b5a9a, roughness:0.42, metalness:0.18 });
    // wheels
    const wheelGeo=new THREE.TorusGeometry(0.32,0.018,8,18);
    const w1=new THREE.Mesh(wheelGeo, new THREE.MeshStandardMaterial({ color:0x1a1a1a })); w1.position.set(0,0.32,0.62); w1.rotation.y=Math.PI/2; bike.add(w1);
    const w2=w1.clone(); w2.position.set(0,0.32,-0.62); bike.add(w2);
    // spokes as lines
    for(let r of [w1,w2]){
      const sp=new THREE.Mesh(new THREE.CircleGeometry(0.28,10), new THREE.MeshBasicMaterial({ color:0x2a2a2a, transparent:true, opacity:0.0 })); sp.rotation.y=Math.PI/2; sp.position.copy(r.position); bike.add(sp);
    }
    // frame triangles
    const topTube=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.92,6), frameMat); topTube.rotation.x=Math.PI/2; topTube.position.set(0,0.62,0); bike.add(topTube);
    const downTube=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,0.78,6), frameMat); downTube.rotation.z= -0.62; downTube.position.set(0.12,0.48,0.28); bike.add(downTube);
    const seatPost=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.42,6), frameMat); seatPost.position.set(-0.18,0.62,-0.08); seatPost.rotation.z=0.22; bike.add(seatPost);
    const saddle=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.05,0.12), new THREE.MeshStandardMaterial({ color:0x1a1512 })); saddle.position.set(-0.18,0.84,-0.08); bike.add(saddle);
    const handle=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.48,6), new THREE.MeshStandardMaterial({ color:0x222226 })); handle.rotation.z=Math.PI/2; handle.position.set(0.12,0.78,0.62); bike.add(handle);
    group.add(bike);
    colliders.push({ min:new THREE.Vector3(x-0.52,0,z-0.72), max:new THREE.Vector3(x+0.52,0.88,z+0.72) });
  }

  // cat bowl + bench details
  {
    const x=-HW+px(322+17), z=-HH+px(616+10);
    const bowl=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.10,0.05,12), new THREE.MeshStandardMaterial({ color:0xe8e0cc }));
    bowl.position.set(x,0.05,z); group.add(bowl);
    const water=new THREE.Mesh(new THREE.CircleGeometry(0.09,10), new THREE.MeshStandardMaterial({ color:0x7ab2e0, transparent:true, opacity:0.72 }));
    water.rotation.x=-Math.PI/2; water.position.set(x,0.075,z); group.add(water);
  }

  // laundry lines between buildings — legit Soviet двор
  {
    const lineMat=new THREE.LineBasicMaterial({ color:0x2a2a2e });
    const points=[ new THREE.Vector3(-6.2,3.2,-HH+1.2), new THREE.Vector3(6.8,3.15,-HH+1.2)];
    const geo=new THREE.BufferGeometry().setFromPoints(points);
    const line=new THREE.Line(geo, lineMat); group.add(line);
    // clothes
    const colors=[0xe8dcc4,0xc9aeb0,0x7aa0b8,0xf1e4cb,0x9ab09a];
    for(let i=0;i<6;i++){
      const cx=-5.2+i*2.15;
      const cloth=new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.48), new THREE.MeshStandardMaterial({ color:colors[i%5], side:THREE.DoubleSide }));
      cloth.position.set(cx, 3.0, -HH+1.2); cloth.rotation.y=0.02; cloth.rotation.x=0.12; cloth.castShadow=false; group.add(cloth);
      // subtle wind vertex wobble handled via update? static for now
    }
  }

  // stone paths — real slabs with gaps + moss
  {
    const slabMat=new THREE.MeshStandardMaterial({ color:0xcbbda6, roughness:0.88 });
    const gapMat=new THREE.MeshStandardMaterial({ color:0x5a6b4e, roughness:0.98 });
    function pathSlabs(cx:number, z0:number, len:number, w:number){
      const n=Math.floor(len/0.92);
      for(let i=0;i<n;i++){
        const z=z0+i*0.92+0.46;
        const s=new THREE.Mesh(new THREE.BoxGeometry(w-0.06,0.04,0.84), slabMat);
        s.position.set(cx,0.02,z); s.receiveShadow=true; s.rotation.y=(Math.random()-0.5)*0.04; group.add(s);
        if(i<n-1){
          const gap=new THREE.Mesh(new THREE.PlaneGeometry(w-0.08,0.08), gapMat);
          gap.rotation.x=-Math.PI/2; gap.position.set(cx,0.021, z+0.46); group.add(gap);
        }
      }
    }
    pathSlabs(-HW+px(690+32), -HH+px(250), 18.9, 1.78);
    pathSlabs(-HW+px(356+15), -HH+px(250), 10.56, 0.83);
  }

  // puddle with screen-space reflection (simple env)
  {
    const x=-HW+px(430+105), z=-HH+px(820+28);
    const puddleGeo=new THREE.CircleGeometry(2.55, 20);
    const puddleMat=new THREE.MeshStandardMaterial({ color:0x6b86a6, roughness:0.12, metalness:0.42, transparent:true, opacity:0.58, envMapIntensity:0.8 });
    const pud=new THREE.Mesh(puddleGeo, puddleMat); pud.rotation.x=-Math.PI/2; pud.position.set(x,0.008,z); group.add(pud);
    // ripple rings
    for(let r=0.62;r<2.2;r+=0.55){
      const ring=new THREE.Mesh(new THREE.RingGeometry(r, r+0.03, 20), new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.09*(2.4-r), side:THREE.DoubleSide, depthWrite:false }));
      ring.rotation.x=-Math.PI/2; ring.position.set(x,0.009,z); group.add(ring);
    }
    // fallen leaf in puddle
    const leaf=new THREE.Mesh(new THREE.CircleGeometry(0.12,6), new THREE.MeshStandardMaterial({ color:0xd9a441, side:THREE.DoubleSide })); leaf.rotation.x=-Math.PI/2; leaf.position.set(x+0.42,0.012,z-0.32); leaf.rotation.z=0.7; group.add(leaf);
  }

  // leaf pile
  {
    const x=-HW+px(1180+45), z=-HH+px(830+20);
    for(let i=0;i<18;i++){
      const leaf=new THREE.Mesh(new THREE.CircleGeometry(0.07+Math.random()*0.05,5), new THREE.MeshStandardMaterial({ color: i%3===0?0xc98a3a: i%3===1?0x9a6840:0xd9b66a, side:THREE.DoubleSide }));
      leaf.position.set(x+(Math.random()-0.5)*1.1, 0.015+Math.random()*0.04, z+(Math.random()-0.5)*0.65);
      leaf.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI); group.add(leaf);
    }
  }

  // triggers / spawns
  const toVec=(pxX:number,pxZ:number):THREE.Vector3=> new THREE.Vector3(-HW+px(pxX),0.95,-HH+px(pxZ));
  triggers.push({ id:"courtyard.entrance1", pos: toVec(380,262), radius:2.45, to:"apartment", via:"from_courtyard" });
  triggers.push({ id:"courtyard.entrance2", pos: toVec(1100,262), radius:2.1 });
  triggers.push({ id:"courtyard.mailboxes", pos: toVec(474,268), radius:1.45 });
  triggers.push({ id:"courtyard.board", pos: toVec(538,370), radius:1.55 });
  triggers.push({ id:"courtyard.tree", pos: toVec(214,640), radius:1.9 });
  triggers.push({ id:"courtyard.bench", pos: toVec(262,674), radius:1.5 });
  triggers.push({ id:"courtyard.playground", pos: toVec(560,742), radius:1.9 });
  triggers.push({ id:"courtyard.puddle", pos: toVec(470,844), radius:1.6 });
  triggers.push({ id:"courtyard.laundry", pos: toVec(470,356), radius:1.55 });
  triggers.push({ id:"courtyard.arch", pos: new THREE.Vector3(0,0.9,HH-0.6), radius:2.4, to:"street" });

  spawns["player"]=new THREE.Vector3(0,0.9,HH-6.2);
  spawns["lidia"]=toVec(884,612); spawns["sasha"]=toVec(620,715); spawns["artyom"]=toVec(970,858); spawns["musya"]=toVec(238,548);

  // lighting — Blender Cycles-like: soft dusk, warm sun, contact shadows
  const hemi=new THREE.HemisphereLight(0xe6e4ef, 0x1a1510, 0.62); hemi.position.set(0,20,0); group.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff1e2, 1.35); sun.position.set(-14,18,-9);
  sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.near=0.5; sun.shadow.camera.far=55;
  sun.shadow.camera.left=-22; sun.shadow.camera.right=22; sun.shadow.camera.top=16; sun.shadow.camera.bottom=-16;
  sun.shadow.radius=3.5; sun.shadow.bias=-0.0006; group.add(sun);
  // fill light from sky opposite
  const fillLight=new THREE.DirectionalLight(0xd6e0f0, 0.42); fillLight.position.set(8,10,12); group.add(fillLight);

  return { group, colliders, triggers, spawns, groundY:0 };
}

/* ---------- apartment interior — now realistic (not just boxes) ---------- */
export function buildApartment(texLoader: THREE.TextureLoader): ZoneWorld {
  const mats=makeMaterials(texLoader);
  const group=new THREE.Group(); group.name="apartment";
  const colliders: ColliderBox[]=[]; const triggers: ZoneWorld["triggers"]=[];
  const W=12,D=9,H=2.75;
  const floorTex=canvasTexture(512,512,(ctx,W,H)=>{
    ctx.fillStyle="#c8b08a"; ctx.fillRect(0,0,W,H);
    const plankH=H/4;
    for(let r=0;r<4;r++){
      ctx.fillStyle=r%2?"rgba(255,235,200,0.07)":"rgba(0,0,0,0.07)"; ctx.fillRect(0,r*plankH,W,plankH);
      ctx.strokeStyle="rgba(0,0,0,0.13)"; ctx.lineWidth=1; ctx.strokeRect(0,r*plankH,W,plankH);
    }
    ctx.strokeStyle="rgba(0,0,0,0.09)"; for(let i=0;i<16;i++){ const x=Math.random()*W; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x+ (Math.random()-0.5)*8,H); ctx.stroke(); }
  }); floorTex.repeat.set(2,1);
  const floorMat=new THREE.MeshStandardMaterial({ map:floorTex, roughness:0.68 });
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(W,D), floorMat);
  ground.rotation.x=-Math.PI/2; ground.position.set(0,0.01,0); ground.receiveShadow=true; group.add(ground);
  // walls — off-white with baseboard
  const wallMat=new THREE.MeshStandardMaterial({ color:0xf2e8d8, roughness:0.88 });
  const baseMat=new THREE.MeshStandardMaterial({ color:0xe8ddd0, roughness:0.92 });
  addBox(group,colliders,new THREE.BoxGeometry(W,H,0.14), wallMat, new THREE.Vector3(0,H/2,-D/2));
  addBox(group,colliders,new THREE.BoxGeometry(W,H,0.14), wallMat, new THREE.Vector3(0,H/2,D/2));
  addBox(group,colliders,new THREE.BoxGeometry(0.14,H,D), wallMat, new THREE.Vector3(-W/2,H/2,0));
  addBox(group,colliders,new THREE.BoxGeometry(0.14,H,D), wallMat, new THREE.Vector3(W/2,H/2,0));
  // baseboards
  [ -D/2+0.07, D/2-0.07].forEach(z=>{ const b=new THREE.Mesh(new THREE.BoxGeometry(W-0.28,0.12,0.04), baseMat); b.position.set(0,0.06,z); group.add(b);});
  [-W/2+0.07, W/2-0.07].forEach(x=>{ const b=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.12,D-0.28), baseMat); b.position.set(x,0.06,0); group.add(b);});
  // window on north wall (street view)
  const winFrame=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.55,0.06), new THREE.MeshStandardMaterial({ color:0xf7f3ea })); winFrame.position.set(1.2,1.35,-D/2+0.07); group.add(winFrame);
  const winGlass=new THREE.Mesh(new THREE.PlaneGeometry(2.0,1.35), new THREE.MeshPhysicalMaterial({ color:0xcfe0f2, transparent:true, opacity:0.42, roughness:0.08 }));
  winGlass.position.set(1.2,1.35,-D/2+0.11); group.add(winGlass);
  const sill=new THREE.Mesh(new THREE.BoxGeometry(2.35,0.08,0.18), new THREE.MeshStandardMaterial({ color:0xe8e0cc })); sill.position.set(1.2,0.64,-D/2+0.14); group.add(sill);
  // plant on sill
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.13,0.18,10), new THREE.MeshStandardMaterial({ color:0x9a6a44 })); pot.position.set(0.85,0.77,-D/2+0.14); group.add(pot);
  const plant=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,6), mats.foliage); plant.position.set(0.85,0.98,-D/2+0.14); group.add(plant);
  // door out with frame
  const doorFrame=new THREE.Mesh(new THREE.BoxGeometry(1.18,2.15,0.1), new THREE.MeshStandardMaterial({ color:0x8b735a })); doorFrame.position.set(0,1.07,-D/2+0.07); group.add(doorFrame);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.02,2.02,0.06), mats.doorMat); door.position.set(0,1.02,-D/2+0.12); group.add(door);
  const doorHnd=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,0.16,8), mats.metal); doorHnd.rotation.z=Math.PI/2; doorHnd.position.set(0.28,1.02,-D/2+0.16); group.add(doorHnd);
  // door peephole
  const eye=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.02,10), mats.metalDark); eye.rotation.x=Math.PI/2; eye.position.set(0,1.42,-D/2+0.16); group.add(eye);

  // furniture — kitchenette left, wardrobe, bed, etc with detail
  // kitchenette: counter + sink + tiles
  const kitCount=new THREE.Mesh(new THREE.BoxGeometry(2.45,0.88,0.62), new THREE.MeshStandardMaterial({ color:0x6b5a44 }));
  kitCount.position.set(-3.65,0.44,1.55); kitCount.castShadow=true; group.add(kitCount);
  const kitTop=new THREE.Mesh(new THREE.BoxGeometry(2.48,0.04,0.65), new THREE.MeshStandardMaterial({ color:0xe8e0cc })); kitTop.position.set(-3.65,0.88,1.55); group.add(kitTop);
  const sink=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.02,0.38), new THREE.MeshStandardMaterial({ color:0xd0d6da, metalness:0.42, roughness:0.28 })); sink.position.set(-3.95,0.90,1.55); group.add(sink);
  const faucet=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.18,6), mats.metal); faucet.position.set(-3.95,0.98,1.42); group.add(faucet);
  // tiles behind
  const tileTex=canvasTexture(256,128,(ctx,W,H)=>{ ctx.fillStyle="#f2ece0"; ctx.fillRect(0,0,W,H); ctx.fillStyle="#e8ddd0"; for(let x=0;x<W;x+=32) ctx.fillRect(x,0,1,H); for(let y=0;y<H;y+=32) ctx.fillRect(0,y,W,1); });
  const backsplash=new THREE.Mesh(new THREE.PlaneGeometry(2.48,0.68), new THREE.MeshStandardMaterial({ map:tileTex })); backsplash.position.set(-3.65,1.28,1.22); group.add(backsplash);
  // wardrobe
  const ward=new THREE.Mesh(new THREE.BoxGeometry(1.18,1.82,0.58), new THREE.MeshStandardMaterial({ color:0xc9b896, roughness:0.72 })); ward.position.set(-4.42,0.91,-2.75); ward.castShadow=true; group.add(ward);
  const wardDoor=new THREE.Mesh(new THREE.BoxGeometry(0.56,1.68,0.02), new THREE.MeshStandardMaterial({ color:0xd9c9a6 })); wardDoor.position.set(-4.22,0.91,-2.44); group.add(wardDoor);
  const wardH=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.08,0.02), mats.metal); wardH.position.set(-4.02,0.92,-2.42); group.add(wardH);
  // bed — frame + mattress + pillow + blanket
  const bedFrame=new THREE.Mesh(new THREE.BoxGeometry(2.05,0.32,3.25), new THREE.MeshStandardMaterial({ color:0x5a4030 })); bedFrame.position.set(3.45,0.16,2.05); group.add(bedFrame);
  const mattress=new THREE.Mesh(new THREE.BoxGeometry(1.95,0.18,3.15), new THREE.MeshStandardMaterial({ color:0xf2e8d8 })); mattress.position.set(3.45,0.34,2.05); group.add(mattress);
  const pillow=new THREE.Mesh(new THREE.BoxGeometry(0.72,0.14,0.52), new THREE.MeshStandardMaterial({ color:0xfffaf0 })); pillow.position.set(3.45,0.48,0.85); group.add(pillow);
  const blanket=new THREE.Mesh(new THREE.BoxGeometry(1.85,0.08,1.85), new THREE.MeshStandardMaterial({ color:0x7a9ab0 })); blanket.position.set(3.45,0.42,2.35); group.add(blanket);
  // side table + lamp
  const side=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.52,0.42), new THREE.MeshStandardMaterial({ color:0x8b735a })); side.position.set(2.12,0.26,0.95); group.add(side);
  const lampBase=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.08,0.32,8), mats.metal); lampBase.position.set(2.12,0.58,0.95); group.add(lampBase);
  const lampShade=new THREE.Mesh(new THREE.ConeGeometry(0.18,0.22,12,1,true), new THREE.MeshStandardMaterial({ color:0xf1e4cb, transparent:true, opacity:0.82, side:THREE.DoubleSide })); lampShade.position.set(2.12,0.78,0.95); group.add(lampShade);
  const lampLight=new THREE.PointLight(0xfff0c8, 6, 5, 1.4); lampLight.position.set(2.12,0.78,0.95); group.add(lampLight);
  // bookshelf
  const shelf=new THREE.Group(); shelf.position.set(4.82,0, -0.2);
  const shelfFrame=new THREE.Mesh(new THREE.BoxGeometry(0.32,1.62,1.82), new THREE.MeshStandardMaterial({ color:0x6a5a44 })); shelfFrame.position.set(0,0.81,0); group.add(shelfFrame);
  // add to group? actually already added to scene group directly; keep
  group.add(shelf);
  // rug
  const rugTex=canvasTexture(512,320,(ctx,W,H)=>{ ctx.fillStyle="#b89a6a"; ctx.fillRect(0,0,W,H); ctx.strokeStyle="rgba(60,40,20,0.18)"; ctx.lineWidth=2; for(let i=0;i<6;i++) ctx.strokeRect(10+i*6,10+i*6,W-20-i*12,H-20-i*12); });
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(3.2,2.2), new THREE.MeshStandardMaterial({ map:rugTex, roughness:0.98 })); rug.rotation.x=-Math.PI/2; rug.position.set(0.85,0.015,0.85); rug.receiveShadow=true; group.add(rug);

  boxCollider(new THREE.Vector3(-3.65,0.44,1.55), new THREE.Vector3(2.45,0.88,0.62), colliders);
  boxCollider(new THREE.Vector3(-4.42,0.91,-2.75), new THREE.Vector3(1.18,1.82,0.58), colliders);
  boxCollider(new THREE.Vector3(3.45,0.32,2.05), new THREE.Vector3(2.05,0.64,3.25), colliders);

  triggers.push({ id:"apartment.exit", pos:new THREE.Vector3(0,0.9,-D/2+1.1), radius:1.25, to:"courtyard" });
  triggers.push({ id:"apartment.bed", pos:new THREE.Vector3(3.45,0.9,2.05), radius:1.45 });
  triggers.push({ id:"apartment.kettle", pos:new THREE.Vector3(-3.65,0.9,1.55), radius:1.15 });
  triggers.push({ id:"apartment.mirror", pos:new THREE.Vector3(-4.42,1.0,-1.95), radius:1.0 });

  const hemi=new THREE.HemisphereLight(0xfffaf1,0x3a3028,0.82); group.add(hemi);
  const dir=new THREE.DirectionalLight(0xfff6e0,0.82); dir.position.set(2.2,4.2,1.2); dir.castShadow=true; dir.shadow.mapSize.set(1024,1024); group.add(dir);
  return { group, colliders, triggers, spawns:{ player:new THREE.Vector3(0,0.9,-D/2+2.4) }, groundY:0 };
}

/* ---------- street (corridor) — now with shop fronts detailed ---------- */
export function buildStreet(texLoader: THREE.TextureLoader): ZoneWorld {
  const mats=makeMaterials(texLoader);
  const group=new THREE.Group(); group.name="street";
  const colliders: ColliderBox[]=[]; const triggers: ZoneWorld["triggers"]=[];
  const CW=44, CH=16;
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(CW,CH), mats.asphaltPhotoMat);
  ground.rotation.x=-Math.PI/2; ground.position.set(0,0,0); ground.receiveShadow=true; group.add(ground);
  const detail=new THREE.Mesh(new THREE.PlaneGeometry(CW,CH), new THREE.MeshStandardMaterial({ map:mats.asphaltTex, transparent:true, opacity:0.18 }));
  detail.rotation.x=-Math.PI/2; detail.position.set(0,0.005,0); group.add(detail);
  // side facades — continuous but with shop windows
  function streetFacade(zSide:number){
    const facade=new THREE.Group();
    const h=9.2;
    // back wall
    const wall=new THREE.Mesh(new THREE.BoxGeometry(CW, h, 0.85), mats.brickMat); wall.position.set(0,h/2,zSide); wall.receiveShadow=true; facade.add(wall);
    // cornice
    const cor=new THREE.Mesh(new THREE.BoxGeometry(CW+0.2,0.32,1.05), mats.concreteDark); cor.position.set(0,h+0.16,zSide); facade.add(cor);
    // shop fronts along north side (z = -CH/2)
    if(zSide<0){
      const fronts=[
        { x:-9, w:6.2, name:"ПРОДУКТЫ", color:0x2b8a3e },
        { x:6, w:6.8, name:"ТЁПЛЫЙ УГОЛ", color:0x8a5a2a },
      ];
      fronts.forEach(f=>{
        // recessed storefront
        const win=new THREE.Mesh(new THREE.BoxGeometry(f.w,3.2,0.12), new THREE.MeshPhysicalMaterial({ color:0xd6e8f5, transparent:true, opacity:0.42, roughness:0.08 }));
        win.position.set(f.x,1.62,zSide+0.42); facade.add(win);
        // frame
        const frame=new THREE.Mesh(new THREE.BoxGeometry(f.w+0.14,3.34,0.08), new THREE.MeshStandardMaterial({ color:0x2a2a2e })); frame.position.set(f.x,1.62,zSide+0.38); facade.add(frame);
        // door
        const door=new THREE.Mesh(new THREE.BoxGeometry(1.05,2.22,0.08), new THREE.MeshStandardMaterial({ color:0x3a2a1e })); door.position.set(f.x - f.w/2+1.05,1.11,zSide+0.48); facade.add(door);
        // awning
        const awning=new THREE.Mesh(new THREE.BoxGeometry(f.w+0.6,0.22,0.92), new THREE.MeshStandardMaterial({ color:f.color })); awning.position.set(f.x,3.48,zSide+0.62); awning.castShadow=true; facade.add(awning);
        // lettering plane
        const signTex=canvasTexture(512,64,(ctx,W,H)=>{ ctx.fillStyle=`#${f.color.toString(16).padStart(6,"0")}`; ctx.fillRect(0,0,W,H); ctx.fillStyle="#fff"; ctx.font="700 34px Inter"; ctx.fillText(f.name, 18,44); });
        const sign=new THREE.Mesh(new THREE.PlaneGeometry(f.w-0.4,0.42), new THREE.MeshStandardMaterial({ map:signTex })); sign.position.set(f.x,3.48,zSide+1.10); facade.add(sign);
        // interior light
        const li=new THREE.PointLight(0xffe8b0, 3.5,7,1.4); li.position.set(f.x,1.8,zSide+0.6); facade.add(li);
      });
    }
    // windows upper floors (if north side has flats above shops)
    if(zSide<0){
      for(let x=-18;x<=18;x+=3.6){
        for(let y=5.2;y<8.4;y+=2.55){
          // skip shop area already
          if(Math.abs(x+9)<3.4 && y<4) continue;
          if(Math.abs(x-6)<3.6 && y<4) continue;
          const wf=new THREE.Mesh(new THREE.BoxGeometry(1.15,1.32,0.06), mats.brickDarkMat); wf.position.set(x,y,zSide+0.44); facade.add(wf);
          const gl=new THREE.Mesh(new THREE.PlaneGeometry(0.95,1.12), Math.random()<0.3?mats.glassLit:mats.glass); gl.position.set(x,y,zSide+0.48); facade.add(gl);
          const sill=new THREE.Mesh(new THREE.BoxGeometry(1.22,0.07,0.14), new THREE.MeshStandardMaterial({ color:0xe8e0cc })); sill.position.set(x,y-0.66,zSide+0.48); facade.add(sill);
        }
      }
    }
    group.add(facade);
    colliders.push({ min:new THREE.Vector3(-CW/2,0,zSide-0.45), max:new THREE.Vector3(CW/2,9.2,zSide+0.45) });
  }
  streetFacade(-CH/2 -0.42); streetFacade(CH/2+0.42);
  triggers.push({ id:"street.courtyard", pos:new THREE.Vector3(0,0.9,CH/2-0.6), radius:2.2, to:"courtyard" });
  triggers.push({ id:"street.shop", pos:new THREE.Vector3(-9,0.9,-CH/2+1.6), radius:1.55, to:"shop" });
  triggers.push({ id:"street.cafe", pos:new THREE.Vector3(6,0.9,-CH/2+1.6), radius:1.55, to:"cafe" });
  triggers.push({ id:"street.metro", pos:new THREE.Vector3(18.5,0.9,0), radius:1.9, to:"metro" });
  triggers.push({ id:"street.dombyta", pos:new THREE.Vector3(-14,0.9,CH/2-1.0), radius:1.55, to:"dombyta" });
  // kiosk + benches
  addBox(group,colliders,new THREE.BoxGeometry(1.8,1.92,1.02), new THREE.MeshStandardMaterial({ color:0xc9b896 }), new THREE.Vector3(11,0.96,-1.05));
  const kRoof=new THREE.Mesh(new THREE.BoxGeometry(2.05,0.14,1.28), new THREE.MeshStandardMaterial({ color:0x8a2a2a })); kRoof.position.set(11,1.99,-1.05); group.add(kRoof);
  addBox(group,colliders,new THREE.BoxGeometry(2.2,0.46,0.62), mats.benchWood, new THREE.Vector3(-2,0.23,2.45));
  const hemi=new THREE.HemisphereLight(0xe6e4ef,0x181410,0.72); group.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff1e2,1.2); sun.position.set(-12,14,-7); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); group.add(sun);
  [-18,-6,6,18].forEach(x=>{ const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.07,3.45,8), mats.metal); pole.position.set(x,1.72,-2.2); group.add(pole); const head=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,6), new THREE.MeshStandardMaterial({ color:0xfff6d6, emissive:0x332e12, emissiveIntensity:0.28 })); head.position.set(x,3.5,-2.2); group.add(head); });
  return { group, colliders, triggers, spawns:{ player:new THREE.Vector3(0,0.9,CH/2-3.2) }, groundY:0 };
}

/* ---------- shop interior — now realistic store ---------- */
export function buildShop(texLoader: THREE.TextureLoader): ZoneWorld {
  const group=new THREE.Group(); group.name="shop";
  const mats=makeMaterials(texLoader);
  const colliders: ColliderBox[]=[]; const triggers: ZoneWorld["triggers"]=[];
  const W=11,D=8,H=2.85;
  const floorTex=canvasTexture(256,256,(ctx,W,H)=>{ ctx.fillStyle="#d8d0bc"; ctx.fillRect(0,0,W,H); ctx.fillStyle="#c9b896"; for(let x=0;x<W;x+=32) ctx.fillRect(x,0,1,H); for(let y=0;y<H;y+=32) ctx.fillRect(0,y,W,1); });
  floorTex.repeat.set(2,2);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(W,D), new THREE.MeshStandardMaterial({ map:floorTex, roughness:0.42 })); ground.rotation.x=-Math.PI/2; ground.position.set(0,0.01,0); ground.receiveShadow=true; group.add(ground);
  const wallMat=new THREE.MeshStandardMaterial({ color:0xf5efe2, roughness:0.92 });
  addBox(group,colliders,new THREE.BoxGeometry(W,H,0.12), wallMat, new THREE.Vector3(0,H/2,-D/2));
  addBox(group,colliders,new THREE.BoxGeometry(W,H,0.12), wallMat, new THREE.Vector3(0,H/2,D/2));
  addBox(group,colliders,new THREE.BoxGeometry(0.12,H,D), wallMat, new THREE.Vector3(-W/2,H/2,0));
  addBox(group,colliders,new THREE.BoxGeometry(0.12,H,D), wallMat, new THREE.Vector3(W/2,H/2,0));
  // shelves along walls with products
  function shelfWall(x:number, z:number, rotY:number){
    const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=rotY;
    for(let level=0; level<4; level++){
      const y=0.48+level*0.42;
      const shelf=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.04,0.52), new THREE.MeshStandardMaterial({ color:0x8a7a5e })); shelf.position.set(0,y,0); g.add(shelf);
      // products — colorful boxes
      for(let i=0;i<6;i++){
        const col=[0xe94e4e,0x2b8a3e,0x3a6ea5,0xd9a441,0x9a5a8a][i%5];
        const box=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.18+Math.random()*0.08,0.18), new THREE.MeshStandardMaterial({ color:col }));
        box.position.set(-0.85+i*0.31, y+0.11, 0.04); box.castShadow=true; g.add(box);
      }
    }
    group.add(g);
    colliders.push({ min:new THREE.Vector3(x-1.15,0,z-0.32), max:new THREE.Vector3(x+1.15,1.85,z+0.32) });
  }
  shelfWall(-W/2+0.42, 0, 0); shelfWall(W/2-0.42, 0, Math.PI);
  // central gondola
  const gondola=new THREE.Group(); gondola.position.set(1.8,0,0);
  for(let s=0;s<2;s++){
    const side=new THREE.Mesh(new THREE.BoxGeometry(0.04,1.22,1.65), new THREE.MeshStandardMaterial({ color:0x6b5a44 })); side.position.set(s?0.42:-0.42,0.61,0); gondola.add(side);
    for(let l=0;l<3;l++){
      const sh=new THREE.Mesh(new THREE.BoxGeometry(0.88,0.04,1.55), new THREE.MeshStandardMaterial({ color:0x8a7a5e })); sh.position.set(0,0.42+l*0.32,0); gondola.add(sh);
      for(let i=0;i<4;i++){ const b=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.14,0.14), new THREE.MeshStandardMaterial({ color:0xe8dcc4 })); b.position.set(-0.28+i*0.19,0.52+l*0.32,0); gondola.add(b); }
    }
  }
  group.add(gondola); colliders.push({ min:new THREE.Vector3(1.35,0,-0.85), max:new THREE.Vector3(2.25,1.22,0.85) });
  // register / counter with Nina
  const counter=new THREE.Group(); counter.position.set(0,0,-D/2+1.9);
  const cntBody=new THREE.Mesh(new THREE.BoxGeometry(4.4,1.02,0.82), new THREE.MeshStandardMaterial({ color:0x5a3d28, roughness:0.58 })); cntBody.position.set(0,0.51,0); cntBody.castShadow=true; counter.add(cntBody);
  const cntTop=new THREE.Mesh(new THREE.BoxGeometry(4.45,0.04,0.85), new THREE.MeshStandardMaterial({ color:0x8a735a })); cntTop.position.set(0,1.02,0); counter.add(cntTop);
  const cashReg=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.28,0.38), new THREE.MeshStandardMaterial({ color:0x2a2a2e })); cashReg.position.set(0.72,1.16,0.08); counter.add(cashReg);
  const display=new THREE.Mesh(new THREE.PlaneGeometry(0.32,0.18), new THREE.MeshStandardMaterial({ color:0x7fdb7f, emissive:0x1a3a1a, emissiveIntensity:0.6 })); display.position.set(0.72,1.31,0.10); display.rotation.x=-0.6; counter.add(display);
  // scale
  const scale=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.04,12), mats.metal); scale.position.set(-0.62,1.05,0.12); counter.add(scale);
  group.add(counter); colliders.push({ min:new THREE.Vector3(-2.22,0,-D/2+1.45), max:new THREE.Vector3(2.22,1.06,-D/2+2.35) });
  // fridge
  const fridge=new THREE.Mesh(new THREE.BoxGeometry(0.92,1.85,0.72), new THREE.MeshStandardMaterial({ color:0xf0f4f8, roughness:0.32, metalness:0.12 })); fridge.position.set(-W/2+0.92,0.92, -D/2+2.45); fridge.castShadow=true; group.add(fridge);
  const fridgeGlass=new THREE.Mesh(new THREE.PlaneGeometry(0.72,1.35), new THREE.MeshPhysicalMaterial({ color:0xd6eef8, transparent:true, opacity:0.22, roughness:0.04 })); fridgeGlass.position.set(-W/2+0.92,0.97, -D/2+2.82); group.add(fridgeGlass);
  const fridgeLight=new THREE.PointLight(0xcfe8ff, 4,4,1.2); fridgeLight.position.set(-W/2+0.92,1.15, -D/2+2.85); group.add(fridgeLight);
  colliders.push({ min:new THREE.Vector3(-W/2+0.45,0,-D/2+2.05), max:new THREE.Vector3(-W/2+1.42,1.85,-D/2+2.85) });

  // ceiling lights — recessed panels
  for(let x=-3.5;x<=3.5;x+=3.2){
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.18,0.62), new THREE.MeshStandardMaterial({ color:0xfff8e2, emissive:0xfff2b0, emissiveIntensity:0.52 }));
    panel.rotation.x=Math.PI/2; panel.position.set(x,2.82,0); group.add(panel);
    const li=new THREE.PointLight(0xfff2b0, 9,10,1.2); li.position.set(x,2.72,0); group.add(li);
  }

  triggers.push({ id:"shop.exit", pos:new THREE.Vector3(0,0.9,D/2-1.05), radius:1.25, to:"street" });
  triggers.push({ id:"shop.counter", pos:new THREE.Vector3(0,0.9,-D/2+3.1), radius:1.35 });
  const hemi=new THREE.HemisphereLight(0xfffaf1,0x3a3028,0.92); group.add(hemi);
  return { group, colliders, triggers, spawns:{ player:new THREE.Vector3(0,0.9,D/2-2.2) }, groundY:0 };
}

export function buildGenericZone(zone: ZoneId, loader: THREE.TextureLoader): ZoneWorld {
  if(zone==="courtyard") return buildCourtyard(loader);
  if(zone==="apartment") return buildApartment(loader);
  if(zone==="street") return buildStreet(loader);
  if(zone==="shop") return buildShop(loader);
  const base=buildShop(loader); base.group.name=zone;
  const tint: Record<string,number>={ cafe:0xd9c9a6, metro:0xaab2b8, dombyta:0xc8bbb0 };
  (base.group.children[0] as THREE.Mesh).material=new THREE.MeshStandardMaterial({ color:tint[zone] ?? 0xd0c8b8, roughness:0.9 });
  const found=(ZONES as unknown as {id:string;nameRu:string}[]).find(z=>z.id===zone);
  const name=found?.nameRu ?? zone;
  const spr=textSprite(name.toUpperCase()); spr.position.set(0,2.8,-2.2); base.group.add(spr);
  const w=(base.triggers[0]={ id:`${zone}.exit`, pos:new THREE.Vector3(0,0.9,4-1.05), radius:1.25, to:"street" as ZoneId }); void w;
  return base;
}
