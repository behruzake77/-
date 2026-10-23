import * as THREE from "three";
import type { NpcDefinition } from "@mir/shared";

function hex(s:string):THREE.Color{ try{return new THREE.Color(s);}catch{return new THREE.Color(0x888888);} }

export interface Npc3D{ id:string; group:THREE.Group; label:THREE.Sprite; def:NpcDefinition; pos:THREE.Vector3; yaw:number; wander?:THREE.Vector3[]; nextThink:number; target:THREE.Vector3|null; }

function labelSprite(name:string, role:string):THREE.Sprite{
  const c=document.createElement("canvas"); c.width=512; c.height=170;
  const ctx=c.getContext("2d")!; ctx.clearRect(0,0,512,170);
  ctx.fillStyle="rgba(18,15,12,0.88)"; ctx.beginPath(); (ctx as any).roundRect(12,12,488,132,18); ctx.fill();
  ctx.strokeStyle="rgba(217,164,65,0.14)"; ctx.lineWidth=1.2; ctx.stroke();
  ctx.fillStyle="#f1e4cb"; ctx.font="600 30px Cormorant Garamond, serif"; ctx.fillText(name,22,62);
  ctx.fillStyle="rgba(241,228,203,0.62)"; ctx.font="500 18px Inter, sans-serif"; ctx.fillText(role,22,96);
  ctx.fillStyle="#d9a441"; ctx.beginPath(); ctx.arc(472,30,7,0,Math.PI*2); ctx.fill();
  const tex=new THREE.CanvasTexture(c); (tex as any).colorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true, depthWrite:false })); s.scale.set(3.05,1.02,1); s.position.set(0,2.22,0); return s;
}

