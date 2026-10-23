import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useGame } from "../state/store";
import { ZONES, activeObjectiveMarkers, NPC_BY_ID } from "@mir/shared";
import type { ZoneId } from "@mir/shared";
import { buildGenericZone, type ZoneWorld } from "./world3d";
import { createPlayer, movePlayer, playerEye, setPlayerPos } from "./player";
import { createInput } from "./input";
import { createNpc3D, updateNpcs, type Npc3D } from "./npcs3d";
import { sfx } from "../audio/ambience";

let texLoader: THREE.TextureLoader | null = null;
function getLoader(): THREE.TextureLoader {
  if (!texLoader) texLoader = new THREE.TextureLoader();
  return texLoader;
}

export function ThreeCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<ZoneId>("courtyard");

  useEffect(() => {
    const host = hostRef.current!;
    if (!host) return;
    let cancelled = false;

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance", stencil: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";

    // scene + camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1816);
    scene.fog = new THREE.Fog(0x1f1d1c, 22, 58);

    const camera = new THREE.PerspectiveCamera(58, host.clientWidth / host.clientHeight, 0.1, 220);
    camera.position.set(0, 7, 10);

    // lighting fallback ambient
    // world3d will add per-zone lights

    // player
    const player = createPlayer();
    scene.add(player.group);

    // npcs
    let npcs: Npc3D[] = [];

    // world holder
    let world: ZoneWorld | null = null;
    let worldGroup: THREE.Group | null = null;

    // input
    const inputCtrl = createInput(renderer.domElement);
    const input = inputCtrl.state;

    // camera orbit state
    let camYaw = 0; // around player
    let camPitch = 18; // deg
    let camDist = 7.2;
    const clampPitch = (v: number) => THREE.MathUtils.clamp(v, 8, 62);
    let targetCamDist = camDist;

    // minimap canvas ref handled outside? we do inline
    let lastZone: ZoneId | null = null;

    // minimap element (overlay)
    const miniWrap = document.createElement("div");
    miniWrap.style.cssText = "position:absolute;right:16px;bottom:16px;width:132px;height:132px;border-radius:18px;overflow:hidden;border:1px solid rgba(241,228,203,0.12);background:rgba(18,15,12,0.82);backdrop-filter:blur(8px);z-index:5;pointer-events:none;box-shadow:0 12px 28px rgba(0,0,0,0.35);";
    const miniCanvas = document.createElement("canvas");
    miniCanvas.width = 264; miniCanvas.height = 264;
    miniCanvas.style.width = "100%"; miniCanvas.style.height = "100%"; miniCanvas.style.display = "block";
    miniWrap.appendChild(miniCanvas);
    host.appendChild(miniWrap);
    const mctx = miniCanvas.getContext("2d")!;

    // interaction helpers
    const store = useGame.getState();
    zoneRef.current = store.state.player.zone as ZoneId;

    function buildZone(zone: ZoneId, keepPos = false) {
      const prevPos = player.position.clone();
      const prevYaw = player.yaw;
      // clear previous
      if (worldGroup) {
        scene.remove(worldGroup);
        // dispose? keep simple
        worldGroup = null;
      }
      // remove npcs
      for (const n of npcs) scene.remove(n.group);
      npcs = [];

      const w = buildGenericZone(zone, getLoader());
      world = w;
      worldGroup = w.group;
      scene.add(worldGroup);

      // fog per zone
      if (zone === "courtyard" || zone === "street") {
        scene.fog = new THREE.Fog(0xc8d0dc, 24, 62);
        (scene.background as THREE.Color).setHex(0xd6dde8);
      } else if (zone === "apartment" || zone === "shop" || zone === "cafe" || zone === "dombyta") {
        scene.fog = null;
        (scene.background as THREE.Color).setHex(0xe9ddd0);
      } else if (zone === "metro") {
        scene.fog = new THREE.Fog(0x6b7280, 8, 28);
        (scene.background as THREE.Color).setHex(0x8d949e);
      }

      // spawn player
      if (!keepPos || !lastZone) {
        const sp = w.spawns["player"] ?? new THREE.Vector3(0, 0, 0);
        setPlayerPos(player, sp, zone === "street" ? Math.PI : 0);
        camYaw = player.yaw;
      } else {
        // keep pos but clamp inside new bounds? just reuse
        setPlayerPos(player, prevPos, prevYaw);
        camYaw = player.yaw;
      }

      // spawn NPCs — use shared zone definitions + fallback to world.spawns for 3D world
      // First try to spawn from ZONES placements (handles all zones, conditions ignored for MVP)
      const zoneDef: any = (ZONES as any)[zone];
      if (zoneDef?.npcs?.length) {
        const ZW = zoneDef.width ?? 1440;
        const ZH = zoneDef.height ?? 980;
        // helper to map 2D px like courtyard to 3D meters — match world3d px() scale
        const SCALE = 36;
        const CW = ZW / SCALE, CH = ZH / SCALE;
        const HW = CW/2, HH = CH/2;
        // for non-courtyard interiors, their local coords need centering — we use simple linear mapping:
        // for courtyard we use same mapping as world3d: -HW + px(pxX)
        // for interiors built as W×D boxes centred at 0, we lerp px→world with smaller scale roughly 86 px/m
        const isCourtyard = zone === "courtyard";
        for (const plc of zoneDef.npcs) {
          const def = NPC_BY_ID[plc.npcId as keyof typeof NPC_BY_ID];
          if (!def) continue;
          // skip conditional spawns that evaluate false — for MVP always show if no condition or condition passes with current state
          // we check evaluateCondition if present via shared? skip for now -> show
          let at: THREE.Vector3;
          if (isCourtyard) {
            const px = (n:number)=> n / 36;
            at = new THREE.Vector3(-HW + px(plc.x), 0, -HH + px(plc.y));
          } else {
            // interior: map placement px to centered box: approx W=12,D=9 -> use plc.x / ZW * W - W/2
            const W3 = zone === "street" ? 44 : 11;
            const D3 = zone === "street" ? 16 : 8;
            at = new THREE.Vector3((plc.x / ZW) * W3 - W3/2, 0, (plc.y / ZH) * D3 - D3/2);
          }
          const n = createNpc3D(def as any, at, plc.facing);
          // special: give sasha wander in courtyard
          if (def.id === "sasha" && isCourtyard) {
            const base = at.clone();
            n.wander = [new THREE.Vector3(-1.4,0,-0.9), new THREE.Vector3(1.2,0,0.2), new THREE.Vector3(0.5,0,1.3)].map(v=> base.clone().add(v));
          }
          npcs.push(n);
          scene.add(n.group);
        }
      } else {
        // fallback for zones built procedurally without ZONES npc list (courtyard procedural still has spawns)
        if (zone === "courtyard") {
          const lidiaPos = w.spawns["lidia"];
          const sashaPos = w.spawns["sasha"];
          const artyomPos = w.spawns["artyom"];
          const musyaPos = w.spawns["musya"];
          if (lidiaPos) npcs.push(createNpc3D(NPC_BY_ID["lidia"] as any, lidiaPos, "down"));
          if (sashaPos) {
            const n = createNpc3D(NPC_BY_ID["sasha"] as any, sashaPos, "left");
            n.wander = [new THREE.Vector3(-1.4,0,-0.9), new THREE.Vector3(1.2,0,0.2), new THREE.Vector3(0.5,0,1.3)].map(v=> sashaPos.clone().add(v));
            npcs.push(n);
          }
          if (artyomPos) npcs.push(createNpc3D(NPC_BY_ID["artyom"] as any, artyomPos, "left"));
          if (musyaPos) npcs.push(createNpc3D(NPC_BY_ID["musya"] as any, musyaPos, "down"));
          for (const n of npcs) if (!scene.children.includes(n.group)) scene.add(n.group);
        } else if (zone === "shop") {
          const nina = (NPC_BY_ID as any)["nina"];
          if (nina) {
            const p = new THREE.Vector3(0, 0, -1.2);
            const n = createNpc3D(nina, p, "down");
            npcs.push(n);
            scene.add(n.group);
          }
        } else if (zone === "cafe") {
          const kostya = (NPC_BY_ID as any)["kostya"];
          if (kostya) {
            const p = new THREE.Vector3(-1.8, 0, -1.6);
            const n = createNpc3D(kostya, p, "down");
            npcs.push(n); scene.add(n.group);
          }
          const anna = (NPC_BY_ID as any)["anna"];
          // anna appears later per conditions — show if quest condition met or always for demo
          if (anna) {
            const p2 = new THREE.Vector3(1.6,0,1.1);
            const n2 = createNpc3D(anna, p2, "left");
            npcs.push(n2); scene.add(n2.group);
          }
        } else if (zone === "metro") {
          const andrey = (NPC_BY_ID as any)["andrey"];
          if (andrey) {
            const p = new THREE.Vector3(0,0,-0.8);
            const n = createNpc3D(andrey, p, "down");
            npcs.push(n); scene.add(n.group);
          }
        } else if (zone === "dombyta") {
          const val = (NPC_BY_ID as any)["valentina"];
          if (val) {
            const p = new THREE.Vector3(0,0,-1.0);
            const n = createNpc3D(val, p, "down");
            npcs.push(n); scene.add(n.group);
          }
        }
      }
      // scales already Y up
      lastZone = zone;
      zoneRef.current = zone;
    }

    // initial build
    buildZone(zoneRef.current as ZoneId, false);

    // subscribe to zone changes
    const unsub = useGame.subscribe((next, prev) => {
      if (next.state.player.zone !== prev.state.player.zone) {
        buildZone(next.state.player.zone as ZoneId, false);
        sfx("tap");
      }
    });

    // resize
    const onResize = () => {
      if (cancelled) return;
      const w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(host);
    window.addEventListener("resize", onResize);

    // pointer lock / wheel handling for camDist
    renderer.domElement.addEventListener("wheel", (e: WheelEvent) => {
      targetCamDist = THREE.MathUtils.clamp(targetCamDist + Math.sign(e.deltaY)*0.55, 3.2, 13.5);
    }, { passive: true });

    // click to interact: raycast to triggers via proximity; also click on NPC mesh
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let lastInteractAt = 0;
    renderer.domElement.addEventListener("click", (e: MouseEvent) => {
      // ignore if we dragged camera significantly recent
      const now = performance.now();
      if (now - lastInteractAt < 320) return;
      // if dialogue/panel open, ignore
      const st = useGame.getState();
      if (st.dialogue || st.panel) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((e.clientX-rect.left)/rect.width)*2-1, -((e.clientY-rect.top)/rect.height)*2+1);
      raycaster.setFromCamera(pointer, camera);
      const allMeshes: THREE.Object3D[] = [];
      for (const n of npcs) allMeshes.push(n.group);
      // quick raycast against npc groups (bounding)
      const hits = raycaster.intersectObjects(allMeshes, true);
      if (hits.length > 0) {
        // walk to npc if far?
        // find nearest npc within 3.5m click projection
        let best: Npc3D | null = null;
        let bestDist = Infinity;
        for (const n of npcs) {
          const d = n.group.position.distanceTo(player.position);
          // check if ray hit is near that npc's screen projection? simplified: use 3d distance + ray hit proximity
          const hitDist = hits[0].distance;
          // approximate: if hit object is descendant of n.group, pick it
          let obj: THREE.Object3D | null = hits[0].object;
          while (obj) { if (obj === n.group) { best = n; bestDist = d; break; } obj = obj.parent; }
          if (best) break;
        }
        if (best && bestDist < 3.5) {
          const npcId = best.id;
          // trigger dialogue via store.interact with npcId? Interactions table expects npc trigger via proximity to placement.
          // We directly try store.interact with closest trigger id containing npc id, else use dialogue id?
          // UseGame has interact by interactionId and also NPC dialogue via store.interact semantics in engine?
          // For NPC talk: we call store.dispatch TALK? Let's use store.interact with synthetic id then fallback to dispatch.
          // Look up findNpcPlacement? Instead dispatch open dialogue
          const store2 = useGame.getState();
          // prefer store.interact with npc_<id> if exists, else manually start dialogue
          // Our engine: interacting with NPC uses interaction none? Actually Dialogues trigger via ZONES? We call interact with npc id? Let's try.
          // Evaluate NPC triggers: courtyard npcs have implicit talk via proximity? We'll just call choose path.
          // Direct: if npc has defaultDialogue, open it.
          const def = NPC_BY_ID[best.id as any];
          if (def?.defaultDialogue) {
            // useGame store has no direct talk, but interact with npc id may open dialogue via engine.findNpcPlacement
            // We'll use dispatch INTERACT with targetId = `npc:${best.id}` and let engine resolve.
            // Simpler: call store.interact(best.id) — engine will map? Let's try both.
            let done = false;
            try {
              store2.interact(best.id);
              done = true;
            } catch {}
            if (!done) {
              // fallback: dispatch open_dialogue
              (store2 as any).dispatch?.({ type: "TALK", npcId: best.id });
            }
            return;
          }
        }
      }
      // ground click to move: raycast to ground plane y=0
      raycaster.setFromCamera(pointer, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
      const pt = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, pt)) {
        // set walk target if within world bounds and not inside collider
        walkTarget.copy(pt);
        walkTarget.y = player.position.y;
        hasWalkTarget = true;
        // visual ring
        placeMarker(walkTarget);
      }
    });

    // walk target
    const walkTarget = new THREE.Vector3();
    let hasWalkTarget = false;
    const walkRing = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.44, 18), new THREE.MeshBasicMaterial({ color: 0xd9a441, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false }));
    walkRing.rotation.x = -Math.PI/2;
    walkRing.position.set(0, 0.03, 0);
    scene.add(walkRing);
    let ringAt = 0;
    function placeMarker(p: THREE.Vector3) {
      walkRing.position.set(p.x, 0.03, p.z);
      (walkRing.material as THREE.MeshBasicMaterial).opacity = 0.92;
      ringAt = performance.now();
    }

    // near detection throttled
    let lastNearKey = "";
    let lastNearAt = 0;

    // animation loop
    let raf = 0;
    const clock = new THREE.Clock();
    const tmpMove = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.033);
      const t = clock.elapsedTime;

      // camera orbit from input drag
      if (input.cameraDelta.lengthSq() > 0) {
        camYaw -= input.cameraDelta.x * 0.0032;
        camPitch = clampPitch(camPitch + input.cameraDelta.y * 0.08);
        input.cameraDelta.set(0,0);
        lastInteractAt = performance.now();
      }
      // lerp camDist
      camDist = THREE.MathUtils.lerp(camDist, targetCamDist, 0.08);

      // input movement: transform 2D input into world space relative to camera yaw
      let mvX = input.move.x;
      let mvY = input.move.y;
      // joystick is already normalized; from walkTarget override?
      let usingWalkTarget = false;
      if (hasWalkTarget) {
        const to = walkTarget.clone().sub(player.position);
        to.y = 0;
        const d = to.length();
        if (d < 0.28) {
          hasWalkTarget = false;
          mvX = 0; mvY = 0;
        } else {
          // steer towards target, autonomous walk
          const dir = to.normalize();
          // convert world dir to camera-relative input? Actually walkTarget movement is absolute world direction, ignore camera
          tmpMove.copy(dir).multiplyScalar(3.35 * dt);
          movePlayer(player, tmpMove, world?.colliders ?? []);
          player.group.position.y = 0;
          // face move dir
          const yaw = Math.atan2(dir.x, dir.z);
          player.yaw = THREE.MathUtils.lerp(player.yaw, yaw, 0.18);
          player.mesh.rotation.y = player.yaw;
          // align camera behind player slightly
          camYaw = THREE.MathUtils.lerp(camYaw, yaw, 0.02);
          usingWalkTarget = true;
          // animate legs for auto-walk
          {
            const legL = player.mesh.getObjectByName("legL") as any;
            const legR = player.mesh.getObjectByName("legR") as any;
            const armL = player.mesh.getObjectByName("armL") as any;
            const armR = player.mesh.getObjectByName("armR") as any;
            const s = Math.sin(t * 6.8);
            if(legL) legL.rotation.x = s*0.52;
            if(legR) legR.rotation.x = -s*0.52;
            if(armL) armL.rotation.x = -s*0.38;
            if(armR) armR.rotation.x = s*0.38;
          }
          // ring fade
          const age = performance.now() - ringAt;
          (walkRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.92 - age * 0.00055);
        }
      }
      if (!usingWalkTarget) {
        // manual input
        if (mvX !== 0 || mvY !== 0) {
          // camera-relative movement: forward = cam direction projected
          const camDir = new THREE.Vector3();
          camera.getWorldDirection(camDir); camDir.y = 0; camDir.normalize();
          // but we have camYaw separately; use yaw for stable control even when camera lerping
          forward.set(Math.sin(camYaw), 0, Math.cos(camYaw));
          right.set(Math.cos(camYaw), 0, -Math.sin(camYaw));
          // Input: y is forward, x is strafe. In world: forward * y + right * x
          // But forward we defined as cam forward? Actually forward = sin(yaw), cos(yaw) = camera forward
          // So world move = forward * (-mvY?) Check: W should go forward (negative Z ???). In our world, north is -Z (facade north). Camera at south looking north, forward should be -Z? Let's test: yaw 0 → forward (0,0,1) (south). That's opposite of north. So we keep consistent: yaw 0 means facing +Z (south). But facade north is -Z. So initial camYaw 0 behind player facing north? Player at south edge facing north (yaw PI?) Let's recalibrate:
          // We set player yaw 0, camera behind = +Z. So camera should be south of player. forward for input should be camera look direction (north = -Z when behind). Our forward (sin, cos) at yaw 0 is (0,1) = south, which matches player facing south, not north. So we need to invert.
          // For third-person, W should move towards camera forward (where camera looks). Camera looks toward player from behind, so its forward is roughly opposite to player's facing. So input forward should be -forward? Simpler: define camFwd = vector from camera to player projected.
          // Let's compute properly: camFwd = normalized(player - camera) projected.
          const camToPlayer = player.position.clone().sub(camera.position); camToPlayer.y = 0;
          if (camToPlayer.lengthSq() > 1e-6) camToPlayer.normalize();
          const strafe = new THREE.Vector3(-camToPlayer.z, 0, camToPlayer.x);
          const speed = input.run ? 5.8 : 3.6;
          tmpMove.set(0,0,0);
          tmpMove.addScaledVector(camToPlayer, mvY * speed * dt);
          tmpMove.addScaledVector(strafe, mvX * speed * dt);
          movePlayer(player, tmpMove, world?.colliders ?? []);
          if (tmpMove.lengthSq() > 1e-6) {
            const targetYaw = Math.atan2(tmpMove.x, tmpMove.z);
            player.yaw = THREE.MathUtils.lerp(player.yaw, targetYaw, 0.16);
            player.mesh.rotation.y = player.yaw;
            // walk anim: legs + arms + bob (Blender walk cycle)
            const legL = player.mesh.getObjectByName("legL") as THREE.Group | null;
            const legR = player.mesh.getObjectByName("legR") as THREE.Group | null;
            const armL = player.mesh.getObjectByName("armL") as THREE.Group | null;
            const armR = player.mesh.getObjectByName("armR") as THREE.Group | null;
            const s = Math.sin(t * 7.2);
            const c = Math.cos(t * 7.2);
            if (legL) legL.rotation.x = s * 0.58;
            if (legR) legR.rotation.x = -s * 0.58;
            if (armL) armL.rotation.x = -s * 0.48;
            if (armR) armR.rotation.x = s * 0.48;
            // subtle bob on whole mesh but keep shadow not bobbing too much — bob only y
            const bob = Math.abs(Math.sin(t * 7.2)) * 0.045;
            // keep group y at 0, bob mesh slightly
            player.mesh.position.y = bob;
            // ensure group stays grounded
            player.group.position.y = 0;
            // clear walk target
            hasWalkTarget = false;
            (walkRing.material as THREE.MeshBasicMaterial).opacity *= 0.92;
          } else {
            const legL = player.mesh.getObjectByName("legL") as THREE.Group | null;
            const legR = player.mesh.getObjectByName("legR") as THREE.Group | null;
            const armL = player.mesh.getObjectByName("armL") as THREE.Group | null;
            const armR = player.mesh.getObjectByName("armR") as THREE.Group | null;
            if (legL) legL.rotation.x = THREE.MathUtils.lerp(legL.rotation.x, 0, 0.14);
            if (legR) legR.rotation.x = THREE.MathUtils.lerp(legR.rotation.x, 0, 0.14);
            if (armL) armL.rotation.x = THREE.MathUtils.lerp(armL.rotation.x, 0.08, 0.14);
            if (armR) armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, 0.08, 0.14);
            player.mesh.position.y = THREE.MathUtils.lerp(player.mesh.position.y, 0, 0.18);
            player.group.position.y = 0;
          }
        } else {
          player.mesh.position.y = THREE.MathUtils.lerp(player.mesh.position.y, 0, 0.16);
          // fade ring
          if ((walkRing.material as THREE.MeshBasicMaterial).opacity > 0.01) {
            const age = performance.now() - ringAt;
            (walkRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.92 - age*0.00055);
          }
          hasWalkTarget = false;
        }
      }

      // update NPCs
      if (npcs.length) updateNpcs(npcs, dt, t, world?.colliders ?? [], player.position);

      // camera follow — third-person orbit
      const eye = playerEye(player);
      const yawRad = camYaw;
      const pitchRad = THREE.MathUtils.degToRad(camPitch);
      const distXZ = camDist * Math.cos(pitchRad);
      const dy = camDist * Math.sin(pitchRad);
      const offX = Math.sin(yawRad) * distXZ;
      const offZ = Math.cos(yawRad) * distXZ;
      const desired = new THREE.Vector3(eye.x + offX, eye.y + dy, eye.z + offZ);
      // simple wall clip: ray from eye to desired, if hits collider, shorten
      let finalPos = desired.clone();
      // naive: check against colliders expanded by 0.35 using segment vs AABB
      // For now just lerp
      camera.position.lerp(finalPos, 0.13);
      camera.lookAt(eye.x, eye.y + 0.18, eye.z);

      // near / interact detection via triggers
      if (world && performance.now() - lastNearAt > 90) {
        lastNearAt = performance.now();
        let best: { id: string; dist: number; trigger: any } | null = null;
        let bestD = Infinity;
        for (const tr of world.triggers) {
          const d = player.position.distanceTo(tr.pos);
          // include player radius
          if (d - tr.radius < 0.85 && d < bestD) { bestD = d; best = { id: tr.id, dist: d, trigger: tr }; }
        }
        // also NPC proximity (within 1.9)
        let bestNpc: Npc3D | null = null;
        let bestNpcD = Infinity;
        for (const n of npcs) {
          const d = n.group.position.distanceTo(player.position);
          if (d < 2.0 && d < bestNpcD) { bestNpcD = d; bestNpc = n; }
        }
        type Near = { id: string; kind: "npc"|"object"|"exit"; labelRu: string; labelEn: string; npcId?: string; distance: number };
        let near: Near | null = null;
        if (bestNpc && (!best || bestNpcD < bestD + 0.1)) {
          near = { id: bestNpc.id, kind: "npc", labelRu: bestNpc.def.nameRu, labelEn: bestNpc.def.nameEn, npcId: bestNpc.id, distance: bestNpcD };
        } else if (best) {
          const tr = best.trigger;
          const isExit = !!tr.to;
          // lookup labels from ZONES interactions? We have tr.id like courtyard.entrance1.
          // Fallback label from trigger id
          let labelRu = tr.id;
          let labelEn = tr.id;
          // try to find via shared conditions? We don't have interaction registry with labels here — keep id split
          // We'll map known ids
          const labelMap: Record<string,string> = {
            "courtyard.entrance1": "Подъезд 1",
            "courtyard.entrance2": "Подъезд 2",
            "courtyard.mailboxes": "Почтовые ящики",
            "courtyard.board": "Доска объявлений",
            "courtyard.tree": "Берёза",
            "courtyard.bench": "Скамейка",
            "courtyard.playground": "Качели",
            "courtyard.puddle": "Лужа",
            "courtyard.arch": "Арка на улицу",
            "apartment.exit": "Выйти во двор",
            "street.courtyard": "Во двор",
            "street.shop": "Магазин «Продукты»",
            "street.cafe": "Кафе «Уют»",
            "street.metro": "Метро",
            "street.dombyta": "Дом быта",
            "shop.exit": "На улицу",
          };
          labelRu = labelMap[tr.id] ?? tr.id;
          labelEn = labelRu;
          near = { id: tr.id, kind: isExit ? "exit" : "object", labelRu, labelEn, distance: bestD };
        }
        // push to store if changed
        const key = near ? `${near.id}:${near.kind}` : "";
        if (key !== lastNearKey) {
          lastNearKey = key;
          // store.setNear is internal? useGame state has near field set via update? In MirScene it calls store internals via useGame.setState? Let's inspect store api.
          // The store has setNear? Check store.ts: we have private but exposed via? Let's look: store has `setNear`? Search.
          const st: any = useGame.getState();
          if (st.setNear) st.setNear(near);
          else if (st.setNearTarget) st.setNearTarget(near);
          else {
            // fallback direct patch
            useGame.setState({ near: near as any });
          }
        }
      }

      // quest markers via activeObjectiveMarkers? Show above NPC if they are objective
      try {
        const st = useGame.getState().state;
        const markers = activeObjectiveMarkers(st) as unknown as Map<string, { labelRu: string }>;
        for (const n of npcs) {
          const has = (markers as Map<string, unknown>).has(n.id) || (markers as Map<string, unknown>).has(`npc:${n.id}`);
          const star = n.group.children.find((c:any)=> c.isMesh && c.geometry?.type === "CircleGeometry") as THREE.Mesh | undefined;
          if (star) (star.material as THREE.MeshBasicMaterial).opacity = has ? 0.96 : 0.0;
          // also label scale pulse if active
          if (has) {
            n.label.material.opacity = 1.0;
            (n.label as any).scalePulse = ((n.label as any).scalePulse ?? 0) + dt*2;
          }
        }
      } catch {}

      // E to interact with near
      if (input.interact) {
        input.interact = false;
        const st: any = useGame.getState();
        const near = st.near as { id: string; kind: string; npcId?: string } | null;
        if (near) {
          if (near.kind === "npc" && near.npcId) {
            st.interact?.(near.npcId) ?? st.interact?.(near.id);
          } else {
            const tr = world?.triggers.find(t=>t.id===near.id);
            if (tr?.to) {
              // exit door — animate and switch zone
              sfx("good");
              useGame.getState().dispatch({ type: "TRAVEL", to: tr.to } as any) ?? useGame.getState().dispatch({ type: "MOVE", zone: tr.to } as any);
              // if dispatch not handling, manual:
              if (useGame.getState().state.player.zone !== tr.to) {
                // direct state mutation via engine? fallback via store private: set zone through dispatch fallback
                // Try travel via interact
                try { st.interact(near.id); } catch {}
                // If still not, force via setState for MVP
                const cur = useGame.getState().state;
                if (cur.player.zone !== tr.to) {
                  useGame.setState({ state: { ...cur, player: { ...cur.player, zone: tr.to } } } as any);
                  buildZone(tr.to, false);
                }
              }
            } else {
              st.interact?.(near.id);
            }
          }
        }
      }

      // minimap redraw
      if (world) {
        const W = miniCanvas.width, H = miniCanvas.height;
        mctx.clearRect(0,0,W,H);
        // bg
        mctx.fillStyle = "#15120f";
        mctx.fillRect(0,0,W,H);
        // grid
        mctx.strokeStyle = "rgba(241,228,203,0.06)";
        mctx.lineWidth = 1;
        for (let i=0;i<W;i+=32){ mctx.beginPath(); mctx.moveTo(i,0); mctx.lineTo(i,H); mctx.stroke(); }
        for (let i=0;i<H;i+=32){ mctx.beginPath(); mctx.moveTo(0,i); mctx.lineTo(W,i); mctx.stroke(); }
        // world bounds
        // map 3D (x -22..22, z -14..14) to canvas
        const mapX = (x:number)=> (x + 22)/44 * W;
        const mapZ = (z:number)=> (1 - (z + 14)/28) * H;
        // ground tint
        mctx.fillStyle = "rgba(155,150,135,0.42)";
        mctx.fillRect(mapX(-20), mapZ(14), mapX(20)-mapX(-20), mapZ(-14)-mapZ(14));
        // colliders as rects
        mctx.fillStyle = "rgba(111,80,68,0.72)";
        for (const b of world.colliders) {
          const x0 = mapX(b.min.x), x1 = mapX(b.max.x);
          const z0 = mapZ(b.max.z), z1 = mapZ(b.min.z); // invert?
          // actually mapZ with inverted: b.min.z (~ -14) → lower
          const y0 = mapZ(b.max.z), y1 = mapZ(b.min.z);
          mctx.fillRect(x0, y0, x1-x0, y1-y0);
        }
        // triggers
        for (const tr of world.triggers) {
          const x = mapX(tr.pos.x), y = mapZ(tr.pos.z);
          mctx.beginPath(); mctx.arc(x,y, tr.to ? 7 : 4.5, 0, Math.PI*2);
          mctx.fillStyle = tr.to ? "rgba(217,164,65,0.92)" : "rgba(241,228,203,0.78)";
          mctx.fill();
          mctx.strokeStyle = "rgba(18,15,12,0.9)"; mctx.lineWidth=1.2; mctx.stroke();
        }
        // npcs
        for (const n of npcs) {
          const x = mapX(n.group.position.x), y = mapZ(n.group.position.z);
          mctx.beginPath(); mctx.arc(x,y,5.2,0,Math.PI*2);
          mctx.fillStyle = n.id==="musya" ? "#9aa0a6" : "#d9a441";
          mctx.fill(); mctx.strokeStyle="rgba(0,0,0,0.55)"; mctx.lineWidth=1; mctx.stroke();
        }
        // player
        {
          const x = mapX(player.position.x), y = mapZ(player.position.z);
          mctx.beginPath(); mctx.arc(x,y,6,0,Math.PI*2);
          mctx.fillStyle="#f1e4cb"; mctx.fill();
          mctx.strokeStyle="#15120f"; mctx.lineWidth=2; mctx.stroke();
          // facing arrow
          const len = 14;
          mctx.beginPath();
          mctx.moveTo(x, y);
          mctx.lineTo(x + Math.sin(player.yaw)*len, y - Math.cos(player.yaw)*len);
          mctx.strokeStyle="#d9a441"; mctx.lineWidth=2.2; mctx.stroke();
        }
        // walk target
        if (hasWalkTarget) {
          const x = mapX(walkTarget.x), y = mapZ(walkTarget.z);
          mctx.beginPath(); mctx.arc(x,y,4,0,Math.PI*2);
          mctx.fillStyle="rgba(217,164,65,0.95)"; mctx.fill();
        }
        // border
        mctx.strokeStyle="rgba(241,228,203,0.12)"; mctx.lineWidth=2; mctx.strokeRect(0.5,0.5,W-1,H-1);
      }

      renderer.render(scene, camera);
    };
    animate();

    // cleanup
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      inputCtrl.dispose();
      unsub();
      try { host.removeChild(renderer.domElement); } catch {}
      try { host.removeChild(miniWrap); } catch {}
      renderer.dispose();
      // traverse dispose?
      scene.traverse((obj:any)=>{
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          if (Array.isArray(obj.material)) obj.material.forEach((m:any)=>m.dispose?.());
          else obj.material?.dispose?.();
        }
      });
    };
  }, []);

  return <div ref={hostRef} className="game-canvas game-canvas--3d" style={{ position:"absolute", inset:0, touchAction:"none" }} aria-hidden="true" />;
}
