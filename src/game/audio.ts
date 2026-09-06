// Tiny WebAudio synth kit — no external assets.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let ambientOn = false;
let ambientNodes: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let engineNodes: { osc: OscillatorNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
let loungeTimer: number | null = null;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.6;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function noiseBuffer(c: AudioContext, seconds = 1) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function blip(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
  const c = ac();
  if (!c || !master) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), c.currentTime + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g);
  g.connect(master);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

function noiseHit(dur: number, vol: number, freq: number, q = 1) {
  const c = ac();
  if (!c || !master) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, Math.max(0.05, dur));
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start();
  src.stop(c.currentTime + dur + 0.02);
}

export const sfx = {
  resume() { ac(); },
  setMuted(m: boolean) {
    muted = m;
    if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.6, ctx.currentTime, 0.05);
  },
  isMuted() { return muted; },
  click() { blip(660, 0.05, 'square', 0.05, 880); },
  back() { blip(320, 0.07, 'square', 0.05, 220); },
  step(run = false) { noiseHit(run ? 0.07 : 0.1, run ? 0.12 : 0.07, run ? 420 : 260, 1.2); },
  shutter() {
    noiseHit(0.035, 0.35, 2400, 0.8);
    window.setTimeout(() => noiseHit(0.05, 0.22, 900, 0.9), 55);
  },
  buzz() {
    const c = ac();
    if (!c) return;
    blip(180, 0.09, 'square', 0.08, 120);
    window.setTimeout(() => blip(180, 0.09, 'square', 0.08, 120), 140);
  },
  cash() { blip(880, 0.08, 'triangle', 0.12, 1320); window.setTimeout(() => blip(1320, 0.12, 'triangle', 0.1, 1760), 90); },
  error() { blip(200, 0.18, 'sawtooth', 0.09, 110); },
  flash() { noiseHit(0.09, 0.3, 5200, 0.4); },
  door() { noiseHit(0.2, 0.14, 180, 1.4); },
  train() {
    const c = ac();
    if (!c || !master) return;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 5);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 220;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.linearRampToValueAtTime(0.28, c.currentTime + 1.4);
    g.gain.linearRampToValueAtTime(0.28, c.currentTime + 3);
    g.gain.linearRampToValueAtTime(0.0001, c.currentTime + 5);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(); src.stop(c.currentTime + 5.1);
  },
  ambient(on: boolean) {
    const c = ac();
    if (!c || !master) return;
    if (on && !ambientOn) {
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(c, 4);
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 380;
      const g = c.createGain();
      g.gain.value = 0.045;
      src.connect(f); f.connect(g); g.connect(master);
      src.start();
      ambientNodes = { src, gain: g };
      ambientOn = true;
    } else if (!on && ambientOn && ambientNodes) {
      try { ambientNodes.src.stop(); } catch { /* already stopped */ }
      ambientNodes = null;
      ambientOn = false;
    }
  },
  engine(on: boolean, speed = 0) {
    const c = ac();
    if (!c || !master) return;
    if (on) {
      if (!engineNodes) {
        const osc = c.createOscillator();
        osc.type = 'sawtooth';
        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        const gain = c.createGain();
        gain.gain.value = 0.05;
        osc.connect(filter); filter.connect(gain); gain.connect(master);
        osc.start();
        engineNodes = { osc, gain, filter };
      }
      engineNodes.osc.frequency.setTargetAtTime(55 + speed * 5.5, c.currentTime, 0.1);
      engineNodes.gain.gain.setTargetAtTime(0.035 + Math.min(0.05, speed * 0.004), c.currentTime, 0.2);
    } else if (engineNodes) {
      try { engineNodes.osc.stop(); } catch { /* already stopped */ }
      engineNodes = null;
    }
  },
  lounge(on: boolean) {
    if (on && loungeTimer === null) {
      const notes = [174.6, 220, 261.6, 329.6, 261.6, 220];
      let i = 0;
      loungeTimer = window.setInterval(() => {
        blip(notes[i % notes.length], 0.5, 'sine', 0.05);
        if (i % 3 === 0) blip(notes[i % notes.length] / 2, 0.7, 'triangle', 0.04);
        i++;
      }, 620);
    } else if (!on && loungeTimer !== null) {
      window.clearInterval(loungeTimer);
      loungeTimer = null;
    }
  },
  rain(on: boolean) {
    // reuse ambient bed intensity for rain
    if (ambientNodes && ctx) ambientNodes.gain.gain.setTargetAtTime(on ? 0.11 : 0.045, ctx.currentTime, 0.4);
  },
};