/* ---------- realistic human builder — Blender topology logic ---------- */
function buildHuman(def: NpcDefinition): THREE.Group {
  const fig=new THREE.Group();
  const skinCol=hex(def.look.skin), hairCol=hex(def.look.hair), coatCol=hex(def.look.coat), coatAltCol=hex(def.look.coatAlt), accentCol=hex(def.look.accent??"#c9a26a");
  const height=def.look.height??1.7, scale=height/1.7;

  // materials — PBR cloth, skin SSS approximation
  const skinMat=new THREE.MeshStandardMaterial({ color: skinCol, roughness:0.48, metalness:0.0 });
  const skinMat2=new THREE.MeshStandardMaterial({ color: skinCol.clone().multiplyScalar(0.92), roughness:0.52 });
  const coatMat=new THREE.MeshStandardMaterial({ color: coatCol, roughness:0.82, metalness:0.02 });
  const coatInnerMat=new THREE.MeshStandardMaterial({ color: coatAltCol, roughness:0.88 });
  const pantsMat=new THREE.MeshStandardMaterial({ color: coatAltCol.clone().multiplyScalar(0.72), roughness:0.86 });
  const shoeMat=new THREE.MeshStandardMaterial({ color:0x1e1a16, roughness:0.42, metalness:0.08 });
  const hairMat=new THREE.MeshStandardMaterial({ color: hairCol, roughness:0.94, metalness:0.0 });

  // shadow contact
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(0.45*scale,16), new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.18, depthWrite:false }));
  shadow.rotation.x=-Math.PI/2; shadow.position.y=0.02; fig.add(shadow);

  if(def.id==="musya"){
    // cat — realistic: body ellipse, head, ears, tail, whiskers
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.23,0.56,4,10), new THREE.MeshStandardMaterial({ color:0x9aa0a6, roughness:0.92 }));
    body.rotation.z=Math.PI/2; body.position.set(0,0.42,0); body.castShadow=true; fig.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.23,12,9), new THREE.MeshStandardMaterial({ color:0x8f96a0, roughness:0.88 })); head.position.set(0.46,0.60,0); head.castShadow=true; fig.add(head);
    const earL=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.12,6), hairMat); earL.position.set(0.48,0.78,0.08); earL.rotation.z=0.12; fig.add(earL);
    const earR=earL.clone(); earR.position.set(0.48,0.78,-0.08); fig.add(earR);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(0.028,6,5), new THREE.MeshStandardMaterial({ color:0xd9a441, emissive:0x2a1f0a, emissiveIntensity:0.3 })); eye.position.set(0.58,0.62,0.08); fig.add(eye);
    const eye2=eye.clone(); eye2.position.set(0.58,0.62,-0.08); fig.add(eye2);
    const tail=new THREE.Mesh(new THREE.CapsuleGeometry(0.07,0.5,4,8), new THREE.MeshStandardMaterial({ color:0x7f868f })); tail.position.set(-0.42,0.48,0); tail.rotation.z=0.68; fig.add(tail);
    // paws
    for(let z of [-0.12,0.12]){
      const paw=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,5), new THREE.MeshStandardMaterial({ color:0x7f868f })); paw.position.set(0.32,0.12,z); paw.scale.set(1,0.6,1); fig.add(paw);
    }
    return fig;
  }

  // --- torso: coat with lapels, waist taper, buttons ---
  // base torso box with bevel via small additional boxes for lapels
  const torsoH=0.68*scale, torsoW=0.56*scale;
  const torso=new THREE.Mesh(new THREE.BoxGeometry(torsoW, torsoH, 0.32*scale), coatMat);
  torso.position.set(0,1.07*scale,0); torso.castShadow=true; fig.add(torso);
  // waist taper visual — inner darker strip at sides
  const sideL=new THREE.Mesh(new THREE.BoxGeometry(0.04, torsoH*0.92, 0.33*scale), coatInnerMat); sideL.position.set(-torsoW/2+0.02,1.07*scale,0); fig.add(sideL);
  const sideR=sideL.clone(); sideR.position.set(torsoW/2-0.02,1.07*scale,0); fig.add(sideR);
  // lapels
  const lapelGeo=new THREE.BoxGeometry(0.14*scale,0.28*scale,0.015);
  const lapL=new THREE.Mesh(lapelGeo, new THREE.MeshStandardMaterial({ color: coatCol.clone().multiplyScalar(1.08), roughness:0.76 })); lapL.position.set(-0.11*scale,1.28*scale,0.17*scale); lapL.rotation.z=0.42; lapL.rotation.y=-0.12; fig.add(lapL);
  const lapR=lapL.clone(); lapR.position.set(0.11*scale,1.28*scale,0.17*scale); lapR.rotation.z=-0.42; lapR.rotation.y=0.12; fig.add(lapR);
  // buttons 3
  for(let i=0;i<3;i++){
    const btn=new THREE.Mesh(new THREE.CylinderGeometry(0.018*scale,0.018*scale,0.008,8), new THREE.MeshStandardMaterial({ color: accentCol, roughness:0.32, metalness:0.45 }));
    btn.rotation.x=Math.PI/2; btn.position.set(0, (1.22 - i*0.14)*scale, 0.167*scale); fig.add(btn);
  }
  // collar
  const collar=new THREE.Mesh(new THREE.BoxGeometry(0.28*scale,0.08*scale,0.04), coatInnerMat); collar.position.set(0,1.40*scale,0.12*scale); collar.rotation.x=0.18; fig.add(collar);
  // pocket
  const pocket=new THREE.Mesh(new THREE.BoxGeometry(0.14*scale,0.12*scale,0.015), coatMat); pocket.position.set(-0.14*scale,1.02*scale,0.165*scale); fig.add(pocket);

  // scarf / bag / glasses handled after arms

  // --- head + neck ---
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.08*scale,0.09*scale,0.14*scale,8), skinMat2); neck.position.set(0,1.46*scale,0); fig.add(neck);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.215*scale,14,11), skinMat); head.position.set(0,1.65*scale,0); head.castShadow=true; fig.add(head);
  // jaw
  const jaw=new THREE.Mesh(new THREE.SphereGeometry(0.13*scale,8,6), skinMat2); jaw.position.set(0,1.54*scale,0.06*scale); jaw.scale.set(1,0.62,0.82); fig.add(jaw);
  // eyes
  const eyeWhite=new THREE.Mesh(new THREE.SphereGeometry(0.032*scale,6,5), new THREE.MeshStandardMaterial({ color:0xf5f0e0 })); eyeWhite.position.set(-0.07*scale,1.68*scale,0.16*scale); eyeWhite.scale.set(1,0.82,0.62); fig.add(eyeWhite);
  const eyeWhiteR=eyeWhite.clone(); eyeWhiteR.position.set(0.07*scale,1.68*scale,0.16*scale); fig.add(eyeWhiteR);
  const irisL=new THREE.Mesh(new THREE.SphereGeometry(0.015*scale,6,5), new THREE.MeshStandardMaterial({ color:0x3a5a7a })); irisL.position.set(-0.07*scale,1.68*scale,0.185*scale); fig.add(irisL);
  const irisR=irisL.clone(); irisR.position.set(0.07*scale,1.68*scale,0.185*scale); fig.add(irisR);
  // nose
  const nose=new THREE.Mesh(new THREE.CapsuleGeometry(0.018*scale,0.045*scale,4,6), skinMat2); nose.position.set(0,1.64*scale,0.20*scale); nose.rotation.x=Math.PI/2; fig.add(nose);
  // mouth
  const mouth=new THREE.Mesh(new THREE.BoxGeometry(0.06*scale,0.012*scale,0.01), new THREE.MeshStandardMaterial({ color:0x7a4a3e })); mouth.position.set(0,1.60*scale,0.205*scale); fig.add(mouth);

  // hair — strands as capsules + volume
  const hairGroup=new THREE.Group();
  if(def.look.hairStyle==="bun"){
    const cap=new THREE.Mesh(new THREE.SphereGeometry(0.225*scale,12,9), hairMat); cap.position.set(0,1.77*scale,0); cap.scale.set(1,0.72,1); hairGroup.add(cap);
    const bun=new THREE.Mesh(new THREE.SphereGeometry(0.13*scale,10,7), hairMat); bun.position.set(0,1.74*scale,-0.18*scale); hairGroup.add(bun);
    // bun pin
    const pin=new THREE.Mesh(new THREE.CylinderGeometry(0.008*scale,0.008*scale,0.16*scale,6), new THREE.MeshStandardMaterial({ color:0xc9a26a, metalness:0.6 })); pin.rotation.z=Math.PI/2; pin.position.set(0,1.74*scale,-0.18*scale); hairGroup.add(pin);
  } else if(def.look.hairStyle==="beanie"){
    const cap=new THREE.Mesh(new THREE.SphereGeometry(0.23*scale,12,9), hairMat); cap.position.set(0,1.78*scale,0); cap.scale.set(1,0.68,1); hairGroup.add(cap);
    const beanie=new THREE.Mesh(new THREE.CylinderGeometry(0.235*scale,0.235*scale,0.16*scale,12), new THREE.MeshStandardMaterial({ color: accentCol, roughness:0.88 })); beanie.position.set(0,1.84*scale,0); hairGroup.add(beanie);
    const pom=new THREE.Mesh(new THREE.SphereGeometry(0.05*scale,6,5), new THREE.MeshStandardMaterial({ color: accentCol })); pom.position.set(0,1.93*scale,0); hairGroup.add(pom);
  } else if(def.look.hairStyle==="short"){
    const cap=new THREE.Mesh(new THREE.SphereGeometry(0.225*scale,12,9), hairMat); cap.position.set(0,1.80*scale,-0.02*scale); cap.scale.set(1,0.62,1); hairGroup.add(cap);
    // side fade detail
    const side=new THREE.Mesh(new THREE.BoxGeometry(0.04*scale,0.12*scale,0.18*scale), hairMat); side.position.set(-0.18*scale,1.72*scale,0); hairGroup.add(side);
    const sideR=side.clone(); sideR.position.set(0.18*scale,1.72*scale,0); hairGroup.add(sideR);
  } else if(def.look.hairStyle==="bob"){
    const cap=new THREE.Mesh(new THREE.SphereGeometry(0.24*scale,12,9), hairMat); cap.position.set(0,1.78*scale,0); cap.scale.set(1,0.78,1); hairGroup.add(cap);
    const sideL=new THREE.Mesh(new THREE.CapsuleGeometry(0.06*scale,0.22*scale,4,6), hairMat); sideL.position.set(-0.19*scale,1.66*scale,0.02*scale); sideL.rotation.z=0.12; hairGroup.add(sideL);
    const sideR=sideL.clone(); sideR.position.set(0.19*scale,1.66*scale,0.02*scale); sideR.rotation.z=-0.12; hairGroup.add(sideR);
    // bangs
    const bangs=new THREE.Mesh(new THREE.BoxGeometry(0.32*scale,0.08*scale,0.06*scale), hairMat); bangs.position.set(0,1.73*scale,0.16*scale); bangs.rotation.x=0.35; hairGroup.add(bangs);
  } else if(def.look.hairStyle==="curly"){
    for(let i=0;i<8;i++){
      const curl=new THREE.Mesh(new THREE.SphereGeometry(0.06*scale+Math.random()*0.02,5,4), hairMat);
      curl.position.set((Math.random()-0.5)*0.42*scale, 1.76*scale+Math.random()*0.08*scale, (Math.random()-0.5)*0.28*scale); hairGroup.add(curl);
    }
  } else { // long, cap, bald etc
    const cap=new THREE.Mesh(new THREE.SphereGeometry(0.23*scale,12,9), hairMat); cap.position.set(0,1.79*scale,0); cap.scale.set(1,0.68,1); hairGroup.add(cap);
    if(def.look.hairStyle==="long"){
      const longL=new THREE.Mesh(new THREE.CapsuleGeometry(0.07*scale,0.42*scale,4,6), hairMat); longL.position.set(-0.16*scale,1.55*scale,-0.06*scale); longL.rotation.z=0.12; hairGroup.add(longL);
      const longR=longL.clone(); longR.position.set(0.16*scale,1.55*scale,-0.06*scale); longR.rotation.z=-0.12; hairGroup.add(longR);
    }
    if(def.look.hairStyle==="bald"){
      hairGroup.clear(); // no hair, show scalp
      const scalp=new THREE.Mesh(new THREE.SphereGeometry(0.215*scale,10,8), skinMat2); scalp.position.set(0,1.78*scale,0); scalp.scale.set(1,0.42,1); fig.add(scalp);
    }
  }
  fig.add(hairGroup);

  // arms — upper + forearm + hand
  function arm(side: number){ // -1 left, 1 right
    const armG=new THREE.Group(); armG.position.set(side*0.32*scale,1.28*scale,0);
    const upper=new THREE.Mesh(new THREE.CapsuleGeometry(0.07*scale,0.28*scale,4,8), coatMat); upper.position.set(0,-0.16*scale,0); upper.castShadow=true; armG.add(upper);
    const fore=new THREE.Mesh(new THREE.CapsuleGeometry(0.055*scale,0.26*scale,4,8), skinMat); fore.position.set(0,-0.44*scale,0.04*scale); armG.add(fore);
    const hand=new THREE.Mesh(new THREE.SphereGeometry(0.062*scale,6,5), skinMat); hand.position.set(0,-0.62*scale,0.04*scale); hand.scale.set(1,0.72,1); armG.add(hand);
    // sleeve cuff
    const cuff=new THREE.Mesh(new THREE.CylinderGeometry(0.065*scale,0.068*scale,0.04*scale,8), coatInnerMat); cuff.position.set(0,-0.32*scale,0); armG.add(cuff);
    return armG;
  }
  const armL=arm(-1), armR=arm(1);
  // natural pose slight bend
  armL.rotation.z=0.12; armL.rotation.x=0.08; armR.rotation.z=-0.12; armR.rotation.x=0.08;
  fig.add(armL); fig.add(armR);

  // legs — pants with seam, shoes
  function leg(side:number){
    const legG=new THREE.Group(); legG.position.set(side*0.13*scale,0.72*scale,0);
    const thigh=new THREE.Mesh(new THREE.CapsuleGeometry(0.105*scale,0.42*scale,4,8), pantsMat); thigh.position.set(0,-0.22*scale,0); thigh.castShadow=true; legG.add(thigh);
    const shin=new THREE.Mesh(new THREE.CapsuleGeometry(0.09*scale,0.38*scale,4,8), pantsMat); shin.position.set(0,-0.62*scale,0.02*scale); legG.add(shin);
    // seam line
    const seam=new THREE.Mesh(new THREE.BoxGeometry(0.012*scale,0.72*scale,0.01), new THREE.MeshStandardMaterial({ color: pantsMat.color.clone().multiplyScalar(0.82) })); seam.position.set(0,-0.42*scale,0.06*scale); legG.add(seam);
    // shoe
    const shoe=new THREE.Mesh(new THREE.BoxGeometry(0.14*scale,0.09*scale,0.26*scale), shoeMat); shoe.position.set(0,-0.84*scale,0.04*scale); shoe.castShadow=true; legG.add(shoe);
    const sole=new THREE.Mesh(new THREE.BoxGeometry(0.145*scale,0.022*scale,0.27*scale), new THREE.MeshStandardMaterial({ color:0x3a352f })); sole.position.set(0,-0.89*scale,0.04*scale); legG.add(sole);
    return legG;
  }
  const legL=leg(-1), legR=leg(1); fig.add(legL); fig.add(legR);

  // accessories — scarf / glasses / bag / apron etc with realistic geo
  if(def.look.accessory==="scarf"){
    const scarfMat=new THREE.MeshStandardMaterial({ color: accentCol, roughness:0.92, side:THREE.DoubleSide });
    const scarf=new THREE.Mesh(new THREE.PlaneGeometry(0.22*scale,0.48*scale), scarfMat); scarf.position.set(0,1.18*scale,0.175*scale); scarf.rotation.x=0.08; fig.add(scarf);
    const tassel=new THREE.Mesh(new THREE.BoxGeometry(0.06*scale,0.08*scale,0.015), scarfMat); tassel.position.set(0.05*scale,0.92*scale,0.18*scale); fig.add(tassel);
  } else if(def.look.accessory==="glasses"){
    const frm=new THREE.MeshStandardMaterial({ color:0x181818, roughness:0.32, metalness:0.22 });
    [-0.075,0.075].forEach(off=>{
      const rim=new THREE.Mesh(new THREE.TorusGeometry(0.062*scale,0.008*scale,6,12), frm);
      rim.position.set(off*scale,1.68*scale,0.195*scale); rim.rotation.y=Math.PI/2; fig.add(rim);
      const lens=new THREE.Mesh(new THREE.CircleGeometry(0.055*scale,10), new THREE.MeshPhysicalMaterial({ color:0xd8e8f8, transparent:true, opacity:0.22, roughness:0.06 }));
      lens.position.set(off*scale,1.68*scale,0.205*scale); lens.rotation.y=0; fig.add(lens);
    });
    const bridge=new THREE.Mesh(new THREE.BoxGeometry(0.03*scale,0.012*scale,0.01), frm); bridge.position.set(0,1.68*scale,0.195*scale); fig.add(bridge);
    const armL=new THREE.Mesh(new THREE.BoxGeometry(0.14*scale,0.012*scale,0.012*scale), frm); armL.position.set(-0.15*scale,1.68*scale,0.12*scale); armL.rotation.y=0.32; fig.add(armL);
    const armRG=armL.clone(); armRG.position.set(0.15*scale,1.68*scale,0.12*scale); armRG.rotation.y=-0.32; fig.add(armRG);
  } else if(def.look.accessory==="bag"){
    const bag=new THREE.Group(); bag.position.set(0.30*scale,0.98*scale,-0.14*scale); bag.rotation.y=-0.22;
    const body=new THREE.Mesh(new THREE.BoxGeometry(0.32*scale,0.38*scale,0.12*scale), new THREE.MeshStandardMaterial({ color:0x3d2a16, roughness:0.68 })); body.castShadow=true; bag.add(body);
    const flap=new THREE.Mesh(new THREE.BoxGeometry(0.33*scale,0.14*scale,0.015), new THREE.MeshStandardMaterial({ color:0x5a3a1a })); flap.position.set(0,0.08*scale,0.065*scale); flap.rotation.x=0.12; bag.add(flap);
    const buckle=new THREE.Mesh(new THREE.BoxGeometry(0.04*scale,0.04*scale,0.02), new THREE.MeshStandardMaterial({ color:0xc9a26a, metalness:0.72, roughness:0.32 })); buckle.position.set(0,0.04*scale,0.075*scale); bag.add(buckle);
    const strap=new THREE.Mesh(new THREE.CylinderGeometry(0.01*scale,0.01*scale,0.62*scale,6), new THREE.MeshStandardMaterial({ color:0x2a1a0a })); strap.position.set(0,0.32*scale,0); strap.rotation.z=0.32; bag.add(strap);
    fig.add(bag);
  } else if(def.look.accessory==="apron"){
    const apron=new THREE.Mesh(new THREE.PlaneGeometry(0.42*scale,0.62*scale), new THREE.MeshStandardMaterial({ color:0xe8e0cc, side:THREE.DoubleSide })); apron.position.set(0,0.95*scale,0.17*scale); fig.add(apron);
  } else if(def.look.accessory==="vest"){
    const vest=new THREE.Mesh(new THREE.BoxGeometry(0.42*scale,0.52*scale,0.04), new THREE.MeshStandardMaterial({ color:0x4a5a44 })); vest.position.set(0,1.08*scale,0.16*scale); fig.add(vest);
  }

  // slight fabric AO at armpits
  const ao1=new THREE.Mesh(new THREE.SphereGeometry(0.11*scale,6,5), new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.07, depthWrite:false })); ao1.position.set(-0.22*scale,1.12*scale,0); ao1.scale.set(1,0.6,1); fig.add(ao1);
  const ao2=ao1.clone(); ao2.position.set(0.22*scale,1.12*scale,0); fig.add(ao2);

  return fig;
}

