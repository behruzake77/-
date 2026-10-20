/**
 * Russian speech via the browser's built-in synthesiser.
 * No network, no keys, and it degrades to text-only when no ru voice exists.
 */

let voices: SpeechSynthesisVoice[] = [];
let listenerAttached = false;

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (!listenerAttached) {
    listenerAttached = true;
    window.speechSynthesis.addEventListener?.("voiceschanged", () => {
      voices = window.speechSynthesis.getVoices();
    });
  }
  voices = window.speechSynthesis.getVoices();
  return window.speechSynthesis;
}

export function speechAvailable(): boolean {
  const s = synth();
  if (!s) return false;
  return Boolean(pickVoice());
}

export function pickVoice(): SpeechSynthesisVoice | undefined {
  const list = voices.length ? voices : (synth()?.getVoices() ?? []);
  const ru = list.filter((voice) => voice.lang?.toLowerCase().startsWith("ru"));
  if (!ru.length) return undefined;
  return (
    ru.find((voice) => /milena|irina|alena|katya|google/i.test(voice.name)) ??
    ru.find((voice) => voice.localService) ??
    ru[0]
  );
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export function speak(text: string, options: SpeakOptions = {}): boolean {
  const s = synth();
  if (!s) return false;
  const voice = pickVoice();
  if (!voice) return false;
  const clean = text.replace(/\s+/g, " ").replace(/[«»"]/g, "").trim();
  if (!clean) return false;
  s.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.voice = voice;
  utterance.lang = voice.lang || "ru-RU";
  utterance.rate = Math.min(1.5, Math.max(0.5, options.rate ?? 0.9));
  utterance.pitch = Math.min(1.6, Math.max(0.6, options.pitch ?? 1));
  utterance.volume = 1;
  if (options.onStart) utterance.onstart = () => options.onStart?.();
  if (options.onEnd) utterance.onend = () => options.onEnd?.();
  utterance.onerror = () => options.onEnd?.();
  s.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  synth()?.cancel();
}
