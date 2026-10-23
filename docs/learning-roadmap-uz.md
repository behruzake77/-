# Blender + Three.js ни ўрганиб MIR лойиҳага кўчириш — қўлланма

> Сен айтган "сен ўрган кейин лойиҳамга кўчир" — бажардим. Пастда нимани ўргандим ва кодга қандай кўчирганим.

## 1. Нимани ўргандим

### Blender (моделлаш)
- **Interface**: Viewport, Edit Mode, Modifier, UV Editor
- **Soviet панельный дом**: Cube → Loop Cut → Extrude окна → Bevel 2см → Array 5 этаж
- **Материал**: Principled BSDF → Base Color (кирпич фото), Roughness 0.85, Normal Map (кирпич рельеф)
- **UV**: Smart UV Project → Brick texture 512x512 (биз кодда `makeBrickTexture()` билан Canvas да ясаймиз — Blender текстураси билан бир хил)
- **Экспорт**: File → Export → glTF 2.0 (.glb) | ✅ Apply Transform, ✅ +Y Up, ✅ Compression

### Three.js (код)
- **PBR**: `MeshStandardMaterial` ↔ Blender Principled — бир хил
- **Текстура**: `CanvasTexture` → procedural кирпич/асфальт (Blender procedural nodes ўрни)
- **Юклаш**: `GLTFLoader` → `/public/models/*.glb` → `castShadow/receiveShadow`
- ** fallback**: агар glb йўқ бўлса процедурный модел қолади — ўйин бузилмайди (`loaders.ts`)

## 2. Лойиҳага қандай кўчирдим

### Файллар
- `apps/client/src/three/world3d.ts` — **тўлиқ қайта ёзилди**:
  - `makeBrickTexture()` — mortar + chip + rain streaks (Blender Brick Texture node)
  - `buildSovietFacade()` — панель стык, 5 этаж, окно (рама/стекло/подоконник/занавеска), балкон (плита+перила+хлам), водосток, кондиционер
  - `benchReal()` — 5 рейка + чугун ножка + кольцо декор
  - `birch` — bark Canvas + ветка цилиндр + крона Icosa + birdhouse
  - `sandbox`, `lampReal`, `bins`, `bike`, `puddle` — ҳаммаси Blender мантиғида
- `apps/client/src/three/npcs3d.ts` — **одам капсула эмас**: торс Box + лацкан/пуговица, бош (кўз, ирис, нос, рот), соч (боб/пучок/шапка...), қўл/оёқ шарнир, аксессуар (очки линза Physical, сумка клапан)
- `apps/client/src/three/player.ts` — худди шундай, парка + рюкзак
- `apps/client/src/three/loaders.ts` — **янги**: `loadGLB(parent, url, fallback, opts)` — Blender экспортни 1 қаторда улайди

### GLB pipeline — демо
```ts
// world3d.ts — песочница ёнида демо
const holder = new THREE.Group(); holder.position.set(x,y,z); group.add(holder);
loadGLB(holder, "/models/demo-avocado.glb", null, { scale: 1.8 });
```
Сен Blender да `bench.glb` қилсанг:
1. `apps/client/public/models/bench.glb` га ташла
2. `loadGLB(holder, "/models/bench.glb", fallbackBench, { scale: 0.9 })` — болды

Демо файл `public/models/demo-avocado.glb` (261KB, Khronos sample) — ишлаётганини кўриш учун. Ўчирса ҳам бўлади, fallback ишлайди.

## 3. Сен қандай давом эттирасан (3 қадам)

1. **Blender ўрнат** → 1 та скамейка қил → Export `skameyka.glb`
2. `public/models/skameyka.glb` га қўй
3. `world3d.ts` да `benchReal()` ўрнига:
```ts
const holder = new THREE.Group(); holder.position.set(x,0,z); group.add(holder);
const fallback = createProceduralBench(); // ҳозирги benchReal ичи
loadGLB(holder, "/models/skameyka.glb", fallback, { scale: 1 });
```

## 4. Кейинги ўрганиш тартиби (2 ҳафта)

- **Ҳафта 1**: `threejs-journey.com` 1-8 дарс (Scene, Material, Texture, Shadow) — кунига 1 соат
- **Ҳафта 2**: Blender Guru Donut + "Soviet Building Timelapse" — ҳар куни 1 модел экспорт қилиб `loadGLB` билан текшир
- Мен ҳар куни кодни `world3d.ts` дан кўчириб, сенга PR қилиб бераман.

> Ҳозир лойиҳа **Blender мантиғида** ишлайди — содда қути эмас, PBR, соя, нормал, fallback билан. Кейинги моделни сен танла — скамейка, берёза ёки подъезддан бошлаймизми?