export function createNpc3D(def: NpcDefinition, at: THREE.Vector3, facing?: string): Npc3D {
  const g=new THREE.Group(); g.name=`npc-${def.id}`; g.position.copy(at);
  const fig=buildHuman(def); fig.position.y=0; g.add(fig);
  const lbl=labelSprite(def.shortNameRu??def.nameRu, def.roleRu); g.add(lbl);
  const star=new THREE.Mesh(new THREE.CircleGeometry(0.13,5), new THREE.MeshBasicMaterial({ color:0xd9a441, transparent:true, opacity:0.0 })); star.position.set(0,2.58,0); g.add(star);
  const yawInit=facing==="left"?-Math.PI/2 : facing==="right"?Math.PI/2 : facing==="up"?Math.PI : 0;
  g.rotation.y=yawInit;
  return { id:def.id, group:g, label:lbl, def, pos:at.clone(), yaw:yawInit, nextThink:0, target:null };
}

export function updateNpcs(npcs: Npc3D[], dt:number, time:number, colliders:any[], playerPos:THREE.Vector3): void{
  for(const npc of npcs){
    // breathing + idle sway
    const fig=npc.group.children[0] as THREE.Group; if(fig) fig.position.y=Math.sin(time*0.85 + npc.pos.x)*0.012;
    if(npc.wander && npc.wander.length>0){
      if(!npc.target || time>npc.nextThink){
        npc.target=npc.wander[Math.floor(Math.random()*npc.wander.length)].clone(); npc.nextThink=time+5+Math.random()*6;
      }
      if(npc.target){
        const to=npc.target.clone().sub(npc.group.position); to.y=0; const d=to.length();
        if(d>0.18){
          to.normalize().multiplyScalar(0.68*dt);
          const nxt=npc.group.position.clone().add(to); npc.group.position.copy(nxt); npc.pos.copy(nxt);
          npc.yaw=Math.atan2(to.x,to.z); npc.group.rotation.y=THREE.MathUtils.lerp(npc.group.rotation.y, npc.yaw, 0.14);
          if(fig) fig.rotation.z=Math.sin(time*4.2)*0.04;
        } else npc.target=null;
      }
    } else {
      npc.group.rotation.y=npc.yaw + Math.sin(time*0.38 + npc.pos.z)*0.05;
    }
    const dist=npc.group.position.distanceTo(playerPos);
    if(dist<2.7){
      const toP=new THREE.Vector3().subVectors(playerPos, npc.group.position); toP.y=0;
      if(toP.lengthSq()>1e-6){ const ty=Math.atan2(toP.x,toP.z); npc.group.rotation.y=THREE.MathUtils.lerp(npc.group.rotation.y, ty, 0.075); }
    }
  }
}
