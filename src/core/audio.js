// Lightweight procedural sound effects via WebAudio — no audio files needed.
export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
  }

  ensure() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    this.volume = 0.35;
    this.muted = false;
    this.musicNodes = null;
  }

  // Slow, dark ambient drone built from detuned low oscillators under a
  // wandering low-pass — atmosphere without any audio files.
  startMusic() {
    this.ensure();
    if (this.musicNodes) return;
    const ctx = this.ctx;
    const bus = ctx.createGain();
    bus.gain.value = 0.18;
    bus.connect(this.master);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    filter.Q.value = 6;
    filter.connect(bus);
    const oscs = [];
    for (const f of [55, 82.5, 110, 164.8]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 14;
      const g = ctx.createGain();
      g.gain.value = 0.22;
      o.connect(g).connect(filter);
      o.start();
      oscs.push(o);
    }
    // wandering filter LFO
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    this.musicNodes = { bus, oscs, lfo };
  }

  stopMusic() {
    if (!this.musicNodes) return;
    try {
      this.musicNodes.oscs.forEach((o) => o.stop());
      this.musicNodes.lfo.stop();
      this.musicNodes.bus.disconnect();
    } catch { /* ignore */ }
    this.musicNodes = null;
  }

  applyGain() {
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  noise(duration, { freq = 1200, type = 'bandpass', gain = 0.5, decay = 12 } = {}) {
    this.ensure();
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp((-i / data.length) * decay);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(this.master);
    src.start();
  }

  tone(freq, duration, { type = 'sine', gain = 0.3, slide = 0 } = {}) {
    this.ensure();
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ctx.currentTime + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g).connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  swing() { this.noise(0.12, { freq: 900, gain: 0.35, decay: 8 }); }
  hit() {
    this.noise(0.1, { freq: 350, type: 'lowpass', gain: 0.7, decay: 10 });
    this.tone(140, 0.1, { type: 'square', gain: 0.12, slide: -80 });
  }
  hurt() { this.tone(180, 0.18, { type: 'sawtooth', gain: 0.2, slide: -120 }); }
  roll() { this.noise(0.18, { freq: 500, type: 'lowpass', gain: 0.25, decay: 6 }); }
  kill() { this.noise(0.25, { freq: 200, type: 'lowpass', gain: 0.6, decay: 7 }); }
  orb() { this.tone(880, 0.08, { gain: 0.1, slide: 300 }); }
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.25, { gain: 0.2 }), i * 90),
    );
  }
  gate() { this.tone(90, 0.5, { type: 'square', gain: 0.18, slide: -30 }); }
  potion() { this.tone(440, 0.2, { gain: 0.15, slide: 220 }); }
  whirl() { this.noise(0.4, { freq: 700, gain: 0.4, decay: 5 }); }
  pickup() { this.tone(700, 0.09, { gain: 0.12, slide: 350 }); }
  coin() { this.tone(1100, 0.07, { gain: 0.1, slide: 250 }); }
  bossRoar() {
    this.noise(0.7, { freq: 200, type: 'lowpass', gain: 0.7, decay: 3 });
    this.tone(70, 0.7, { type: 'sawtooth', gain: 0.25, slide: -20 });
  }
  bossHit() { this.noise(0.2, { freq: 260, type: 'lowpass', gain: 0.8, decay: 6 }); this.tone(110, 0.2, { type: 'square', gain: 0.18, slide: -60 }); }
  telegraph() { this.tone(300, 0.25, { type: 'triangle', gain: 0.08, slide: 120 }); }
  setVolume(v) { this.ensure(); this.volume = v; this.applyGain(); }
  setMuted(m) { this.ensure(); this.muted = m; this.applyGain(); }
}
