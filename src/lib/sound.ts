/** Sonidos simples con WebAudio (sin archivos). */
let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(v: boolean): void {
  muted = v;
}

function ac(): AudioContext | null {
  if (muted || typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.18): void {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  correct(): void {
    tone(660, 0, 0.15, 'triangle');
    tone(990, 0.12, 0.25, 'triangle');
  },
  wrong(): void {
    tone(180, 0, 0.45, 'sawtooth', 0.12);
    tone(140, 0.05, 0.45, 'square', 0.06);
  },
  pass(): void {
    tone(520, 0, 0.12, 'sine');
    tone(390, 0.1, 0.18, 'sine');
  },
  tick(): void {
    tone(1200, 0, 0.05, 'square', 0.05);
  },
  start(): void {
    [440, 554, 659].forEach((f, i) => tone(f, i * 0.09, 0.2, 'triangle', 0.12));
  },
  fanfare(): void {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.35, 'triangle', 0.14));
  },
};
