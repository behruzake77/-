import { NPC_BY_ID, type NpcLook, type PortraitStage } from "@mir/shared";

/**
 * Original, code-drawn portraits: a flat-ink editorial style, printed on paper.
 * Everything is generated here, so the game ships with no external artwork.
 */

const PLAYER_LOOK: NpcLook = {
  skin: "#dfb392",
  hair: "#3b2a20",
  hairStyle: "short",
  coat: "#5b6247",
  coatAlt: "#3d4533",
  accessory: "bag",
  accent: "#c9a26a",
};

const PAPER = "#e8dcc4";
const INK = "#2a231d";

function shade(hex: string, amount: number): string {
  const value = hex.replace("#", "");
  const num = Number.parseInt(
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value,
    16,
  );
  const r = Math.max(0, Math.min(255, ((num >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (num & 255) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function mouth(stage: PortraitStage, skin: string): string {
  const lip = shade(skin, -70);
  const dark = "#4a2a26";
  switch (stage) {
    case "smile":
    case "warm":
      return `<path d="M104 196 q16 12 32 0" fill="none" stroke="${lip}" stroke-width="3.4" stroke-linecap="round"/>`;
    case "laugh":
      return `<path d="M103 192 q17 22 34 0 q-16 8 -34 0z" fill="${dark}" stroke="${lip}" stroke-width="2"/>`;
    case "amused":
      return `<path d="M106 196 q15 8 27 -2" fill="none" stroke="${lip}" stroke-width="3.4" stroke-linecap="round"/>`;
    case "worried":
      return `<path d="M107 198 q13 -7 26 0" fill="none" stroke="${lip}" stroke-width="3.2" stroke-linecap="round"/>`;
    case "stern":
      return `<path d="M105 197 h30" fill="none" stroke="${lip}" stroke-width="3.4" stroke-linecap="round"/>`;
    case "shy":
      return `<path d="M108 195 q12 8 24 0" fill="none" stroke="${lip}" stroke-width="3.4" stroke-linecap="round"/>`;
    case "hurried":
      return `<path d="M107 195 q13 6 26 1" fill="none" stroke="${lip}" stroke-width="3.2" stroke-linecap="round"/>`;
    case "thinking":
      return `<path d="M106 197 h22 q3 0 3 -3" fill="none" stroke="${lip}" stroke-width="3" stroke-linecap="round"/>`;
    default:
      return `<path d="M106 196 q14 5 28 0" fill="none" stroke="${lip}" stroke-width="3.2" stroke-linecap="round"/>`;
  }
}

function eyes(stage: PortraitStage): string {
  const lid = (cx: number) => {
    switch (stage) {
      case "worried":
        return `<path d="M${cx - 11} 158 q11 -8 22 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
      case "laugh":
      case "amused":
        return `<path d="M${cx - 10} 158 q10 7 20 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
      default:
        return "";
    }
  };
  const irisY = stage === "thinking" ? 156 : 158;
  const irisX = stage === "thinking" ? 6 : 0;
  return `
    <ellipse cx="96" cy="158" rx="10.5" ry="6.6" fill="#f6efe2"/>
    <ellipse cx="144" cy="158" rx="10.5" ry="6.6" fill="#f6efe2"/>
    <circle cx="${96 + irisX}" cy="${irisY}" r="4.4" fill="#4a3526"/>
    <circle cx="${144 + irisX}" cy="${irisY}" r="4.4" fill="#4a3526"/>
    <circle cx="${96 + irisX - 1.4}" cy="${irisY - 1.6}" r="1.25" fill="#f7f0e4"/>
    <circle cx="${144 + irisX - 1.4}" cy="${irisY - 1.6}" r="1.25" fill="#f7f0e4"/>
    ${lid(96)}${lid(144)}
  `;
}

function brows(stage: PortraitStage, hair: string): string {
  const color = shade(hair, -30);
  const lift = stage === "worried" ? -3 : 0;
  const inner = stage === "worried" ? -6 : stage === "stern" ? 5 : 0;
  return `
    <path d="M82 ${143 + lift} q14 -5 28 -1" fill="none" stroke="${color}" stroke-width="4.4" stroke-linecap="round"/>
    <path d="M130 ${142 + lift + inner * 0.3} q14 -4 28 1" fill="none" stroke="${color}" stroke-width="4.4" stroke-linecap="round"/>
  `;
}

/** Hair is built as a band that hugs the skull, so the forehead stays readable. */
const SKULL_BAND =
  "M60 158 C54 92 76 64 120 64 C164 64 186 92 180 158 C175 126 169 108 155 100 C137 90 103 90 85 100 C71 108 65 126 60 158 Z";

function locks(look: NpcLook, bottom: number): string {
  const { hair } = look;
  const dark = shade(hair, -28);
  const height = bottom - 150;
  return `
    <path d="M62 150 q-6 ${height * 0.55} 2 ${height} q-12 -6 -13 -18 q-2 -${height * 0.6} 11 -${height * 0.7}z" fill="${hair}"/>
    <path d="M178 150 q6 ${height * 0.55} -2 ${height} q12 -6 13 -18 q2 -${height * 0.6} -11 -${height * 0.7}z" fill="${hair}"/>
    <path d="M64 182 q-1 ${height * 0.4} 4 ${height * 0.55}" fill="none" stroke="${dark}" stroke-width="2.2" opacity="0.22"/>
  `;
}

function hairBack(look: NpcLook): string {
  const { hair, hairStyle } = look;
  switch (hairStyle) {
    case "bob":
      return `<path d="M56 236 q-10 -176 64 -176 q74 0 64 176 q-14 10 -26 2 q10 -150 -38 -150 q-48 0 -38 150 q-12 8 -26 -2z" fill="${hair}"/>`;
    case "long":
      return `<path d="M50 296 q-8 -236 70 -236 q78 0 70 236 q-12 8 -24 2 q8 -200 -46 -200 q-54 0 -46 200 q-12 6 -24 -2z" fill="${hair}"/>`;
    case "bun":
      return `<circle cx="120" cy="52" r="25" fill="${hair}"/>
              <circle cx="120" cy="52" r="25" fill="none" stroke="${shade(hair, -26)}" stroke-width="2" opacity="0.2"/>
              <path d="M104 70 q16 -6 32 0" fill="none" stroke="${shade(hair, -30)}" stroke-width="2.4" opacity="0.2"/>
              <path d="${SKULL_BAND}" fill="${hair}"/>`;
    case "curly":
      return `<g fill="${hair}">
        <circle cx="70" cy="118" r="24"/><circle cx="92" cy="86" r="26"/><circle cx="124" cy="76" r="27"/>
        <circle cx="156" cy="88" r="25"/><circle cx="172" cy="118" r="23"/>
        <circle cx="62" cy="148" r="18"/><circle cx="178" cy="148" r="18"/></g>`;
    case "beanie":
    case "cap":
    case "bald":
      return `<path d="${SKULL_BAND}" fill="${shade(hair, 4)}"/>`;
    default:
      return `<path d="${SKULL_BAND}" fill="${hair}"/>`;
  }
}

function hairFront(look: NpcLook): string {
  const { hair, hairStyle, accent } = look;
  const dark = shade(hair, -24);
  const light = shade(hair, 22);
  const band = `<path d="${SKULL_BAND}" fill="${hair}"/>`;
  const fringe = (depth: number, swoop = 8) =>
    `<path d="M85 100 C104 90 137 90 155 100 C150 ${100 + depth} 132 ${106 + depth} 112 ${102 + depth * 0.8} C98 ${100 + depth * 0.7} 90 ${100 + swoop} 85 100 Z" fill="${hair}"/>
     <path d="M104 74 q26 -6 44 12" fill="none" stroke="${light}" stroke-width="3" stroke-linecap="round" opacity="0.34"/>`;

  switch (hairStyle) {
    case "bob":
      return `${band}${fringe(22, 6)}`;
    case "long":
      return `${band}${fringe(26, 4)}${locks(look, 292)}`;
    case "bun":
      return `${band}
        <path d="M86 100 C104 90 136 90 154 100 C148 104 132 96 112 96 C100 96 90 98 86 100 Z" fill="${hair}"/>
        <path d="M96 70 q24 -8 46 -2" fill="none" stroke="${light}" stroke-width="3" stroke-linecap="round" opacity="0.35"/>
`;
    case "short":
      return `${band}
        <path d="M88 100 C106 92 134 92 152 100 C146 118 128 122 110 118 C98 115 91 108 88 100 Z" fill="${hair}"/>
        <path d="M116 70 q30 4 44 26" fill="none" stroke="${dark}" stroke-width="3" stroke-linecap="round" opacity="0.22"/>`;
    case "curly":
      return `<path d="${SKULL_BAND}" fill="${hair}"/>
        <g fill="${hair}">
          <circle cx="90" cy="92" r="16"/><circle cx="120" cy="84" r="17"/><circle cx="150" cy="92" r="16"/>
          <circle cx="104" cy="106" r="12"/><circle cx="136" cy="106" r="12"/>
        </g>`;
    case "beanie":
      return `<path d="M60 116 q0 -66 60 -66 q60 0 60 66 q-4 10 -14 10 h-92 q-10 0 -14 -10z" fill="${accent ?? "#b24a3a"}"/>
              <path d="M60 112 q60 -10 120 0 q-2 16 -60 16 q-58 0 -60 -16z" fill="${shade(accent ?? "#b24a3a", -26)}"/>
              <path d="M96 58 q24 -10 48 0" fill="none" stroke="${shade(accent ?? "#b24a3a", -44)}" stroke-width="3.5" opacity="0.4"/>
              <path d="M78 78 q-6 20 -4 34" fill="none" stroke="${shade(accent ?? "#b24a3a", -34)}" stroke-width="2.6" opacity="0.35"/>
              <circle cx="120" cy="48" r="8" fill="${shade(accent ?? "#b24a3a", -8)}"/>`;
    case "cap":
      return `<path d="M64 110 q4 -58 56 -58 q52 0 56 58 q-14 -14 -56 -14 q-42 0 -56 14z" fill="${shade(hair, 16)}"/>
              <path d="M64 106 q56 -14 112 0 q-6 14 -56 14 q-50 0 -56 -14z" fill="${shade(hair, -18)}"/>
              <path d="M170 104 q22 5 26 15 q-22 5 -30 -8z" fill="${shade(hair, -34)}"/>
              <path d="M112 56 q14 -4 22 2" fill="none" stroke="${shade(hair, 40)}" stroke-width="3" opacity="0.35"/>`;
    case "bald":
      return `<path d="M76 120 q8 -30 44 -30 q36 0 44 30" fill="none" stroke="${shade(look.skin, -26)}" stroke-width="2.4" opacity="0.35"/>`;
    default:
      return `${band}${fringe(10, 4)}`;
  }
}

function accessory(look: NpcLook): string {
  const { accessory: kind, accent, coat, coatAlt, skin } = look;
  switch (kind) {
    case "glasses":
      return `<g fill="none" stroke="${INK}" stroke-width="3">
        <rect x="85" y="146" width="26" height="24" rx="8" fill="rgba(255,255,255,0.1)"/>
        <rect x="129" y="146" width="26" height="24" rx="8" fill="rgba(255,255,255,0.1)"/>
        <path d="M111 157 h18"/><path d="M85 153 l-14 -4"/><path d="M155 153 l14 -4"/>
      </g>`;
    case "scarf":
      return `<path d="M92 208 q28 16 56 0 l6 18 q-34 18 -68 0z" fill="${accent ?? "#b56a45"}"/>
              <path d="M104 226 q-4 26 8 34 l16 -4 q-10 -12 -6 -30z" fill="${shade(accent ?? "#b56a45", -20)}"/>`;
    case "earbuds":
      return `<circle cx="68" cy="158" r="3.6" fill="#f2ead9" stroke="${INK}" stroke-width="1.2"/>
              <path d="M68 162 q0 24 18 32" fill="none" stroke="#f2ead9" stroke-width="1.8" opacity="0.85"/>`;
    case "apron":
      return `<path d="M90 232 h60 l8 68 h-76z" fill="${shade(coatAlt, 30)}" opacity="0.92"/>
              <path d="M96 232 q24 10 48 0" fill="none" stroke="${shade(coatAlt, 46)}" stroke-width="2.2" opacity="0.7"/>
              <path d="M100 234 l-4 -14 M140 234 l4 -14" fill="none" stroke="${shade(coatAlt, 40)}" stroke-width="3"/>
              <path d="M96 262 h48" stroke="${shade(coatAlt, -14)}" stroke-width="1.6" opacity="0.6"/>`;
    case "vest":
      return `<path d="M74 300 l0 -50 q8 -26 30 -34 l16 16 l16 -16 q22 8 30 34 l0 50z" fill="${accent ?? "#e7d4b0"}" opacity="0.9"/>
              <path d="M120 232 l0 68" stroke="${shade(accent ?? "#e7d4b0", -40)}" stroke-width="3"/>`;
    case "uniform":
      return `<path d="M96 216 l24 26 l24 -26 l0 22 l-24 26 l-24 -26z" fill="${shade(coat, -16)}"/>
              <path d="M114 240 h12 v10 h-12z" fill="${accent ?? "#cf3a32"}"/>
              <path d="M84 240 q-8 30 -6 60" fill="none" stroke="${shade(coat, -24)}" stroke-width="3"/>`;
    case "bag":
      return `<path d="M78 222 q42 26 84 0" fill="none" stroke="${accent ?? "#7c6a4a"}" stroke-width="5" opacity="0.8"/>`;
    default:
      return `<path d="M104 216 q16 8 32 0" fill="none" stroke="${shade(skin, -30)}" stroke-width="2.4" opacity="0.6"/>`;
  }
}

function bust(look: NpcLook, stage: PortraitStage, withCollar = true): string {
  const skinShadow = shade(look.skin, -30);
  const skinSoft = shade(look.skin, -12);
  return `
    ${hairBack(look)}
    <!-- shoulders and coat -->
    <path d="M28 300 q4 -66 54 -86 q18 12 38 12 q20 0 38 -12 q50 20 54 86z" fill="${look.coat}"/>
    <path d="M24 300 q4 -70 58 -90 l8 14 q-38 22 -44 76z" fill="${shade(look.coat, -22)}" opacity="0.6"/>
    <path d="M216 300 q-4 -70 -58 -90 l-8 14 q38 22 44 76z" fill="${shade(look.coat, -22)}" opacity="0.6"/>
    ${
      withCollar
        ? `<path d="M96 206 q24 22 24 22 q0 0 24 -22 l10 76 h-68z" fill="${shade(look.coatAlt, 14)}"/>
           <path d="M96 206 q24 22 24 22 l-10 22 l-22 -34z" fill="${shade(look.coat, 12)}"/>
           <path d="M144 206 q-24 22 -24 22 l10 22 l22 -34z" fill="${shade(look.coat, 12)}"/>
           <path d="M118 262 h4 v44 h-4z" fill="${shade(look.coat, -18)}" opacity="0.7"/>
           <circle cx="120" cy="286" r="2.4" fill="${look.accent ?? PAPER}" opacity="0.75"/>`
        : ""
    }
    <!-- neck -->
    <path d="M106 182 h28 v30 q-14 11 -28 0z" fill="${skinShadow}"/>
    <path d="M106 182 h28 v16 q-14 9 -28 0z" fill="${skinSoft}"/>
    <!-- ears -->
    <ellipse cx="66" cy="156" rx="8" ry="13" fill="${look.skin}" stroke="${skinShadow}" stroke-width="1"/>
    <ellipse cx="174" cy="156" rx="8" ry="13" fill="${look.skin}" stroke="${skinShadow}" stroke-width="1"/>
    <!-- face -->
    <path d="M68 104 q52 -16 104 0 q4 50 -6 76 q-12 30 -46 30 q-34 0 -46 -30 q-10 -26 -6 -76z" fill="${look.skin}"/>
    <ellipse cx="88" cy="176" rx="26" ry="14" fill="${skinShadow}" opacity="0.1"/>
    <ellipse cx="152" cy="176" rx="26" ry="14" fill="${skinShadow}" opacity="0.1"/>
    ${brows(stage, look.hair)}
    ${eyes(stage)}
    <path d="M120 164 q5 12 -2 17" fill="none" stroke="${skinShadow}" stroke-width="2.2" stroke-linecap="round" opacity="0.85"/>
    ${mouth(stage, look.skin)}
    ${hairFront(look)}
    ${accessory(look)}
  `;
}

function svgShell(content: string, accent: string, arch: boolean): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" width="240" height="300">
    <defs>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer><feFuncA type="linear" slope="0.16"/></feComponentTransfer>
      </filter>
      <clipPath id="frame"><rect x="0" y="0" width="240" height="300" rx="6"/></clipPath>
    </defs>
    <g clip-path="url(#frame)">
      <rect width="240" height="300" fill="${PAPER}"/>
      ${arch ? `<path d="M34 300 L34 112 q0 -70 86 -70 q86 0 86 70 L206 300z" fill="${accent}" opacity="0.16"/>` : ""}
      <path d="M0 0 h240 v300 h-240z" fill="none" stroke="${INK}" stroke-opacity="0.2" stroke-width="2"/>
      ${content}
      <rect width="240" height="300" filter="url(#grain)" opacity="0.5"/>
      <path d="M8 8 h224 v284 h-224z" fill="none" stroke="${INK}" stroke-opacity="0.35" stroke-width="1.5"/>
    </g>
  </svg>`;
}

function catSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" width="240" height="300">
    <defs>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.16"/></feComponentTransfer></filter>
      <clipPath id="frame"><rect width="240" height="300" rx="6"/></clipPath>
    </defs>
    <g clip-path="url(#frame)">
      <rect width="240" height="300" fill="${PAPER}"/>
      <path d="M34 300 L34 112 q0 -70 86 -70 q86 0 86 70 L206 300z" fill="#8d8a84" opacity="0.14"/>

      <!-- chest -->
      <path d="M62 300 q-4 -64 22 -86 q36 16 72 0 q26 22 22 86z" fill="#8d8a84"/>
      <path d="M86 300 q-2 -44 10 -60 q24 12 48 0 q12 16 10 60z" fill="#cbbfae" opacity="0.5"/>
      <path d="M74 300 q0 -34 8 -50" fill="none" stroke="#6f6c66" stroke-width="3" opacity="0.45"/>
      <path d="M166 300 q0 -34 -8 -50" fill="none" stroke="#6f6c66" stroke-width="3" opacity="0.45"/>

      <!-- tail on the right, curling up -->
      <path d="M176 286 q42 2 40 -34 q-2 -26 -22 -26 q-16 0 -18 16 q-1 12 10 14" fill="none" stroke="#6f6c66" stroke-width="14" stroke-linecap="round"/>

      <!-- ears behind head -->
      <path d="M82 156 l-14 -52 l44 22z" fill="#8d8a84"/>
      <path d="M158 156 l14 -52 l-44 22z" fill="#8d8a84"/>
      <path d="M84 148 l-8 -32 l26 14z" fill="#c9a9a2" opacity="0.8"/>
      <path d="M156 148 l8 -32 l-26 14z" fill="#c9a9a2" opacity="0.8"/>

      <!-- head -->
      <ellipse cx="120" cy="172" rx="52" ry="46" fill="#8d8a84"/>
      <path d="M98 212 q22 10 44 0 q-8 14 -22 14 q-14 0 -22 -14z" fill="#7c7973" opacity="0.55"/>

      <!-- stripes -->
      <path d="M96 142 q10 -8 22 -9 M144 142 q-10 -8 -22 -9 M120 138 v8" fill="none" stroke="#6f6c66" stroke-width="3" stroke-linecap="round" opacity="0.3"/>

      <!-- eyes -->
      <ellipse cx="101" cy="168" rx="11.5" ry="9.5" fill="#3f3b36"/>
      <ellipse cx="139" cy="168" rx="11.5" ry="9.5" fill="#3f3b36"/>
      <circle cx="104" cy="164" r="3.4" fill="#eee8da"/>
      <circle cx="142" cy="164" r="3.4" fill="#eee8da"/>

      <!-- nose and mouth -->
      <path d="M120 184 l-5 6 h10z" fill="#b98f86"/>
      <path d="M120 190 q-7 8 -14 3 M120 190 q7 8 14 3" fill="none" stroke="#565049" stroke-width="1.8" stroke-linecap="round"/>

      <!-- whiskers -->
      <path d="M98 186 l-30 -6 M98 191 l-28 8 M142 186 l30 -6 M142 191 l28 8" stroke="#e4dccb" stroke-width="1.5" stroke-linecap="round" opacity="0.85"/>

      <rect width="240" height="300" filter="url(#grain)" opacity="0.5"/>
      <path d="M8 8 h224 v284 h-224z" fill="none" stroke="${INK}" stroke-opacity="0.35" stroke-width="1.5"/>
    </g>
  </svg>`;
}

// Photoreal portraits — mix workflow: where a photo exists we use it, otherwise fall back to SVG.
// This gives the “real” feel the player asked for without losing the hand-drawn fallback.
const PHOTO_PORTRAITS: Record<string, string> = {
  anna: "/portrait-anna.jpg",
  lidia: "/portrait-lidia.jpg",
};

export function hasPhotoPortrait(npcId: string): boolean {
  return npcId in PHOTO_PORTRAITS;
}

export function photoPortraitUrl(npcId: string): string | null {
  return PHOTO_PORTRAITS[npcId] ?? null;
}

const cache = new Map<string, string>();

export function portraitSvg(npcId: string, stage: PortraitStage = "neutral"): string {
  const key = `${npcId}:${stage}`;
  const cached = cache.get(key);
  if (cached) return cached;
  let svg: string;
  if (npcId === "musya") {
    svg = catSvg();
  } else if (npcId === "player" || !NPC_BY_ID[npcId]) {
    svg = svgShell(bust(PLAYER_LOOK, stage), "#7c8b67", true);
  } else {
    const npc = NPC_BY_ID[npcId];
    svg = svgShell(bust(npc.look, stage), npc.look.coat, true);
  }
  cache.set(key, svg);
  return svg;
}

export function portraitUrl(npcId: string, stage: PortraitStage = "neutral"): string {
  const photo = PHOTO_PORTRAITS[npcId];
  if (photo) return photo;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(portraitSvg(npcId, stage))}`;
}
