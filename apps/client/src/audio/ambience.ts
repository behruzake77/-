/**
 * Tiny procedural soundscape: filtered noise beds per place, soft clicks for UI.
 * Everything is generated in the browser; no audio files, no external assets.
 */

type Bed = "courtyard" | "street" | "shop" | "cafe" | "metro" | "home" | "dombyta";

interface Layer {
  gain: GainNode;
  nodes: AudioScheduledSourceNode[];
}

let context: AudioContext | null = null;
let master: GainNode | null = null;
let layer: Layer | null = null;
let currentBed: Bed | null = null;
let noiseBuffer: AudioBuffer | null = null;
let enabled = true;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (context) return context;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  master = context.createGain();
  master.gain.value = enabled ? 0.16 : 0;
  master.connect(context.destination);
  noiseBuffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
  const channel = noiseBuffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < channel.length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    channel[i] = last * 3.2;
  }
  return context;
}

export function unlockAudio(): void {
  const c = ctx();
  if (c?.state === "suspended") void c.resume();
}

export function setAudioEnabled(on: boolean): void {
  enabled = on;
  if (master && context) {
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.linearRampToValueAtTime(on ? 0.16 : 0, context.currentTime + 0.4);
  }
}

export function setAmbience(bed: Bed): void {
  if (currentBed === bed && layer) return;
  const c = ctx();
  if (!c || !master || !noiseBuffer) return;
  currentBed = bed;
  if (layer) {
    const old = layer;
    old.gain.gain.cancelScheduledValues(c.currentTime);
    old.gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.6);
    setTimeout(() => {
      old.nodes.forEach((node) => {
        try {
          node.stop();
        } catch {
          /* already stopped */
        }
      });
    }, 800);
  }

  const config: Record<Bed, { filter: number; gain: number; hum?: number; q?: number }> = {
    courtyard: { filter: 520, gain: 0.5 },
    street: { filter: 340, gain: 0.7, hum: 58 },
    shop: { filter: 900, gain: 0.2, hum: 100 },
    cafe: { filter: 620, gain: 0.32, hum: 74 },
    metro: { filter: 260, gain: 0.55, hum: 46 },
    home: { filter: 700, gain: 0.1 },
    dombyta: { filter: 760, gain: 0.18, hum: 96 },
  };
  const cfg = config[bed];
  const layerGain = c.createGain();
  layerGain.gain.value = 0;
  layerGain.connect(master);
  layerGain.gain.linearRampToValueAtTime(cfg.gain, c.currentTime + 1.2);

  const noise = c.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cfg.filter;
  filter.Q.value = cfg.q ?? 0.6;
  noise.connect(filter).connect(layerGain);

  const nodes: AudioScheduledSourceNode[] = [noise];
  noise.start();

  if (cfg.hum) {
    const hum = c.createOscillator();
    hum.type = "sine";
    hum.frequency.value = cfg.hum;
    const humGain = c.createGain();
    humGain.gain.value = 0.05;
    hum.connect(humGain).connect(layerGain);
    hum.start();
    nodes.push(hum);
  }

  layer = { gain: layerGain, nodes };
}

export type Sfx = "tap" | "open" | "close" | "good" | "soft" | "step";

export function sfx(kind: Sfx): void {
  const c = ctx();
  if (!c || !master || !enabled) return;
  const now = c.currentTime;
  const map: Record<
    Sfx,
    { freq: number; type: OscillatorType; dur: number; gain: number; slide?: number }
  > = {
    tap: { freq: 420, type: "triangle", dur: 0.07, gain: 0.14 },
    open: { freq: 330, type: "sine", dur: 0.18, gain: 0.16, slide: 1.25 },
    close: { freq: 300, type: "sine", dur: 0.16, gain: 0.12, slide: 0.85 },
    good: { freq: 520, type: "sine", dur: 0.24, gain: 0.16, slide: 1.5 },
    soft: { freq: 220, type: "sine", dur: 0.2, gain: 0.1 },
    step: { freq: 120, type: "triangle", dur: 0.05, gain: 0.05 },
  };
  const cfg = map[kind];
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = cfg.type;
  osc.frequency.setValueAtTime(cfg.freq, now);
  if (cfg.slide) osc.frequency.exponentialRampToValueAtTime(cfg.freq * cfg.slide, now + cfg.dur);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(cfg.gain, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + cfg.dur);
  osc.connect(gain).connect(master);
  osc.start(now);
  osc.stop(now + cfg.dur + 0.02);
}

export type AmbienceBed = Bed;
