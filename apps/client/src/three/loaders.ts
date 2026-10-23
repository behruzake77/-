import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Blender → лойиҳа кўчириш учун ёрдамчи.
 * 1. Blender да File → Export → glTF 2.0 (.glb) → /public/models/имя.glb
 * 2. Бу функцияни чақир:
 *    loadGLB(group, '/models/имя.glb', fallbackMesh, { pos, scale, rotY })
 * Агар файл топилмаса fallback (процедур) қолади — ўйин бузилмайди.
 */
const loader = new GLTFLoader();
const cache = new Map<string, THREE.Group>();

export function loadGLB(
  parent: THREE.Group,
  url: string,
  fallback: THREE.Group | THREE.Mesh | null,
  opts?: { pos?: THREE.Vector3; scale?: number | THREE.Vector3; rotY?: number; castShadow?: boolean },
): void {
  // keep fallback visible until glb loads
  if (fallback && !parent.children.includes(fallback as any)) {
    parent.add(fallback as any);
  }

  if (cache.has(url)) {
    const clone = (cache.get(url)!.clone(true) as THREE.Group);
    if (fallback) parent.remove(fallback as any);
    place(clone, opts);
    parent.add(clone);
    return;
  }

  loader.load(
    url,
    (gltf) => {
      const root = gltf.scene as THREE.Group;
      root.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.castShadow = opts?.castShadow !== false;
          obj.receiveShadow = true;
          // Blender Principled BSDF → Three MeshStandardPhysical жуда яқин, қўшимча тўғрилаш шарт эмас
          if (obj.material && obj.material.isMeshStandardMaterial) {
            obj.material.needsUpdate = true;
          }
        }
      });
      // нормализация: Blender экспорти 1м = 1 unit, лекин баъзи моделлар катта/кичик — scale билан тўғрила
      const box = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3(); box.getSize(size);
      // агар модел 10м дан катта бўлса, автоматик кичрайтир (масалан Sketchfab)
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 8 && !opts?.scale) {
        const s = 2 / maxDim;
        root.scale.setScalar(s);
      }
      cache.set(url, root.clone(true) as THREE.Group);
      if (fallback) parent.remove(fallback as any);
      place(root, opts);
      parent.add(root);
    },
    undefined,
    () => {
      // хато — fallback қолади, консолга ёзамиз холос
      console.warn(`[MIR] GLB topilmadi: ${url} — fallback ishlatildi. Blender dan /public/models ga export qiling.`);
    },
  );
}

function place(g: THREE.Group, opts?: { pos?: THREE.Vector3; scale?: number | THREE.Vector3; rotY?: number }) {
  if (opts?.pos) g.position.copy(opts.pos);
  if (opts?.scale !== undefined) {
    if (typeof opts.scale === "number") g.scale.setScalar(opts.scale);
    else g.scale.copy(opts.scale as THREE.Vector3);
  }
  if (opts?.rotY !== undefined) g.rotation.y = opts.rotY;
}
