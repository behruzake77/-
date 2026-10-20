import Phaser from "phaser";
import {
  NPCS,
  ZONES,
  activeObjectiveMarkers,
  evaluateCondition,
  type NpcDefinition,
  type NpcId,
  type NpcPlacement,
  type ZoneDefinition,
} from "@mir/shared";
import { useGame, type NearTarget } from "../state/store";
import { createFigure } from "./figures";
import { npcHitScore } from "./hit";
import { paintProp } from "./props";
import { ensureTextures, floorKey } from "./textures";
import { setAmbience, sfx } from "../audio/ambience";

const INK = 0x15120f;
const PLAYER_SPEED = 172;
const NPC_NAMES: Record<string, string> = Object.fromEntries(
  NPCS.map((npc: NpcDefinition) => [npc.id, npc.shortNameRu]),
);

interface NpcRuntime {
  id: NpcId;
  figure: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  marker: Phaser.GameObjects.Star;
  placement: NpcPlacement;
  target: { x: number; y: number } | null;
  nextThink: number;
  phase: number;
  bob: number;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Ambient tints, applied as a full-screen MULTIPLY pass.
 *
 * Phaser's MULTIPLY blend ignores the overlay's alpha (it blends with
 * SRC_COLOR), so the *colour* is the strength. Saturated tints turned the
 * interiors almost black; these near-white values keep the dusk mood and the
 * artwork readable on a phone in daylight.
 */
const LIGHT: Record<string, { color: number; alpha: number }> = {
  dusk: { color: 0xe6e4ef, alpha: 1 },
  day: { color: 0xfffaf1, alpha: 1 },
  warm: { color: 0xfff1e2, alpha: 1 },
  cool: { color: 0xeef3f7, alpha: 1 },
  fluor: { color: 0xf6f8f3, alpha: 1 },
  metro: { color: 0xeef1f5, alpha: 1 },
};

export class MirScene extends Phaser.Scene {
  private zone!: ZoneDefinition;
  private zoneObjects: Phaser.GameObjects.GameObject[] = [];
  private player!: Phaser.GameObjects.Container;
  private npcs: NpcRuntime[] = [];
  private walkPath: Point[] = [];
  private pendingInteraction: string | null = null;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<string, Phaser.Input.Keyboard.Key>;
  private unsubscribe?: () => void;
  private rain?: Phaser.GameObjects.TileSprite;
  private light?: Phaser.GameObjects.Rectangle;
  private stepAt = 0;
  private moving = false;
  private lastNearKey = "";
  private lastPosAt = 0;
  private shakeCooldown = 0;

  constructor() {
    super("mir");
  }

  preload(): void {
    this.load.image("photo-courtyard", "/photo-courtyard.jpg");
    this.load.image("photo-asphalt-top", "/photo-asphalt-top.jpg");
  }

  create(): void {
    ensureTextures(this);
    this.cameras.main.setBackgroundColor(INK);
    this.buildZone(useGame.getState().state.player.zone, false);

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys("W,A,S,D,E,SPACE") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    // Phaser captures WASD/space by default, which would swallow spaces and
    // Latin letters in the typed-answer field. The app owns the whole viewport,
    // so browser defaults are safe to keep.
    this.input.keyboard?.clearCaptures();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer));
    this.scale.on("resize", () => this.applyViewport());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
    });

    this.unsubscribe = useGame.subscribe((next, previous) => {
      if (next.state.player.zone !== previous.state.player.zone) {
        this.buildZone(next.state.player.zone, true);
      }
    });

    this.cameras.main.fadeIn(520, 21, 18, 14);
  }

  private clearZone(): void {
    this.zoneObjects.forEach((object) => {
      object.destroy();
    });
    this.zoneObjects = [];
    this.npcs = [];
    this.player?.destroy();
    this.rain = undefined;
    this.light = undefined;
  }

  private buildZone(zoneId: string, transition: boolean): void {
    const zone = ZONES[zoneId];
    if (!zone) return;
    const state = useGame.getState().state;
    this.clearZone();
    this.zone = zone;
    this.walkPath = [];
    this.pendingInteraction = null;
    this.lastNearKey = "";

    // courtyard floor — photoreal top-down asphalt (mix workflow)
    let floor: Phaser.GameObjects.TileSprite;
    if (zone.id === "courtyard" && this.textures.exists("photo-asphalt-top")) {
      floor = this.add
        .tileSprite(0, 0, zone.width, zone.height, "photo-asphalt-top")
        .setOrigin(0, 0)
        .setDepth(-200);
      // tile the 1024-ish texture to cover 1440x980 without stretching
      floor.setTileScale(0.55, 0.55);
      floor.setTint(0xdddad6);
      floor.setAlpha(0.98);
      this.zoneObjects.push(floor);
      // subtle darkening at edges so props pop
      const vignette = this.add.graphics().setDepth(-198);
      vignette.fillStyle(0x1a1816, 0.18);
      vignette.fillRect(0, 0, zone.width, 36);
      vignette.fillRect(0, zone.height - 36, zone.width, 36);
      this.zoneObjects.push(vignette);
    } else {
      floor = this.add
        .tileSprite(0, 0, zone.width, zone.height, floorKey(zone.id))
        .setOrigin(0, 0)
        .setDepth(-200);
      floor.setTileScale(1, 1);
      this.zoneObjects.push(floor);
    }

    const edge = this.add.graphics().setDepth(-190);
    edge.fillStyle(0x211c17, 0.55);
    edge.fillRect(0, 0, zone.width, 10);
    edge.fillRect(0, zone.height - 10, zone.width, 10);
    this.zoneObjects.push(edge);

    this.zone.props.forEach((prop) => {
      const object = paintProp(this, prop, zone);
      if (object) this.zoneObjects.push(object);
    });

    this.zone.props.forEach((prop) => {
      if (
        !["lamp", "ceilingLamp", "windowRain", "metroEntrance", "espressoMachine"].includes(
          prop.type,
        )
      )
        return;
      const glow = this.add
        .image(
          prop.x + (prop.w ?? 40) / 2,
          prop.y + (prop.h ?? 40) * (prop.type === "lamp" ? 0.18 : 0.42),
          "glow",
        )
        .setScale(prop.type === "windowRain" ? 1.35 : prop.type === "ceilingLamp" ? 1.6 : 0.95)
        .setAlpha(prop.type === "windowRain" ? 0.18 : 0.28)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2450);
      this.zoneObjects.push(glow);
    });

    this.zone.interactions.forEach((interaction) => {
      if (!evaluateCondition(interaction.condition, state)) return;
      if (interaction.kind === "npc") return;
      const marker = this.add
        .star(interaction.x, interaction.y - 24, 4, 4, 6.5, 0xd9a441, 0.85)
        .setDepth(1500);
      this.tweens.add({
        targets: marker,
        alpha: 0.35,
        scale: 0.8,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: Math.round((interaction.x + interaction.y) % 700),
      });
      this.zoneObjects.push(marker);

      // The current objective gets a named Russian tag and a slow ring so a
      // beginner can find the note / shelf / door without a glowing quest arrow
      // plastered over the scene.
      if (this.isCurrentObjective(interaction.id)) {
        const ring = this.add
          .image(interaction.x, interaction.y + 6, "glow")
          .setScale(0.42)
          .setAlpha(0.32)
          .setTint(0xf0c063)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(1490);
        this.tweens.add({
          targets: ring,
          alpha: 0.14,
          scale: 0.56,
          duration: 1800,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
        const tag = this.add
          .text(interaction.x, interaction.y - 42, interaction.labelRu.split(" · ")[0], {
            fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
            fontSize: "17px",
            color: "#f6e6c4",
            backgroundColor: "rgba(21,18,15,0.72)",
            padding: { x: 7, y: 3 },
          })
          .setOrigin(0.5, 1)
          .setDepth(1998)
          .setAlpha(0.95);
        this.tweens.add({
          targets: tag,
          y: tag.y - 5,
          duration: 1700,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
        this.zoneObjects.push(ring, tag);
      }
    });

    this.buildNpcs();
    this.buildPlayer(state.player.x, state.player.y);
    this.buildWeather(zone);
    const lightCfg = LIGHT[zone.ambient.light] ?? LIGHT.day;
    this.light = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, lightCfg.color, 1)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(2380)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.zoneObjects.push(this.light);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, zone.width, zone.height);
    this.applyViewport();
    if (transition) {
      camera.fadeIn(420, 21, 18, 14);
    }
    setAmbience(zone.ambient.sound);
  }

  /** Is this interaction the thing the player is being asked to do right now? */
  private isCurrentObjective(interactionId: string): boolean {
    const state = useGame.getState().state;
    return activeObjectiveMarkers(state).includes(interactionId);
  }

  private buildNpcs(): void {
    const state = useGame.getState().state;
    for (const placement of this.zone.npcs) {
      if (!evaluateCondition(placement.condition, state)) continue;
      const definition = NPCS.find((entry) => entry.id === placement.npcId);
      if (!definition) continue;
      const figure = createFigure(this, definition);
      const isCat = placement.npcId === "musya";
      const label = this.add
        .text(placement.x, placement.y - (isCat ? 42 : 82), definition.shortNameRu, {
          fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
          fontSize: isCat ? "15px" : "18px",
          color: "#f1e4cb",
        })
        .setOrigin(0.5, 1)
        .setStroke("#15120f", 4)
        .setDepth(2000)
        .setAlpha(0.92);
      const objective = activeObjectiveMarkers(state).includes(`npc:${placement.npcId}`);
      const marker = this.add
        .star(placement.x, placement.y - (isCat ? 32 : 64), 4, 4, 5.5, 0xd9a441, 0.9)
        .setDepth(1999);
      if (objective) {
        const ring = this.add
          .image(placement.x, placement.y + 4, "glow")
          .setScale(0.4)
          .setAlpha(0.3)
          .setTint(0xf0c063)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(1996);
        this.tweens.add({
          targets: ring,
          alpha: 0.12,
          scale: 0.54,
          duration: 1700,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
        this.zoneObjects.push(ring);
      }
      this.tweens.add({
        targets: marker,
        alpha: 0.35,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      figure.setPosition(placement.x, placement.y).setDepth(placement.y);
      this.zoneObjects.push(figure, label, marker);
      this.npcs.push({
        id: placement.npcId,
        figure,
        label,
        marker,
        placement,
        target: null,
        nextThink: this.time.now + 1400 + Math.random() * 2400,
        phase: Math.random() * Math.PI * 2,
        bob: 0,
      });
    }
  }

  private buildPlayer(x: number, y: number): void {
    const player = createFigure(this, NPCS[0], "player");
    player.setPosition(x, y).setDepth(y);
    this.player = player;
    this.zoneObjects.push(player);
    const camera = this.cameras.main;
    camera.stopFollow();
    camera.startFollow(player, true, 0.11, 0.11);
    camera.centerOn(x, y);
  }

  private buildWeather(zone: ZoneDefinition): void {
    if (["courtyard", "street", "dombyta"].includes(zone.id)) {
      this.rain = this.add
        .tileSprite(0, 0, this.scale.width, this.scale.height, "rain")
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(2300)
        .setAlpha(0.2);
      this.zoneObjects.push(this.rain);
    }
    if (zone.ambient.particles === "leaves") {
      const emitter = this.add.particles(0, -30, "leaf", {
        x: { min: 0, max: zone.width },
        lifespan: 14000,
        speedY: { min: 16, max: 40 },
        speedX: { min: -26, max: 26 },
        rotate: { start: 0, end: 360 },
        scale: { min: 0.5, max: 1.2 },
        frequency: 760,
        quantity: 1,
        alpha: { start: 0.8, end: 0.1 },
      });
      emitter.setDepth(1200);
      this.zoneObjects.push(emitter);
    }
    if (zone.id === "cafe") {
      const steam = this.add.particles(660, 208, "dot", {
        speedY: { min: -18, max: -8 },
        speedX: { min: -5, max: 5 },
        scale: { start: 0.6, end: 2.4 },
        alpha: { start: 0.2, end: 0 },
        lifespan: 3200,
        frequency: 520,
      });
      steam.setDepth(1410);
      this.zoneObjects.push(steam);
    }
    if (zone.ambient.particles === "dust") {
      const dust = this.add.particles(0, 0, "dot", {
        x: { min: 0, max: zone.width },
        y: { min: 0, max: zone.height },
        speedY: { min: -4, max: 4 },
        speedX: { min: -6, max: 6 },
        scale: { min: 0.3, max: 0.9 },
        alpha: { start: 0.16, end: 0 },
        lifespan: 6400,
        frequency: 420,
      });
      dust.setDepth(1100);
      this.zoneObjects.push(dust);
    }
  }

  private applyViewport(): void {
    if (!this.zone) return;
    const width = this.scale.width;
    const height = this.scale.height;
    const preferred = Phaser.Math.Clamp(width / 780, 0.88, 1.5);
    const fitX = (width / this.zone.width) * 1.04;
    const fitY = (height / this.zone.height) * 1.04;
    const zoom = Phaser.Math.Clamp(Math.max(preferred, fitX, fitY), 0.85, 2.2);
    this.cameras.main.setZoom(zoom);
    if (this.rain) this.rain.setSize(width, height);
    this.light?.setSize(width, height);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const store = useGame.getState();
    if (store.dialogue || store.panel || store.introOpen || store.sleeping) return;
    const state = store.state;
    const zone = ZONES[state.player.zone];
    if (!zone || !this.player) return;
    const px = pointer.worldX;
    const py = pointer.worldY;

    let best: { id: string; x: number; y: number; score: number; radius: number } | null = null;
    for (const npc of this.npcs) {
      // Figures are anchored at their feet; the capsule in `hit.ts` accepts a tap
      // anywhere on the standing body, which is what people actually touch.
      const score = npcHitScore(px, py, { x: npc.figure.x, y: npc.figure.y });
      if (score === null) continue;
      if (!best || score < best.score) {
        best = {
          id: `npc:${npc.id}`,
          x: npc.figure.x,
          y: npc.figure.y,
          score,
          radius: 58,
        };
      }
    }
    for (const interaction of zone.interactions) {
      if (!evaluateCondition(interaction.condition, state)) continue;
      const dist = Math.hypot(interaction.x - px, interaction.y - py);
      const hit = Math.min(interaction.radius ?? 60, 86);
      if (dist < hit && (!best || dist < best.score)) {
        best = {
          id: interaction.id,
          x: interaction.x,
          y: interaction.y,
          score: dist,
          radius: interaction.radius ?? 60,
        };
      }
    }

    if (best) {
      const isNpc = best.id.startsWith("npc:");
      // Sitting NPCs and counters often make the geometric approach point sit inside
      // an obstacle. Look around the target for a spot the player can actually stand.
      const wanted = isNpc ? 52 : Math.max(30, Math.min(44, best.radius * 0.5));
      const stand = this.standNear(best.x, best.y, wanted);
      const target = stand ?? this.findFreeSpot(best.x, best.y);
      this.walkTo(target, best.id);
      sfx("tap");
      return;
    }

    const target = this.findFreeSpot(px, py);
    if (Math.hypot(target.x - this.player.x, target.y - this.player.y) < 4) {
      this.walkPath = [];
      this.pendingInteraction = null;
      return;
    }
    this.walkTo(target, null);
  }

  /** Queue a walk to a point, routing around props when a straight line is blocked. */
  private walkTo(target: Point, pending: string | null): void {
    this.pendingInteraction = pending;
    const path = this.findPath(target);
    this.walkPath = path && path.length ? path : [target];
  }

  /** Find a free standing spot at `distance` from a target, preferring the player's side. */
  private standNear(x: number, y: number, distance: number): Point | null {
    const zone = this.zone;
    const base = Math.atan2(this.player.y - y, this.player.x - x);
    const offsets = [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.8, -1.8, 2.4, -2.4, Math.PI];
    for (const extra of [0, 16, 32, 48]) {
      for (const offset of offsets) {
        const angle = base + offset;
        const px = Phaser.Math.Clamp(x + Math.cos(angle) * (distance + extra), 24, zone.width - 24);
        const py = Phaser.Math.Clamp(
          y + Math.sin(angle) * (distance + extra),
          34,
          zone.height - 22,
        );
        if (!this.pointBlocked(px, py, 13)) return { x: px, y: py };
      }
    }
    return null;
  }

  private lineClear(a: Point, b: Point): boolean {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(dist / 10));
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      if (this.pointBlocked(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 12)) return false;
    }
    return true;
  }

  /**
   * Small grid A* over the zone. The neighbourhood is deliberately compact
   * (about two thousand cells), which is plenty for these hand-authored rooms.
   */
  private findPath(to: Point): Point[] | null {
    if (!this.zone) return null;
    const from = { x: this.player.x, y: this.player.y };
    if (this.lineClear(from, to)) return [to];

    const step = 28;
    const cols = Math.ceil(this.zone.width / step);
    const rows = Math.ceil(this.zone.height / step);
    const key = (cx: number, cy: number) => cy * cols + cx;
    const free = (cx: number, cy: number) => {
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return false;
      return !this.pointBlocked(cx * step + step / 2, cy * step + step / 2, 13);
    };
    const nearestFree = (x: number, y: number) => {
      const bx = Phaser.Math.Clamp(Math.floor(x / step), 0, cols - 1);
      const by = Phaser.Math.Clamp(Math.floor(y / step), 0, rows - 1);
      if (free(bx, by)) return { cx: bx, cy: by };
      for (let ring = 1; ring <= 6; ring += 1) {
        for (let oy = -ring; oy <= ring; oy += 1) {
          for (let ox = -ring; ox <= ring; ox += 1) {
            if (Math.max(Math.abs(ox), Math.abs(oy)) !== ring) continue;
            if (free(bx + ox, by + oy)) return { cx: bx + ox, cy: by + oy };
          }
        }
      }
      return null;
    };

    const start = nearestFree(from.x, from.y);
    const goal = nearestFree(to.x, to.y);
    if (!start || !goal) return null;
    const startKey = key(start.cx, start.cy);
    const goalKey = key(goal.cx, goal.cy);
    if (startKey === goalKey) return [to];

    const dirs: Array<[number, number, number]> = [
      [1, 0, 1],
      [-1, 0, 1],
      [0, 1, 1],
      [0, -1, 1],
      [1, 1, 1.414],
      [1, -1, 1.414],
      [-1, 1, 1.414],
      [-1, -1, 1.414],
    ];
    const gScore = new Map<number, number>([[startKey, 0]]);
    const fScore = new Map<number, number>([
      [startKey, Math.hypot(goal.cx - start.cx, goal.cy - start.cy)],
    ]);
    const cameFrom = new Map<number, number>();
    const open = new Set<number>([startKey]);
    const closed = new Set<number>();
    const heuristic = (cx: number, cy: number) => Math.hypot(goal.cx - cx, goal.cy - cy);

    let guard = 0;
    while (open.size > 0 && guard < cols * rows * 2) {
      guard += 1;
      let current = -1;
      let bestF = Number.POSITIVE_INFINITY;
      for (const candidate of open) {
        const f = fScore.get(candidate) ?? Number.POSITIVE_INFINITY;
        if (f < bestF) {
          bestF = f;
          current = candidate;
        }
      }
      if (current === -1) break;
      if (current === goalKey) break;
      open.delete(current);
      closed.add(current);
      const cx = current % cols;
      const cy = Math.floor(current / cols);
      for (const [dx, dy, cost] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!free(nx, ny)) continue;
        // Do not squeeze diagonally through a corner.
        if (dx !== 0 && dy !== 0 && (!free(cx + dx, cy) || !free(cx, cy + dy))) continue;
        const nextKey = key(nx, ny);
        if (closed.has(nextKey)) continue;
        const tentative = (gScore.get(current) ?? 0) + cost;
        if (tentative >= (gScore.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
        cameFrom.set(nextKey, current);
        gScore.set(nextKey, tentative);
        fScore.set(nextKey, tentative + heuristic(nx, ny));
        open.add(nextKey);
      }
    }

    if (!cameFrom.has(goalKey) && goalKey !== startKey) return null;

    const cells: Point[] = [];
    let node = goalKey;
    while (node !== startKey) {
      const cx = node % cols;
      const cy = Math.floor(node / cols);
      cells.push({ x: cx * step + step / 2, y: cy * step + step / 2 });
      const parent = cameFrom.get(node);
      if (parent === undefined) return null;
      node = parent;
    }
    cells.reverse();

    const path: Point[] = [];
    let anchor = from;
    for (let i = 0; i < cells.length; i += 1) {
      const next = cells[i + 1];
      if (next && this.lineClear(anchor, next)) continue;
      path.push(cells[i]);
      anchor = cells[i];
    }
    if (this.lineClear(anchor, to)) path.push(to);
    return path.length ? path : [to];
  }

  private findFreeSpot(px: number, py: number): { x: number; y: number } {
    const zone = this.zone;
    const x = Phaser.Math.Clamp(px, 20, zone.width - 20);
    const y = Phaser.Math.Clamp(py, 26, zone.height - 16);
    if (!this.pointBlocked(x, y, 12)) return { x, y };
    const startX = this.player.x;
    const startY = this.player.y;
    const steps = 14;
    let last = { x: startX, y: startY };
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const sx = startX + (x - startX) * t;
      const sy = startY + (y - startY) * t;
      if (this.pointBlocked(sx, sy, 12)) break;
      last = { x: sx, y: sy };
    }
    return last;
  }

  private pointBlocked(x: number, y: number, radius = 11): boolean {
    for (const rect of this.zone.obstacles) {
      const nx = Phaser.Math.Clamp(x, rect.x, rect.x + rect.w);
      const ny = Phaser.Math.Clamp(y, rect.y, rect.y + rect.h);
      if (Math.hypot(x - nx, y - ny) < radius) return true;
    }
    return false;
  }

  private interactWith(id: string): void {
    this.walkPath = [];
    this.pendingInteraction = null;
    useGame.getState().interact(id);
  }

  private finishWalk(): void {
    const pending = this.pendingInteraction;
    this.pendingInteraction = null;
    this.walkPath = [];
    if (!pending) return;
    const interaction = this.zone.interactions.find((item) => item.id === pending);
    const npc = this.npcs.find((entry) => `npc:${entry.id}` === pending);
    const point = interaction
      ? { x: interaction.x, y: interaction.y }
      : npc
        ? { x: npc.figure.x, y: npc.figure.y }
        : null;
    if (!point) return;
    const reach = interaction ? (interaction.radius ?? 60) + 26 : 86;
    if (Math.hypot(point.x - this.player.x, point.y - this.player.y) <= reach) {
      this.interactWith(pending);
    }
  }

  private nearestInteraction(): { target: NearTarget; point: { x: number; y: number } } | null {
    const state = useGame.getState().state;
    const zone = this.zone;
    const px = this.player.x;
    const py = this.player.y;
    let best: { target: NearTarget; point: { x: number; y: number }; score: number } | null = null;

    for (const interaction of zone.interactions) {
      if (!evaluateCondition(interaction.condition, state)) continue;
      const dist = Math.hypot(interaction.x - px, interaction.y - py);
      const radius = interaction.radius ?? 60;
      if (dist < radius) {
        const score = dist / Math.max(radius, 1);
        if (!best || score < best.score) {
          best = {
            target: {
              id: interaction.id,
              kind: interaction.kind,
              labelRu: interaction.labelRu,
              labelEn: interaction.labelEn,
              distance: dist,
            },
            point: { x: interaction.x, y: interaction.y },
            score,
          };
        }
      }
    }

    for (const npc of this.npcs) {
      const dist = Math.hypot(npc.figure.x - px, npc.figure.y - py);
      if (dist < 76) {
        const score = dist / 76;
        if (!best || score < best.score) {
          best = {
            target: {
              id: `npc:${npc.id}`,
              kind: "npc",
              labelRu: NPC_NAMES[npc.id] ?? npc.id,
              labelEn: npc.id,
              npcId: npc.id,
              distance: dist,
            },
            point: { x: npc.figure.x, y: npc.figure.y },
            score,
          };
        }
      }
    }
    return best ? { target: best.target, point: best.point } : null;
  }

  private updateNear(): void {
    const near = this.nearestInteraction();
    const key = near ? near.target.id : "";
    if (key !== this.lastNearKey) {
      this.lastNearKey = key;
      useGame.getState().setNear(near ? near.target : null);
    }
  }

  update(time: number, delta: number): void {
    if (!this.zone || !this.player) return;
    const store = useGame.getState();
    const locked = Boolean(store.dialogue || store.panel || store.introOpen || store.sleeping);

    if (this.rain) {
      this.rain.tilePositionY -= delta * 0.28;
      this.rain.tilePositionX += delta * 0.015;
    }
    this.animateNpcs(time, delta);

    if (locked) {
      this.moving = false;
      this.player.setScale(this.player.scaleX < 0 ? -1 : 1, 1);
      useGame.getState().setNear(null);
      return;
    }

    let dx = 0;
    let dy = 0;
    if (this.cursors) {
      if (this.cursors.left.isDown) dx -= 1;
      if (this.cursors.right.isDown) dx += 1;
      if (this.cursors.up.isDown) dy -= 1;
      if (this.cursors.down.isDown) dy += 1;
    }
    if (this.wasd) {
      if (this.wasd.A?.isDown) dx -= 1;
      if (this.wasd.D?.isDown) dx += 1;
      if (this.wasd.W?.isDown) dy -= 1;
      if (this.wasd.S?.isDown) dy += 1;
    }

    if (dx !== 0 || dy !== 0) {
      this.walkPath = [];
      this.pendingInteraction = null;
      const length = Math.hypot(dx, dy) || 1;
      this.movePlayer(
        (dx / length) * PLAYER_SPEED * (delta / 1000),
        (dy / length) * PLAYER_SPEED * (delta / 1000),
      );
    } else if (this.walkPath.length > 0) {
      const target = this.walkPath[0];
      const tx = target.x - this.player.x;
      const ty = target.y - this.player.y;
      const distance = Math.hypot(tx, ty);
      if (distance < 5) {
        this.walkPath.shift();
        if (this.walkPath.length === 0) this.finishWalk();
      } else {
        const beforeX = this.player.x;
        const beforeY = this.player.y;
        const step = Math.min(PLAYER_SPEED * (delta / 1000), distance);
        this.movePlayer((tx / distance) * step, (ty / distance) * step);
        // If a waypoint cannot be reached (a prop moved, a corner clips), drop it
        // instead of freezing the walk and leaving the player stuck.
        if (Math.hypot(this.player.x - beforeX, this.player.y - beforeY) < 0.15) {
          this.walkPath.shift();
          if (this.walkPath.length === 0) this.finishWalk();
        }
      }
    } else {
      this.moving = false;
    }

    if (this.moving) {
      const facing = this.player.scaleX < 0 ? -1 : 1;
      this.player.setScale(facing, 1 + Math.sin(time * 0.018) * 0.022);
      if (time - this.stepAt > 380 && store.soundOn) {
        this.stepAt = time;
        sfx("step");
      }
      if (time - this.lastPosAt > 1100) {
        this.lastPosAt = time;
        useGame.getState().syncPosition(Math.round(this.player.x), Math.round(this.player.y));
      }
    } else {
      this.player.setScale(this.player.scaleX < 0 ? -1 : 1, 1);
    }

    this.player.setDepth(this.player.y);
    this.updateNear();

    if (this.wasd?.E?.isDown || this.cursors?.space.isDown) {
      if (time - this.shakeCooldown > 320) {
        this.shakeCooldown = time;
        const near = this.nearestInteraction();
        if (near) this.interactWith(near.target.id);
      }
    }
  }

  private movePlayer(dx: number, dy: number): void {
    const radius = 11;
    let { x, y } = this.player;
    const nextX = Phaser.Math.Clamp(x + dx, 16, this.zone.width - 16);
    if (!this.pointBlocked(nextX, y, radius)) x = nextX;
    const nextY = Phaser.Math.Clamp(y + dy, 16, this.zone.height - 12);
    if (!this.pointBlocked(x, nextY, radius)) y = nextY;
    if (Math.abs(dx) > 0.01) this.player.setScale(dx < 0 ? -1 : 1, 1);
    this.player.setPosition(x, y);
    this.moving = Math.abs(dx) + Math.abs(dy) > 0.2;
  }

  private animateNpcs(time: number, delta: number): void {
    for (const npc of this.npcs) {
      const figure = npc.figure;
      if (npc.placement.wander?.length) {
        if (!npc.target && time > npc.nextThink) {
          const points = npc.placement.wander;
          const point = points[Math.floor(Math.random() * points.length)];
          npc.target = point;
          npc.nextThink = time + 3800 + Math.random() * 4200;
        }
        if (npc.target) {
          const tx = npc.target.x - figure.x;
          const ty = npc.target.y - figure.y;
          const dist = Math.hypot(tx, ty);
          if (dist < 5) {
            npc.target = null;
          } else {
            const step = Math.min(46 * (delta / 1000), dist);
            const nx = figure.x + (tx / dist) * step;
            const ny = figure.y + (ty / dist) * step;
            if (!this.pointBlocked(nx, ny, 8)) {
              figure.setPosition(nx, ny);
              figure.setScale(tx < 0 ? -1 : 1, 1);
            } else {
              npc.target = null;
            }
          }
        }
      } else {
        figure.setY(npc.placement.y + Math.sin(time * 0.0016 + npc.phase) * 1.2);
      }
      figure.setDepth(figure.y);
      const isCat = npc.id === "musya";
      npc.label.setPosition(figure.x, figure.y - (isCat ? 42 : 82));
      npc.marker.setPosition(figure.x, figure.y - (isCat ? 32 : 64));
    }
  }
}
